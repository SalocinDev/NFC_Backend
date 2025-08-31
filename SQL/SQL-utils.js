const pool = require("./conn")
const { hashAll, genRandom } = require("../Crypto/crypto-utils");

async function getUserID(email) {
    try {
        const [rows] = await pool.query(
        'SELECT user_id, user_firstname FROM library_user_table WHERE email = ?',
        [email]
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

async function getUserInfoviaHash(hash) {
    try {
        const [rows] = await pool.query(
        'SELECT user_id, user_firstname FROM library_user_table WHERE nfc_token = ?',
        [hash]
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

/* async function getInfo(data){
    try {
        const [rows] = await pool.query(
        'SELECT name FROM users WHERE userID = ?',
        [data]
        );

        if (rows.length > 0) {
        return {success: true, data: rows[0]};
        } else {
        return {success: false, error: "error in getInfo"};
        }

    } catch (err) {
        console.error('Error in SQL-utils:', err);
        throw err;
    }
} */

async function getSalt(email){
    try {
    const [rows] = await pool.query(
        'SELECT user_password_salt FROM library_user_table WHERE user_email = ?',
        [email]
    );
    if (rows.length > 0){
        const saltFromDatabase = rows[0].user_password_salt;
        return {success: true, salt: saltFromDatabase};
    } else {
        return {success: false, err: "Salt not found"}
    }
    } catch (err) {
        console.log(err);
        return {success: false, err}
    };
};

/* //debug get salt
(async () => {
  const result = await getSalt("nicholaslonganilla@gmail.com");
  console.log(result);
})(); */

async function getHashedPasswordviaSalt(password, salt){
    try {
        const calculatedHashedPassword = hashAll(password, salt);
        const [rows] = await pool.query(
            'SELECT user_password FROM library_user_table WHERE user_password_salt = ?',
            [salt]
        )
        if (rows.length > 0){
            const hashedPasswordfromDB = rows[0].user_password;
            if (calculatedHashedPassword === hashedPasswordfromDB){
                return {success: true, calculatedHashedPassword, hashedPasswordfromDB}
            } else {
                return {success: false, err: "Hash is not the same", calculatedHashedPassword, hashedPasswordfromDB}
            }
        }
    } catch (err) {
        return {success: false, err: "Error in GetHashedPasswordviaSalt"}
    }
}

async function checkIfExisting(email){
    try {
        const [rows] = await pool.query(
            'SELECT user_id FROM library_user_table WHERE user_email = ?',
            [email]
        )
        if (rows.length > 0) {
            return { success: true, message: "Acc already exits!" }
        } else {
            return { success: false, message: "Acc not existing" }
        }
    } catch (err) {
        return { success: false, err}
    }
}
//////////////////////////////////////////////////////////////////////////////////

async function getBooks() {
    try {
            const [rows] = await pool.query(
            'SELECT book_id, book_title, book_description FROM book_table'
        );

        if (rows.length > 0) {
            return { success: true, data: rows };
        } else {
            return { success: false, message: "No books found" };
        }
    } catch (error) {
        console.error("Error fetching books:", error);
        return { success: false, message: error.message };
    };
};

module.exports = {
    getUserID,
    getUserInfoviaHash,
    getBooks,
    getSalt,
    checkIfExisting,
    getHashedPasswordviaSalt
};