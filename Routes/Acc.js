const express = require("express")
const routes = express.Router();

const { loginVerify, NFCloginVerify, signUp } = require('../SQL/acc-utils');
const { getUserID, getUserInfoviaHash, getInfo, checkIfExisting } = require("../SQL/SQL-utils");
const { sendOTPthroughMail } = require("../nodemailer/sendOTP")
const { hashAll, genRandom } = require("../Crypto/crypto-utils");

routes.post('/login-verify', async (req, res) => {
  console.log("Login body:", req.body);
  try {
    const { email, password, token } = req.body;
    // case 1: email/password login
    if (email && password) {
      const result = await loginVerify({ email, password });

      if (!result.success) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const { user_id, user_firstname, user_middlename, user_lastname  } = result.data;

      req.session.login = { user_id, user_firstname, user_middlename, user_lastname };
      req.session.cookie.expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      return req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        console.log("Session after email login:", req.session);
        res.status(200).json(result);
      });
    }

    // case 2: NFC login
    if (token) {
      const result = await NFCloginVerify({ token });

      if (!result.success) {
        return res.status(401).json({ error: 'Invalid NFC token' });
      }

      const { user_id, user_firstname, user_middlename, user_lastname } = result.data;

      req.session.login = { user_id, user_firstname, user_middlename, user_lastname };
      req.session.cookie.expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      return req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        console.log("Session after NFC login:", req.session);
        res.status(200).json(result);
      });
    }

    // if neither login method is provided
    return res.status(400).json({ error: 'Missing login credentials' });

  } catch (err) {
    console.error('Error in /login-verify:', err);
    res.status(500).json({ error: 'Internal server error' });
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
  req.session.destroy(err => {
    if (err) {
      console.error("Session destroy error:", err);
      return res.status(500).json({ success: false, message: "Could not log out" });
    }

    res.clearCookie("anongginagawamodito");
    res.json({ success: true });
  });
})

routes.post('/verify-otp', (req, res) => {
  const OTPfromRequest = req.body.OTP;
  if (OTPfromRequest === OTPfromSystem) {
    res.json({ verified: true, OTP: OTPfromRequest });
  } else {
    console.log("error in verify otp");
    res.status(400).json({ verified: false, message: "Invalid OTP" });
  }
});

routes.post('/send-otp', async (req, res) => {
  try {
    const { OTP } = await sendOTPthroughMail(req.body.email);
    OTPfromSystem = OTP;
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});



module.exports = routes;