const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, '../data.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Таблица пользователей
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          city TEXT NOT NULL,
          role TEXT DEFAULT 'candidate',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) reject(err); });

      // Таблица заявок
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          city TEXT NOT NULL,
          status TEXT DEFAULT 'open',
          advertiser_id INTEGER NOT NULL,
          candidate_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(advertiser_id) REFERENCES users(id),
          FOREIGN KEY(candidate_id) REFERENCES users(id)
        )
      `, (err) => { if (err) reject(err); });

      // Таблица подписок на push-уведомления
      db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          city TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id),
          UNIQUE(user_id, endpoint)
        )
      `, (err) => { if (err) reject(err); });

      // После создания таблиц проверяем и создаём администратора
      setTimeout(() => {
        db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', (err, row) => {
          if (err) {
            console.error('Ошибка проверки администратора:', err);
            return;
          }
          if (row.count === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run(
              'INSERT INTO users (name, email, password, city, role) VALUES (?, ?, ?, ?, ?)',
              ['Admin', 'admin@example.com', hashedPassword, 'System', 'admin'],
              (err) => {
                if (err) console.error('Ошибка создания администратора:', err);
                else console.log('✅ Администратор создан: admin@example.com / admin123');
              }
            );
          }
        });
      }, 500);

      resolve();
    });
  });
};

module.exports = { db, initDb };