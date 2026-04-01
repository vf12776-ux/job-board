const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initDb } = require('./config/database');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Проверка JWT_SECRET
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set');
  process.exit(1);
}

// Инициализация БД
initDb().catch(console.error);

// Маршруты API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/subscribe', require('./routes/subscribe'));
app.use('/api/admin', require('./routes/admin'));

// Раздача статики и SPA (исправленный блок)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  // Любой запрос, не обработанный API, отдаёт index.html (без path-to-regexp ошибок)
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Socket.io
io.on('connection', (socket) => {
  console.log('Клиент подключился:', socket.id);
  socket.on('disconnect', () => {
    console.log('Клиент отключился:', socket.id);
  });
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});