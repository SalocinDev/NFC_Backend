const pool = require('../conn');

async function writetoDB(hash, role, name, password) {
    try {
        const [result] = await pool.query(
            'INSERT INTO users (hash, role, name, password) VALUES (?, ?, ?, ?)',
            [hash, role, name, password]
        );
    
        if (result.affectedRows > 0) {
            return { success: true };
        } else {
            return { success: false, message: 'User not found' };
        }
    } catch (err) {
        console.error('Error in writetoDB:', err);
        throw err;
    }
  }

async function compareHash({ name, password, nfchash }) {
    try {
      const [rows] = await pool.query(
        'SELECT hash, role FROM users WHERE name = ? AND password = ?',
        [name, password]
      );
  
    if (rows.length > 0) {
        const dbHash = rows[0].hash;
        const role = rows[0].role;
  
        if (nfchash === dbHash) {
          return { success: true, role };
        } else {
          return { success: false, message: "Hash mismatch" };
        }
    } else {
        return { success: false, message: "User not found" };
    }
  
    } catch (err) {
        console.error('Error in readHashfromDB:', err);
        throw err;
    }
}
    
async function getHashfromDB(hash) {
    try {
        const [rows] = await pool.query(
            'SELECT userID FROM users WHERE hash = ?',
            [hash]
    );
        if (rows.length > 0) {
            return { hashReal: true, userID: rows[0].userID };
    }     else {
            return { hashReal: false };
    }
  
    } catch (err) {
        console.error('Error in getHashfromDB:', err);
        throw err;
    }
}

module.exports = {
    writetoDB,
    getHashfromDB
};