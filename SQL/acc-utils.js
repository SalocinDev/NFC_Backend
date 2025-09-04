const pool = require('./conn');
const { hashAll, genRandom } = require('../Crypto/crypto-utils');
const { getSalt, getHashedPasswordviaSalt } = require('./SQL-utils');

async function loginVerify({ email, password }) {
  try {
    const { salt } = await getSalt(email);
    const compareHashes = await getHashedPasswordviaSalt(password, salt)
    const { calculatedHashedPassword } = compareHashes;
    console.log("calculatedHashedPassword: "+compareHashes.calculatedHashedPassword);
    console.log("hashedPasswordfromDB: "+compareHashes.hashedPasswordfromDB);
    if (compareHashes.success) {
      const [rows] = await pool.query(
        'SELECT user_id, user_firstname, user_middlename, user_lastname FROM library_user_table WHERE user_email = ? AND user_password = ?',
        [email, calculatedHashedPassword]
      ); 
      if (rows.length > 0) {
        return { success: true, data: rows[0] };
      } else {
        return { success: false, err: "Login failed" };
      }
    } else {
      return { success: false, err: "Hashes not the same"}
    }

  } catch (err) {
    console.error('Error in loginVerify:', err);
    throw err;
  }
}

async function NFCloginVerify({ token }) {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, user_firstname, user_middlename, user_lastname FROM library_user_table WHERE nfc_token = ?',
      [token]
    );

    if (rows.length > 0) {
      return { success: true, data: rows[0] };
    } else {
      return { success: false };
    }

  } catch (err) {
    console.error('Error in loginVerify:', err);
    throw err;
  }
}

async function signUp(email, password, firstName, middleName, lastName, dob, gender, contactNumber, school){
    try {
      const nfc_token = genRandom(2);
      const salt = genRandom(1);
      const hashedPassword = hashAll(password, salt);
      console.log("hashedPassword to the Database: "+ hashedPassword);
      
      const [result] = await pool.query(
        'INSERT INTO `library_user_table`(`user_email`, `user_password`, `user_password_salt`, `user_firstname`, `user_middlename`, `user_lastname`, `user_date_of_birth`, `user_gender`, `user_contact_number`, `user_school`, `nfc_token`) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [email, hashedPassword, salt, firstName, middleName, lastName, dob, gender, contactNumber, school, nfc_token]
    );
      if (result.affectedRows > 0) {
        return { success: true, message: "Successfully signed up!", userId: result.user_id };
      } else {
        return { success: false, message: "Error in signing up" };
      }
    } catch (err) {
        console.log(err);
        return { success: false, message: err }
    }
};

async function checkAcc({ email, token }) {
  try {
    let query, value;

    if (email) {
      query = 'SELECT * FROM library_user_table WHERE user_email = ?';
      value = email;
    } else if (token) {
      query = 'SELECT * FROM library_user_table WHERE nfc_token = ?';
      value = token;
    } else {
      return { success: false, error: "No email or token provided" };
    }

    const [rows] = await pool.query(query, [value]);

    if (rows.length > 0) {
      console.log(rows[0]);
      return { success: true, exists: true, message: "Account already registered" };
    } else {
      return { success: true, exists: false, message: "Account not registered" };
    }
  } catch (err) {
    return { success: false, error: err.message || "Database error" };
  }
}

async function verifyEmail(email) {
  try {
    const [result] = await pool.query(
      'UPDATE `library_user_table` SET `user_email_verified` = ? WHERE `user_email` = ?',
      ["true", email]
    );

    if (result.affectedRows > 0) {
      return { success: true, message: "Email verified successfully" };
    } else {
      return { success: false, message: "No user found with that email" };
    }
  } catch (error) {
    console.error("Error verifying email:", error);
    return { success: false, error: error.message };
  }
}

/* (async () => {
  let token = "c873ac70ea0417f564bc1d8b1d98689d8b5c65c3bd8dd1846e605c049e6d3351";
  const result = await checkAcc({ token });
  console.log(result);
})(); */

module.exports = { 
  loginVerify,
  NFCloginVerify,
  signUp,
  checkAcc,
  verifyEmail
};
