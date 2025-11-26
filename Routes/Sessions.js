const express = require("express");
const pool = require("../SQL/conn")

module.exports = (store) => {
  const routes = express.Router();

  routes.get("/get-session", (req, res) => {
    try {
      console.log("SESSION LOGIN DATA:", req.session?.login);
      if (!req.session || !req.session.login) {
        return res.status(200).json({
          loggedIn: false,
          message: "Not Logged in",
          err: "no req.session.login"
        });
      }
      if (req.session.login.role === "user") {
        return res.status(200).json({
          loggedIn: true,
          role: "user",
          user_id: req.session.login.user_id,
          user_firstname: req.session.login.user_firstname,
          user_middlename: req.session.login.user_middlename,
          user_lastname: req.session.login.user_lastname,
          user_pfp_id_fk: req.session.login.user_pfp_id_fk,
        });
      }
      if (req.session.login.role === "staff") {
        return res.status(200).json({
          loggedIn: true,
          role: "staff",
          staff_id: req.session.login.staff_id,
          staff_firstname: req.session.login.staff_firstname,
          staff_middlename: req.session.login.staff_middlename,
          staff_lastname: req.session.login.staff_lastname,
          user_pfp_id_fk: req.session.login.user_pfp_id_fk,
        });
      }
      return res.status(200).json({
        loggedIn: false,
        message: "Unknown role",
        err: "invalid role"
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "User not Logged In"
      });
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

  routes.get("/borrowed", async (req, res) => {
  if (!req.session || !req.session.login) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const userId = req.session.login.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT bb.borrow_id, bb.book_borrowed_date, bb.borrowed_due_date,
              b.book_title, b.book_author, b.book_publisher
       FROM book_borrow_table bb
       JOIN book_table b ON bb.book_id_fk = b.book_id
       WHERE bb.user_id_fk = ?`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching borrows:", err);
    res.status(500).json({ error: "Failed to fetch borrowed books" });
  }
});

  return routes;
};
