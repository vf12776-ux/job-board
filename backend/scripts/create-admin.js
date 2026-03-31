const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const readline = require('readline');

const dbPath = path.resolve(__dirname, '../data.db');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Email администратора: ', (email) => {
  rl.question('Пароль: ', (password) => {
    rl.question('Имя администратора: ', (name) => {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run(
        'INSERT INTO users (name, email, password, city, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, 'System', 'admin'],
        function(err) {
          if (err) {
            console.error('Ошибка:', err.message);
          } else {
            console.log(`\n✅ Администратор "${email}" успешно создан!`);
          }
          db.close();
          rl.close();
        }
      );
    });
  });
});