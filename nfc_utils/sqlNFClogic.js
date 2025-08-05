const pool = require('../SQL/conn');

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
    
async function getHashfromDB(hash) {
    try {
        const [rows] = await pool.query(
            'SELECT userID, name, role, password FROM users WHERE hash = ?',
            [hash]
    );
        if (rows.length > 0) {
            console.log(rows[0]);
            
            return { hashReal: true, userID: rows[0].userID, name: rows[0].name, role: rows[0].role, pass: rows[0].password };
    }     else {
            return { hashReal: false };
    }
  
    } catch (err) {
        console.error('Error in getHashfromDB:', err);
        throw err;
    }
}

/* getHashfromDB("e226585688a7f2b269ac7bc638f4f637d782dfd63334dbf2eaae10ba55add83a") */

module.exports = {
    writetoDB,
    getHashfromDB
};