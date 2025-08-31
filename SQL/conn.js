const mysql2 = require('mysql2/promise');

const database = "librarydatabase";
const pool = mysql2.createPool({
  host: '172.26.13.248',
  user: 'Capstone',
  password: '12345',
  database: database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to " + database);
    conn.release();
  } catch (err) {
    console.error("Database connection failed:", err.message);
  }
})();

module.exports = pool;
