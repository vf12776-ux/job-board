const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { db, initDb } = require('./config/database');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация БД
initDb().then(() => {
  console.log('База данных готова');
}).catch(err => {
  console.error('Ошибка инициализации БД:', err);
  process.exit(1);
});

// Middleware аутентификации
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    db.get('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err || !user) return res.status(401).json({ error: 'Пользователь не найден' });
      req.user = user;
      next();
    });
  } catch (err) {
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Middleware проверки роли admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  next();
};

// --- Auth endpoints (если они уже есть в вашем проекте, оставьте как есть) ---
// Примеры:
app.post('/api/register', async (req, res) => {
  const { name, email, password, city } = req.body;
  if (!name || !email || !password || !city) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (name, email, password, city, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, city, 'candidate'],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            res.status(400).json({ error: 'Email уже существует' });
          } else {
            res.status(500).json({ error: err.message });
          }
        } else {
          res.json({ success: true });
        }
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, city: user.city } });
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// --- Orders endpoints ---
app.get('/api/orders', (req, res) => {
  db.all(`
    SELECT o.*, u.name as advertiser_name
    FROM orders o
    LEFT JOIN users u ON o.advertiser_id = u.id
    ORDER BY o.created_at DESC
  `, [], (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(orders);
  });
});

app.post('/api/orders', requireAuth, (req, res) => {
  const { title, description, city, budget } = req.body;
  if (!title || !description || !city) {
    return res.status(400).json({ error: 'Заголовок, описание и город обязательны' });
  }
  db.run(
    'INSERT INTO orders (title, description, city, budget, advertiser_id) VALUES (?, ?, ?, ?, ?)',
    [title, description, city, budget, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM orders WHERE id = ?', [this.lastID], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        io.emit('new_order', order);
        res.json(order);
      });
    }
  );
});

app.put('/api/orders/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status, candidate_id } = req.body;
  db.get('SELECT * FROM orders WHERE id = ?', [id], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Заявка не найдена' });
    // Разрешить менять статус только автору или администратору
    if (order.advertiser_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав' });
    }
    const updates = [];
    const params = [];
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (candidate_id !== undefined) {
      updates.push('candidate_id = ?');
      params.push(candidate_id);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });
    params.push(id);
    db.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM orders WHERE id = ?', [id], (err, updatedOrder) => {
        if (err) return res.status(500).json({ error: err.message });
        io.emit('order_updated', updatedOrder);
        res.json(updatedOrder);
      });
    });
  });
});

// --- Admin endpoints ---
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  db.all('SELECT id, name, email, role FROM users', [], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

app.put('/api/admin/users/role', requireAuth, requireAdmin, (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'userId и role обязательны' });
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});
// Смена пароля
app.put('/api/user/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Старый и новый пароли обязательны' });
  }
  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, row) => {
    if (err || !row) return res.status(500).json({ error: 'Ошибка базы данных' });
    const match = await bcrypt.compare(oldPassword, row.password);
    if (!match) return res.status(401).json({ error: 'Неверный старый пароль' });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: 'Ошибка обновления пароля' });
      res.json({ success: true });
    });
  });
});

// --- Fallback для SPA (исправлено для Express 5) ---
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- WebSocket ---
io.on('connection', (socket) => {
  console.log('Клиент подключился');
});

// --- Запуск сервера ---
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});