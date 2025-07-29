const pool = require('./conn');

async function loginVerify({ name, password }) {
  try {
    const [rows] = await pool.query(
      'SELECT role FROM users WHERE name = ? AND password = ?',
      [name, password]
    );

    if (rows.length > 0) {
      return { success: true, role: rows[0].role };
    } else {
      return { success: false };
    }

  } catch (err) {
    console.error('Error in loginVerify:', err);
    throw err;
  }
}

async function NFCloginVerify({ hash }) {
  try {
    const [rows] = await pool.query(
      'SELECT role FROM users WHERE hash = ?',
      [hash]
    );

    if (rows.length > 0) {
      return { success: true, role: rows[0].role };
    } else {
      return { success: false };
    }

  } catch (err) {
    console.error('Error in loginVerify:', err);
    throw err;
  }
}

module.exports = { 
  loginVerify,
  NFCloginVerify
};
