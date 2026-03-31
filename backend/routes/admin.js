const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const admin = require('../middleware/isAdmin');

// Все маршруты требуют авторизации и прав админа
router.use(auth, admin);

// Получить всех пользователей (без паролей)
router.get('/users', (req, res) => {
  db.all('SELECT id, name, email, city, role, created_at FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Обновить роль пользователя (например, сделать админом)
router.patch('/users/:id', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['advertiser', 'candidate', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Недопустимая роль' });
  }
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ message: 'Роль обновлена' });
  });
});

// Удалить пользователя
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ message: 'Пользователь удалён' });
  });
});

// Получить все заявки (включая закрытые)
router.get('/orders', (req, res) => {
  db.all(`
    SELECT o.*, u.name as advertiser_name 
    FROM orders o 
    LEFT JOIN users u ON o.advertiser_id = u.id 
    ORDER BY o.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Удалить заявку
router.delete('/orders/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM orders WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Заявка не найдена' });
    res.json({ message: 'Заявка удалена' });
  });
});

// Статистика
router.get('/stats', (req, res) => {
  const queries = {
    totalUsers: 'SELECT COUNT(*) as count FROM users',
    advertisers: 'SELECT COUNT(*) as count FROM users WHERE role = "advertiser"',
    candidates: 'SELECT COUNT(*) as count FROM users WHERE role = "candidate"',
    admins: 'SELECT COUNT(*) as count FROM users WHERE role = "admin"',
    totalOrders: 'SELECT COUNT(*) as count FROM orders',
    openOrders: 'SELECT COUNT(*) as count FROM orders WHERE status = "open"',
    closedOrders: 'SELECT COUNT(*) as count FROM orders WHERE status = "taken"'
  };

  const stats = {};
  const keys = Object.keys(queries);
  let completed = 0;

  keys.forEach(key => {
    db.get(queries[key], [], (err, row) => {
      if (err) stats[key] = { error: err.message };
      else stats[key] = row.count;
      completed++;
      if (completed === keys.length) {
        res.json(stats);
      }
    });
  });
});

module.exports = router;