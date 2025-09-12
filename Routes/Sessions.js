const express = require("express");

module.exports = (store) => {
  const routes = express.Router();

  routes.post("/get-session", (req, res) => {
    if (req.session && req.session.login) {
      res.status(200).json({
        loggedIn: true,
        user: req.session.login.user_id,
        firstName: req.session.login.user_firstname,
        middleName: req.session.login.user_middlename,
        lastName: req.session.login.user_lastname,
        sessionID: req.session.id,
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

  routes.get("/session-test", (req, res) => {
    res.status(200).json(req.session);
  });

  return routes;
};
