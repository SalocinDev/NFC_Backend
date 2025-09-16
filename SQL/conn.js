const mysql2 = require('mysql2/promise');

const database = "librarydatabase";
const pool = mysql2.createPool({
  host: '172.26.1.2',
  user: 'Capstone',
  password: 'P4g*Ex]vwW!D[zof',
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
