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

/** original sht may tetest lng */
/* async function getBooks() {
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
}; */

//ver ni orvie
async function getBooks() {
    try {
            const [rows] = await pool.query(
            'SELECT book_table.book_id, book_table.book_title, book_category_table.book_category_id_fk, book_category_table.book_category_table FROM book_tableINNER JOIN book_category_table ON book_table.book_category_id_fk = book_category_table.book_category_id'
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

async function writetoDB(data) {
    try {
        const [result] = await pool.query(
            `INSERT INTO library_user_table (user_id, nfc_token) VALUES (?, ?)`,
            [user_id, nfc_token]
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

async function getServicesPK(servicesArray) {
  try {
    if (!Array.isArray(servicesArray) || servicesArray.length === 0) {
      return [];
    }
    const placeholders = servicesArray.map(() => "?").join(", ");

    const [rows] = await pool.query(
      `SELECT library_service_id 
       FROM library_services_table 
       WHERE library_service_name IN (${placeholders})`,
      servicesArray
    );
    return rows.map(r => r.library_service_id);
  } catch (error) {
    console.error("Error fetching service IDs:", error);
    return [];
  }
}

async function logServices(servicesPK, user_id) {
  try {
    if (!Array.isArray(servicesPK) || servicesPK.length === 0) {
      return { success: false, message: "No services to log." };
    }
    const values = servicesPK.map(serviceId => [serviceId, user_id]);
    await pool.query(
      `INSERT INTO user_library_log (log_service_id_fk, user_id_fk) VALUES ?`,
      [values]
    );
    console.log("Services logged successfully.");
    return { success: true, loggedServices: servicesPK };
  } catch (error) {
    console.error("Error logging services:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
    getUserID,
    getUserInfoviaHash,
    getBooks,
    getSalt,
    checkIfExisting,
    getHashedPasswordviaSalt,
    writetoDB,
    getServicesPK,
    logServices
};