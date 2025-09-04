const express = require("express")
const routes = express.Router();

const { loginVerify, NFCloginVerify, signUp, checkAcc, verifyEmail } = require('../SQL/acc-utils');
const { getUserID, getUserInfoviaHash, getInfo, checkIfExisting } = require("../SQL/SQL-utils");
const { sendOTPthroughMail } = require("../nodemailer/sendOTP")
const { hashAll, genRandom, verifyOTP, OTPStore  } = require("../Crypto/crypto-utils");

routes.post('/login-verify', async (req, res) => {
  console.log("Login body:", req.body);

  try {
    const { email, password, token } = req.body;

    // ===== CASE 1: Email/Password Login =====
    if (email && password) {
      const accountExisting = await checkAcc({ email });

      if (!accountExisting.exists) {
        return res.status(409).json({
          success: false,
          error: "Account not found"
        });
      }

      const result = await loginVerify({ email, password });

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }

      const { user_id, user_firstname, user_middlename, user_lastname } = result.data;

      req.session.login = { user_id, user_firstname, user_middlename, user_lastname };
      req.session.cookie.expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      return req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({
            success: false,
            error: "Failed to save session"
          });
        }

        console.log("Session after email login:", req.session);
        res.status(200).json({
          success: true,
          result: { user_id, user_firstname, user_middlename, user_lastname }
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

      const { user_id, user_firstname, user_middlename, user_lastname } = result.data;

      req.session.login = { user_id, user_firstname, user_middlename, user_lastname };
      req.session.cookie.expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      return req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({
            success: false,
            error: "Failed to save session"
          });
        }

        console.log("Session after NFC login:", req.session);
        res.status(200).json({
          success: true,
          result: { user_id, user_firstname, user_middlename, user_lastname }
        });
      });
    }

    // ===== CASE 3: Neither provided =====
    return res.status(400).json({
      success: false,
      error: "Missing login credentials"
    });

  } catch (err) {
    console.error("Error in /login-verify:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error", details: err.message
    });
  }
});

routes.post('/sign-up', async (req, res) => {
  try {
    const { email, password, firstName, middleName, lastName, dob, gender, contactNumber, school } = req.body;
    console.log("Signing up with :"+ email, password, firstName, middleName, lastName, dob, gender, contactNumber, school);
    if (email && password && firstName && middleName && lastName) {
      const result = await signUp( email, password, firstName, middleName, lastName, dob, gender, contactNumber, school);
      if (!result.success) {
        if (result.message.includes("already registered")) {
          return res.status(400).json({ success: false, message: result.message, user_id: result.userId });
        }
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.log("Success fully Signed up!");

      res.status(201).json({ success: true, message: "Successfully signed up!" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error during sign-up", error });
  }
});

routes.post('/logout', (req, res) =>{
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
    console.log("[VERIFY-OTP] Lookup for", normalizedEmail, data);

    if (!data) {
      return res.status(404).json({ verified: false, message: "No OTP found" });
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

    res.json({ verified: true, message: "OTP verified & email marked as verified" });
  } catch (err) {
    console.error("Error in /verify-otp:", err);
    res.status(500).json({ verified: false, message: "Server error" });
  }
});


module.exports = routes;