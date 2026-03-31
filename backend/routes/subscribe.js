const express = require('express');
const auth = require('../middleware/auth');
const { saveSubscription } = require('../models/subscription');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription, city } = req.body;
    if (!subscription || !city) {
      return res.status(400).json({ error: 'Необходимы subscription и city' });
    }
    await saveSubscription(userId, subscription, city);
    res.json({ message: 'Подписка сохранена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;