const mysql2 = require('mysql2/promise');

const pool = mysql2.createPool({
  host: '172.26.13.248',
  user: 'Capstone',
  password: '12345',
  database: 'logintest',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
