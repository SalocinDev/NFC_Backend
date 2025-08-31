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
        const [rows] = await pool.query(
        'SELECT user_id FROM library_user_table WHERE user_email = ?',
        [email]
        );

        if (rows.length > 0) {
        return { success: false, message: "User already registered!" };
        } else {
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
        }
    } catch (err) {
        console.log(err);
        return { success: false, message: err }
    }
};

module.exports = { 
  loginVerify,
  NFCloginVerify,
  signUp
};
