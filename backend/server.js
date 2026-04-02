const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// Подготовка БД
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userEmail TEXT,
    phone TEXT,
    problem TEXT,
    status TEXT DEFAULT 'новая',
    createdAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requestId INTEGER,
    text TEXT,
    fromAdmin INTEGER DEFAULT 0,
    createdAt TEXT
  )`);

  // Создание администратора
  const adminEmail = 'admin@example.com';
  const adminPass = 'admin123';
  bcrypt.hash(adminPass, 10, (err, hash) => {
    if (!err) {
      db.run(`INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, 'admin')`, [adminEmail, hash]);
    }
  });
});

// ===================== АУТЕНТИФИКАЦИЯ =====================
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Неверные данные' });
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) return res.status(400).json({ error: 'Неверные данные' });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ token, user: { email: user.email, role: user.role } });
    });
  });
});

app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [email, hash], function(err) {
      if (err) return res.status(400).json({ error: 'Email уже существует' });
      const token = jwt.sign({ id: this.lastID, email, role: 'user' }, JWT_SECRET);
      res.json({ token, user: { email, role: 'user' } });
    });
  });
});

app.get('/api/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Неверный токен' });
    res.json({ user: { email: decoded.email, role: decoded.role } });
  });
});

// ===================== ЗАЯВКИ =====================
app.get('/api/requests', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Неверный токен' });
    let sql = `SELECT * FROM requests`;
    const params = [];
    if (decoded.role !== 'admin') {
      sql += ` WHERE userEmail = ?`;
      params.push(decoded.email);
    }
    sql += ` ORDER BY id DESC`;
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });
});

app.post('/api/requests', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Неверный токен' });
    const { phone, problem } = req.body;
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT INTO requests (userEmail, phone, problem, createdAt) VALUES (?, ?, ?, ?)`,
      [decoded.email, phone, problem, createdAt],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      }
    );
  });
});

app.put('/api/requests/:id/status', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || decoded.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
    const { status } = req.body;
    db.run(`UPDATE requests SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: true });
    });
  });
});

// ===================== СООБЩЕНИЯ =====================
app.get('/api/messages/:requestId', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Неверный токен' });
    db.all(`SELECT * FROM messages WHERE requestId = ? ORDER BY id ASC`, [req.params.requestId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });
});

app.post('/api/messages', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Неверный токен' });
    const { requestId, text } = req.body;
    const fromAdmin = decoded.role === 'admin' ? 1 : 0;
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT INTO messages (requestId, text, fromAdmin, createdAt) VALUES (?, ?, ?, ?)`,
      [requestId, text, fromAdmin, createdAt],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      }
    );
  });
});

// ===================== HEALTH CHECK =====================
app.get('/health', (req, res) => res.send('OK'));

// ===================== СТАТИКА (FRONTEND) =====================
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===================== ЗАПУСК =====================
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`📦 Администратор: admin@example.com / admin123`);
});