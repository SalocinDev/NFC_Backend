const pool = require("./conn")

async function getUserID(data) {
    try {
        const [rows] = await pool.query(
        'SELECT userID FROM users WHERE name = ?',
        [data]
        );

        if (rows.length > 0) {
        return rows[0].userID;
        } else {
        return;
        }

    } catch (err) {
        console.error('Error in SQL-utils:', err);
        throw err;
    }
}

async function getUserInfoviaHash(data) {
    try {
        const [rows] = await pool.query(
        'SELECT userID, name FROM users WHERE hash = ?',
        [data]
        );

        if (rows.length > 0) {
        return rows[0];
        } else {
        return;
        }

    } catch (err) {
        console.error('Error in SQL-utils:', err);
        throw err;
    }
}

async function getInfo(data){
    try {
        const [rows] = await pool.query(
        'SELECT name FROM users WHERE userID = ?',
        [data]
        );

        if (rows.length > 0) {
        return rows[0].name;
        } else {
        return;
        }

    } catch (err) {
        console.error('Error in SQL-utils:', err);
        throw err;
    }
}

module.exports = {
    getUserID,
    getUserInfoviaHash,
    getInfo
}