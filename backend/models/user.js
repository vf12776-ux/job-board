const { initDb } = require('../config/database');
const bcrypt = require('bcrypt');

async function findByEmail(email) {
  const db = await initDb();
  return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

async function create({ email, password, role, city }) {
  const db = await initDb();
  const hashed = await bcrypt.hash(password, 10);
  const result = await db.run(
    'INSERT INTO users (email, password, role, city) VALUES (?, ?, ?, ?)',
    [email, hashed, role, city || null]
  );
  const id = result.lastID;
  return { id, email, role, city };
}

module.exports = { findByEmail, create };