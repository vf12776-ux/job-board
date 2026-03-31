const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initDb } = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // в продакшене замените на реальный домен фронтенда
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Инициализация БД
initDb().catch(console.error);

// Маршруты API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/subscribe', require('./routes/subscribe'));
app.use('/api/admin', require('./routes/admin'));

// В продакшене отдаём собранный фронтенд
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Socket.io: обработка подключений
io.on('connection', (socket) => {
  console.log('Клиент подключился:', socket.id);
  // При отключении ничего особенного не делаем
  socket.on('disconnect', () => {
    console.log('Клиент отключился:', socket.id);
  });
});

// Сделаем io доступным в маршрутах (например, в routes/orders.js)
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});