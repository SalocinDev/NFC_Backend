const express = require("express");
const pool = require("../SQL/conn")

module.exports = (store) => {
  const routes = express.Router();

  routes.get("/get-session", (req, res) => {
    try {
      if (req.session && req.session.login) {
      res.status(200).json({
        loggedIn: true,
        role: "user", 
        ...req.session.login,
        user: req.session.login.user_id,
        /*firstName: req.session.login.user_firstname,
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
    } catch (error) {
      res.status(500).json({ success: false, message: "User not Logged In" })
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
