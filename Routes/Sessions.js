const express = require("express");

module.exports = (store) => {
  const routes = express.Router();

  routes.post("/get-session", (req, res) => {
    if (req.session && req.session.login) {
      const userInfo = req.session.login;
      res.status(200).json({
        loggedIn: true,
        data: req.session.login,
        /* user: req.session.login.user_id,
        firstName: req.session.login.user_firstname,
        middleName: req.session.login.user_middlename,
        lastName: req.session.login.user_lastname,
        dob: req.session.login.user_date_of_birth,
        gender: req.session.login.user_gender,
        contact: req.session.login.user_contact_number,
        school: req.session.login.user_school,
        nfcToken: req.session.login.nfc_token,
        sessionID: req.session.id, */
      });
    } else {
      res.status(200).json({ loggedIn: false, message: "Not Logged in", err: "no req.session.login" });
    }
  });


  routes.post('/current-sessions', (req, res) => {
    store.all((err, sessions) => {
      if (err) {
        console.error("Error fetching sessions:", err);
        return res.status(500).json({ error: "Failed to fetch sessions" });
      }
      const activeUsers = Object.values(sessions)
        .filter(sess => sess.login)
        .map(sess => sess.login); 

      res.status(200).json({ activeUsers });
    });
  });

  routes.post("/session-test", (req, res) => {
    res.status(200).json(req.session);
  });

  return routes;
};
