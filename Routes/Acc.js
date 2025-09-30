const express = require("express")
const routes = express.Router();

const pool = require("../SQL/conn")
const { loginVerify, NFCloginVerify, signUp, checkAcc, verifyEmail, checkEmailVerification, checkEmail, changePassword, updateAccount, staffCheck, checkServiceLogs } = require('../SQL/acc-utils');
const { getUserID, getUserInfoviaHash, getInfo, checkIfExisting } = require("../SQL/SQL-utils");
const { sendOTPthroughMail } = require("../nodemailer/sendOTP")
const { hashAll, genRandom, verifyOTP, OTPStore  } = require("../Crypto/crypto-utils");

routes.post('/login-verify', async (req, res) => {
  try {
    const { email, password, token } = req.body;

    // ===== CASE 1: Email/Password Login =====
    if (email && password) {

      const checkIfStaff = await staffCheck(email, password);
      if (checkIfStaff.success) {
/*         console.log(checkIfStaff.data); */
        console.log(`Staff: ${checkIfStaff.data.staff_firstname} has Logged In`)
        req.session.login = {
          role: "staff", 
          loggedIn: true, 
          ...checkIfStaff.data};

        return req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ success: false, error: "Failed to save session" });
        }
 /*        console.log("Session after email login:", req.session); */
        res.status(200).json({
          success: true,
          role: "staff",
          loggedIn: true,
          ...checkIfStaff.data
        });
      });
      }

      const accountExisting = await checkAcc({ email });
      if (!accountExisting.exists) {
        return res.status(409).json({
          success: false,
          error: "Account not found"
        });
      }

      const isEmailVerified = await checkEmailVerification(email);

      if (!isEmailVerified.success){
        return res.status(400).json(isEmailVerified);
      }

      const result = await loginVerify({ email, password });

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }

/*       console.log(result.data) */

      req.session.login = {role: "user", ...result.data};
      
      return req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ success: false, error: "Failed to save session" });
        }
/*         console.log("Session after email login:", req.session); */
        console.log(`User: ${result.data.user_firstname} has Logged In`)
        res.status(200).json({
          success: true,
          role: "user", 
          loggedIn: true,
          ...result.data
        });
      });
    }

    // ===== CASE 2: NFC Login =====
    if (token) {
      const accountExisting = await checkAcc({ token });

      if (!accountExisting.exists) {
        return res.status(409).json({
          success: false,
          error: "Account not found"
        });
      }

      const result = await NFCloginVerify({ token });

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: "Invalid NFC token"
        });
      }

      req.session.login = {role: "user", ...result.data};

      return req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ success: false, error: "Failed to save session" });
        }
/*         console.log("Session after NFC login:", req.session); */
        console.log(`User: ${result.data.user_firstname} has Logged In`)
        res.status(200).json({
          success: true,
          role: "user", 
          loggedIn: true,
          ...result.data
        });
      });
    }

    // ===== CASE 3: Neither provided =====
    return res.status(400).json({
      success: false,
      error: "Missing login credentials"
    });

  } catch (err) {
/*     console.error("Error in /login-verify:", err); */
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: err.message
    });
  }
});

routes.post('/sign-up', async (req, res) => {
  try {
    const { email, password, firstName, middleName, lastName, dob, gender, contactNumber, school } = req.body;
    console.log("Signing up with:", email, password, firstName, middleName, lastName, dob, gender, contactNumber, school);

    if (!(email && password && firstName && middleName && lastName)) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const accountExisting = await checkAcc({ email });

    if (!accountExisting.success) {
      return res.status(500).json({ success: false, message: accountExisting.error || "Error checking account" });
    }

    if (accountExisting.exists) {
      return res.status(409).json({ success: false, message: "OTP Has Been Sent", error: accountExisting.message });
    }
    //signing up
    const result = await signUp(email, password, firstName, middleName, lastName, dob, gender, contactNumber, school);

    if (!result.success) {
      return res.status(500).json({ success: false, message: "Error in signup" });
    }

    console.log("Successfully signed up!");
    return res.status(201).json({ success: true, message: "Successfully signed up!" });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ success: false, message: "Server error during sign-up", error: error.message });
  }
});

routes.post('/logout', (req, res) =>{
  if (!req.session.login) {
    return res.status(500).json({success: false, message: "Not logged in"})
  }
  console.log(req.session.login.user_firstname+": Logging Off")
  req.session.destroy(err => {
    if (err) {
      console.error("Session destroy error:", err);
      return res.status(500).json({ success: false, message: "Could not log out" });
    }
    res.clearCookie("anongginagawamodito");
    res.status(200).json({ success: true, message: "Logged out successfully!" });
  });
})

//////////////////////////////////////////////////////////////////////////////////////////////////////

routes.post('/send-otp', async (req, res) => {
  try {
    console.log("[SEND-OTP] Incoming body:", req.body);

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase();

    await sendOTPthroughMail(normalizedEmail);
    console.log("[SEND-OTP] Stored OTP for", normalizedEmail, OTPStore.get(normalizedEmail));

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

routes.post('/verify-otp', async (req, res) => {
  try {
    const { email, OTP } = req.body;
    if (!email || !OTP) {
      return res.status(400).json({ verified: false, message: "Email and OTP are required" });
    }

    const normalizedEmail = email.toLowerCase();
    const data = OTPStore.get(normalizedEmail);
    
    if (!data) {
      return res.status(404).json({ verified: false, message: "No OTP found/OTP expired" });
    }
    
    if (Date.now() > data.expiry) {
      OTPStore.delete(normalizedEmail);
      return res.status(400).json({ verified: false, message: "OTP expired" });
    }

    if (OTP !== data.otp) {
      return res.status(401).json({ verified: false, message: "Invalid OTP" });
    }

    OTPStore.delete(normalizedEmail);
    const result = await verifyEmail(email);
    if (!result.success) {
      return res.status(500).json({ verified: true, message: "OTP verified, but email update failed" });
    }

    res.status(200).json({ verified: true, message: "OTP verified & email marked as verified" });
  } catch (err) {
    console.error("Error in /verify-otp:", err);
    res.status(500).json({ verified: false, message: "Server error" });
  }
});

routes.post('/check-email', async (req, res) => {
  try {
    const {email} = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "No Email" });
    }

    const result = await checkEmail(email);

    if (!result.success && result.error) {
      return res.status(500).json({ success: false, message: result.message });
    };
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    };

    if (result.success) {
      return res.status(200).json({ success: true, message: result.message });
    };

  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  };
});

routes.post('/change-password', async (req, res) => {
  try {
    const {email, password} = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "No Password"});
    }
    const result = await changePassword(email, password);
    if (!result.success && result.error) {
      return res.status(500).json({ success: false, message: result.message });
    };
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    };
    if (result.success) {
      return res.status(200).json({ success: true, message: result.message });
    };
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

routes.put("/update", async (req, res) => {
  try {
    const updates = req.body;
    const result = await updateAccount(updates);
    res.status(200).json(result);
  } catch (err) {
    console.error("Update route error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

routes.post("/relogin", async (req, res) => {
  try {
    const { email, token } = req.body;

    let user;
    let checkLogs;

    if (email) {
      //normal relogin via email
      const [rows] = await pool.query(
        `SELECT * FROM library_user_table WHERE user_email = ?`,
        [email]
      );

      if (rows.length === 0) {
        // not a user, check staff
        const [staffRows] = await pool.query(
          `SELECT * FROM library_staff_table WHERE staff_email = ?`,
          [email]
        );

        if (staffRows.length > 0) {
          // staff found → return success:false, but with 200
          return res.status(200).json({ success: false, message: "Is Staff" });
        }

        return res.status(401).json({ success: false, message: "User not found" });
      }

      user = rows[0];

      // Check if user has logged today
      checkLogs = await checkServiceLogs(email);
      if (!checkLogs.success) {
        return res.status(400).json({ success: false, message: checkLogs.message });
      }

    } else if (token) {
      // NFC login via token (users only)
      const [rows] = await pool.query(
        `SELECT * FROM library_user_table WHERE nfc_token = ?`,
        [token]
      );
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: "Invalid NFC token" });
      }
      user = rows[0];

      // check if user has logged today
      checkLogs = await checkServiceLogs(user.user_email);
      if (!checkLogs.success) {
        return res.status(400).json({ success: false, message: checkLogs.message });
      }

    } else {
      return res.status(400).json({ success: false, message: "No login credentials provided" });
    }

    // remove sensitive fields before saving session
    const { user_password, user_password_salt, ...userData } = user;

    // save session
    req.session.login = { role: "user", loggedIn: true, ...userData };
    req.session.save(err => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ success: false, error: "Failed to save session" });
      }

      console.log(`User: ${userData.user_firstname} has Logged In`);
      res.status(200).json({
        success: true,
        role: "user",
        loggedIn: true,
        ...userData
      });
    });

  } catch (error) {
    console.error("Relogin error:", error);
    return res.status(500).json({ success: false, message: error.message || error });
  }
});


module.exports = routes;