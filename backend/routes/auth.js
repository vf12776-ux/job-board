const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, city } = req.body;

    if (!email || !password || !role || !city) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    const newUser = await User.create({ email, password, role, city });
    const token = jwt.sign({ id: newUser.id, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser.id, email, role, city } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, city: user.city } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить текущего пользователя
router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;