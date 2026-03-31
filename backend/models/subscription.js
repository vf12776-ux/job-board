const { initDb } = require('../config/database');

async function saveSubscription(userId, subscription, city) {
  const db = await initDb();
  const { endpoint, keys } = subscription;
  const { p256dh, auth } = keys;
  await db.run(
    `INSERT INTO subscriptions (user_id, endpoint, p256dh, auth, city)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       city = excluded.city,
       user_id = excluded.user_id`,
    [userId, endpoint, p256dh, auth, city]
  );
}

async function getSubscriptionsByCity(city) {
  const db = await initDb();
  return db.all(`SELECT * FROM subscriptions WHERE city = ?`, [city]);
}

async function deleteSubscription(endpoint) {
  const db = await initDb();
  await db.run(`DELETE FROM subscriptions WHERE endpoint = ?`, [endpoint]);
}

module.exports = { saveSubscription, getSubscriptionsByCity, deleteSubscription };