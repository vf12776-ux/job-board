const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { db, initDb } = require('./config/database'); // подключаем вашу БД

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
    // Получаем пользователя из вашей БД
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

// --- Auth endpoints (используем ваши существующие) ---
// Если у вас уже есть /api/register и /api/login, оставьте их как есть.
// Если нет — добавьте.

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

// --- Fallback для SPA ---
app.get('*', (req, res) => {
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