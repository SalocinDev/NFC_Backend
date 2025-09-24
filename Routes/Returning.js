const express = require("express")
const pool = require("../SQL/conn.js")
const routes = express.Router();

//get all returning
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM book_returned_table");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch borrowed table" });
  }
});

//get book_return via user_id
routes.get("/:id", async (req, res) => {
  try {
    const sql = "SELECT * FROM book_returned_table WHERE user_id_fk = ?";
    const [rows] = await pool.query(sql, [req.params.id]);
    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(400).json({ success: false, message: "None Found for User" })
    }
  } catch (error) {
    console.error("Error fetching log:", error);
    res.status(500).json({ error: "Failed to fetch log" });
  }
});

//post return
routes.post("/", async (req, res) => {
  try {
    const { user_id, book_id } = req.body;
    const user_id_fk = user_id;
    const book_id_fk = book_id;
    // 1. Find borrow record
    const [borrowRows] = await pool.query(
      `SELECT borrow_id FROM book_borrow_table WHERE book_id_fk = ? AND user_id_fk = ?`,
      [book_id_fk, user_id_fk]
    );

    if (borrowRows.length === 0) {
      return res.status(404).json({ success: false, message: "No borrow record found for this book and user" });
    }

    const borrow_id_fk = borrowRows[0].borrow_id;

    // 2. Check if already returned
    const [alreadyReturned] = await pool.query(
      "SELECT 1 FROM book_returned_table WHERE borrow_id_fk = ?",
      [borrow_id_fk]
    );

    if (alreadyReturned.length > 0) {
      return res.status(400).json({ success: false, message: "Book already returned" });
    }

    // 3. Insert return record
    const [result] = await pool.query(
      `INSERT INTO book_returned_table (borrow_id_fk, user_id_fk) VALUES (?, ?)`,
      [borrow_id_fk, user_id_fk]
    );

    if (result.affectedRows > 0) {
      // 4. Update inventory
      await pool.query(
        `UPDATE book_table 
         SET book_inventory = book_inventory + 1,
             book_status = CASE WHEN book_inventory + 1 > 0 THEN 'available' ELSE book_status END
         WHERE book_id = ?`,
        [book_id_fk]
      );

      res.json({ success: true, returnId: result.insertId });
    } else {
      res.status(400).json({ success: false, message: "Insert failed" });
    }
  } catch (error) {
    console.error("Error creating return record:", error);
    res.status(500).json({ error: "Failed to create return record" });
  }
});


module.exports = routes;