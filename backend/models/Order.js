const { db } = require('../config/database');

class Order {
  static async create({ title, description, city, date_time, advertiser_id }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO orders (title, description, city, date_time, advertiser_id, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [title, description, city, date_time, advertiser_id],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  static async getAll() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT o.*, u.name as advertiser_name, u.city as advertiser_city
        FROM orders o
        LEFT JOIN users u ON o.advertiser_id = u.id
        ORDER BY o.created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async getById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static async takeOrder(orderId, userId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get(`SELECT status FROM orders WHERE id = ?`, [orderId], (err, row) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          if (!row || row.status !== 'active') {
            db.run('ROLLBACK');
            reject(new Error('Заявка уже занята или не существует'));
            return;
          }
          db.run(
            `UPDATE orders SET status = 'taken', taken_by = ?, taken_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [userId, orderId],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              db.run('COMMIT');
              resolve(this.changes);
            }
          );
        });
      });
    });
  }
}

module.exports = Order;