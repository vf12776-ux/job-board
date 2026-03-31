const express = require('express');
const router = express.Router();
const db = require('../config/database').db;
const auth = require('../middleware/auth');
const webpush = require('web-push');

// Получение всех открытых заявок
router.get('/', auth, (req, res) => {
  db.all(
    'SELECT * FROM orders WHERE status = "open" ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Создание заявки (только для рекламодателя)
router.post('/', auth, async (req, res) => {
  const { title, description, city } = req.body;
  if (!title || !description || !city) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  // Проверка роли
  if (req.user.role !== 'advertiser') {
    return res.status(403).json({ message: 'Только рекламодатели могут создавать заявки' });
  }

  db.run(
    'INSERT INTO orders (title, description, city, advertiser_id) VALUES (?, ?, ?, ?)',
    [title, description, city, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const newOrder = {
        id: this.lastID,
        title,
        description,
        city,
        status: 'open',
        advertiser_id: req.user.id,
        created_at: new Date().toISOString()
      };

      // Отправка события через Socket.io
      const io = req.app.get('io');
      if (io) io.emit('new_order', newOrder);

      // Отправка push-уведомлений подписанным на этот город
      db.all(
        'SELECT s.*, u.name FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.city = ?',
        [city],
        (err, subscriptions) => {
          if (err) {
            console.error('Ошибка получения подписок:', err);
          } else if (subscriptions.length > 0) {
            const payload = JSON.stringify({
              title: 'Новая заявка!',
              body: `${title} (${city})`,
              url: '/'
            });
            subscriptions.forEach(sub => {
              const subscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth
                }
              };
              webpush.sendNotification(subscription, payload).catch(error => {
                console.error('Ошибка отправки уведомления:', error);
                // Если подписка недействительна, можно удалить её из БД
                if (error.statusCode === 410) {
                  db.run('DELETE FROM subscriptions WHERE endpoint = ?', [sub.endpoint]);
                }
              });
            });
          }
        }
      );

      res.status(201).json(newOrder);
    }
  );
});

// Отклик на заявку (только для соискателя)
router.post('/:id/respond', auth, (req, res) => {
  const orderId = req.params.id;

  // Проверка роли
  if (req.user.role !== 'candidate') {
    return res.status(403).json({ message: 'Только соискатели могут откликаться' });
  }

  // Получаем заявку
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ message: 'Заявка не найдена' });
    if (order.status !== 'open') return res.status(400).json({ message: 'Заявка уже закрыта' });
    if (order.advertiser_id === req.user.id) {
      return res.status(400).json({ message: 'Нельзя откликнуться на свою заявку' });
    }

    // Обновляем статус заявки
    db.run(
      'UPDATE orders SET status = "taken", candidate_id = ? WHERE id = ?',
      [req.user.id, orderId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(400).json({ message: 'Не удалось закрыть заявку' });

        // Отправляем событие через Socket.io
        const io = req.app.get('io');
        if (io) io.emit('order_taken', orderId);

        // Опционально: уведомить автора заявки, что на неё откликнулись
        db.get('SELECT endpoint, p256dh, auth FROM subscriptions WHERE user_id = ?', [order.advertiser_id], (err, sub) => {
          if (!err && sub) {
            const payload = JSON.stringify({
              title: 'На вашу заявку откликнулись!',
              body: `Пользователь ${req.user.name} откликнулся на "${order.title}"`,
              url: '/'
            });
            const subscription = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            };
            webpush.sendNotification(subscription, payload).catch(console.error);
          }
        });

        res.json({ message: 'Отклик успешен' });
      }
    );
  });
});

module.exports = router;