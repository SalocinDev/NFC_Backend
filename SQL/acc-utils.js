const pool = require('./conn');
const { hashAll, genRandom } = require('../Crypto/crypto-utils');
const { getSalt, getHashedPasswordviaSalt } = require('./SQL-utils');

async function staffCheck(email, password) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM library_staff_table WHERE staff_email = ? AND staff_password = ?',
      [email, password]
    );
    if (rows.length > 0) {
        return { success: true, data: rows[0] };
      } else {
        return { success: false, message: "Not Admin" };
      }
  } catch (error) {
    return { success: false, err: error.message || error };
    }
  }

async function loginVerify({ email, password }) {
  try {
    const { salt } = await getSalt(email);
    const compareHashes = await getHashedPasswordviaSalt(password, salt)
    const { calculatedHashedPassword } = compareHashes;
/*     console.log("calculatedHashedPassword: "+compareHashes.calculatedHashedPassword);
    console.log("hashedPasswordfromDB: "+compareHashes.hashedPasswordfromDB); */
    if (compareHashes.success) {
      const [rows] = await pool.query(
        'SELECT * FROM library_user_table WHERE user_email = ? AND user_password = ?',
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
      'SELECT * FROM library_user_table WHERE nfc_token = ?',
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
/*       console.log("hashedPassword to the Database: "+ hashedPassword); */
      
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
/*       console.log(rows[0]); */
      return { success: true, exists: true, message: "Account already registered" };
    } else {
      return { success: true, exists: false, message: "Account not registered" };
    }
  } catch (err) {
    return { success: false, error: err.message || "Database error" };
  }
}

/* (async () => {
  let email = "nicholaslonganilla@gmail.com";
  const result = await checkAcc(email);
  console.log(result);
})(); */

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
  let email = "nicholaslonganilla@gmail.com";
  const result = await verifyEmail(email);
  console.log(result);
})(); */

async function checkEmailVerification(email) {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, user_email FROM library_user_table WHERE user_email = ? and user_email_verified = ?',
      [email, "true"]
    )
    if (rows.length > 0) {
      return { success: true, message: "Email is verified" }
    } else {
      return { success: false, message: "Email is not verified"}
    }
  } catch (error) {
    return { success: false, message: error}
  }
}

/* (async () => {
  let email = "nicholaslonganilla@gmail.com";
  const result = await checkEmailVerification(email);
  console.log(result);
})(); */

async function checkEmail(email) {
  try {
    const [rows] = await pool.query(
      'SELECT user_email FROM library_user_table WHERE user_email = ?',
      [email]
    );
    if (rows.length > 0) {
      return { success: true, message: "Account found"}
    } else {
      return { success: false, message: "Acc is not registered"}
    }
  } catch (error) {
    return { success: false, message: error }
  }
}

async function changePassword(email, password) {
  try {
    const salt = genRandom(1);
    const newPassword = hashAll(password, salt);
    const [result] = await pool.query(
      'UPDATE library_user_table SET user_password = ?, user_password_salt = ? WHERE user_email = ?',
      [newPassword, salt, email]
    )
    if (result.affectedRows > 0) {
      return { success: true, message: "Password Changed" };
    } else {
      return { success: false, message: "No user found with that email" };
    }
  } catch (error) {
    return { success: false, message: error.message+"DWWDS" || JSON.stringify(error) }
  }
}

async function updateAccount(updates = {}) {
  try {
    const { email } = updates;
    let fields = [];
    let values = [];

    if (updates.firstName !== undefined) {
      fields.push("user_firstname = ?");
      values.push(updates.firstName);
    }
    if (updates.middleName !== undefined) {
      fields.push("user_middlename = ?");
      values.push(updates.middleName);
    }
    if (updates.lastName !== undefined) {
      fields.push("user_lastname = ?");
      values.push(updates.lastName);
    }
    if (updates.dob !== undefined && updates.dob !== "") {
      fields.push("user_date_of_birth = ?");
      values.push(updates.dob);
    }
    if (updates.gender !== undefined) {
      fields.push("user_gender = ?");
      values.push(updates.gender);
    }
    if (updates.contact !== undefined) {
      fields.push("user_contact_number = ?");
      values.push(updates.contact);
    }
    if (updates.school !== undefined) {
      fields.push("user_school = ?");
      values.push(updates.school);
    }
    if (updates.newEmail !== undefined) {
      fields.push("user_email = ?");
      values.push(updates.newEmail);
    }

    if (updates.oldPassword && updates.newPassword) {
      const { salt } = await getSalt(email);
      const compareHashes = await getHashedPasswordviaSalt(updates.oldPassword, salt);

      if (!compareHashes.success) {
        return { success: false, message: "Old password is incorrect" };
      }

      const newSalt = genRandom(1);
      const hashedPassword = hashAll(updates.newPassword, newSalt);

      fields.push("user_password = ?", "user_password_salt = ?");
      values.push(hashedPassword, newSalt);
    }

    if (fields.length === 0) {
      return { success: false, message: "No fields to update" };
    }

    values.push(email);

    const query = `UPDATE library_user_table SET ${fields.join(", ")} WHERE user_email = ?`;
    const [result] = await pool.query(query, values);

    if (result.affectedRows > 0) {
      return { success: true, message: "Account updated successfully" };
    } else {
      return { success: false, message: "No user found with that email" };
    }
  } catch (error) {
    console.error("Error updating account:", error);
    return { success: false, message: error.message || "Database error" };
  }
}

async function updateProfilePicture(profilePictureName, profilePictureData, user_id) {
  try {
    const [result] = await pool.query(
      `INSERT INTO user_pfp_table (user_pfp_name, user_pfp_data, user_id_fk)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         user_pfp_name = VALUES(user_pfp_name),
         user_pfp_data = VALUES(user_pfp_data)`,
      [profilePictureName, profilePictureData, user_id]
    );
    if (result.affectedRows > 0) {
        await updateProfilePictureForeignKey(user_id)
        return { success: true, result: result.affectedRows > 0 };
      } else {
        return { success: false, message: "Updating Profile Picture" };
      }
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return { success: false, error };
  }
}

async function updateProfilePictureForeignKey(user_id) {
  try {
    const [rows] = await pool.query(
      `SELECT user_pfp_id FROM user_pfp_table WHERE user_id_fk = ? ORDER BY user_pfp_id DESC LIMIT 1`,
      [user_id]
    );
    if (rows.length > 0) {
      const user_pfp_id = rows[0].user_pfp_id;
      const [update] = await pool.query(
        `UPDATE library_user_table SET user_pfp_id_fk = ? WHERE user_id = ?`,
        [user_pfp_id, user_id]
      );
      return { success: update.affectedRows > 0 };
    } else {
      console.error("No profile picture found for user:", user_id);
      return { success: false, message: "No profile picture found" };
    }
  } catch (error) {
    console.error("Error updating foreign key:", error);
    return { success: false, error };
  }
}

async function getProfilePicture(user_pfp_id) {
  try {
    const [rows] = await pool.query(
      `SELECT user_pfp_data FROM user_pfp_table WHERE user_pfp_id = ?`,
      [user_pfp_id]
    );

    if (rows.length > 0) {
      const buffer = rows[0].user_pfp_data;
      return { success: true, buffer };
    } else {
      return { success: false, message: "No profile picture found" };
    }
  } catch (error) {
    console.error("Error getting Profile picture:", error);
    return { success: false, error };
  }
}

module.exports = { 
  staffCheck,
  loginVerify,
  NFCloginVerify,
  signUp,
  checkAcc,
  verifyEmail,
  checkEmailVerification,
  checkEmail,
  changePassword,
  updateAccount,
  updateProfilePicture,
  getProfilePicture
};
