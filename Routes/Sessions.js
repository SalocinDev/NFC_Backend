const express = require("express");

module.exports = (store) => {
  const routes = express.Router();

  routes.get("/get-session", (req, res) => {
    console.log("Session data:", req.session);

    if (req.session?.login?.user_id) {
      res.json({
        loggedIn: true,
        user: req.session.login.user_id,
        firstName: req.session.login.user_firstname,
        middleName: req.session.login.user_middlename,
        lastName: req.session.login.user_lastname,
        sessionID: req.session.id
      });
    } else {
      console.log("No user logged in.");
      res.status(401).json({ loggedIn: false });
    }
  });

  routes.get('/current-sessions', (req, res) => {
    store.all((err, sessions) => {
      if (err) {
        console.error("Error fetching sessions:", err);
        return res.status(500).json({ error: "Failed to fetch sessions" });
      }
      const activeUsers = Object.values(sessions)
        .filter(sess => sess.login)
        .map(sess => sess.login); 

      res.json({ activeUsers });
    });
  });

  return routes;
};
