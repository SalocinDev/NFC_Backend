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
    const sql = `
      SELECT 
        brt.book_returned_id,
        brt.date_returned,
        bbt.borrow_id,
        bt.book_title,
        bt.book_author,
        bt.book_publisher,
        bt.book_year_publish
      FROM book_returned_table brt
      JOIN book_borrow_table bbt 
        ON brt.borrow_id_fk = bbt.borrow_id
      JOIN book_table bt
        ON bbt.book_id_fk = bt.book_id
      WHERE brt.user_id_fk = ?
    `;
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

routes.post("/:role", async (req, res) => {
  try {
    const { role } = req.params;
    const formValues = req.body;
    const { borrow_id_fk, date_returned, user_id_fk } = formValues;
    if (!role || !formValues) {
      return res.status(400).json({ success: false, message: "Bad Request" });
    }
    if (role != "staff") {
      return res.status(401).json({ success: false, message: "Not Authorized" });
    }
    const [result] = await pool.query(
      `INSERT INTO book_returned_table (borrow_id_fk, date_returned, user_id_fk) VALUES (?,?,?)`,
      [borrow_id_fk, date_returned, user_id_fk]
    );
    if (result.affectedRows > 0) {
      const [[borrowRecord]] = await pool.query(
        `SELECT book_id_fk FROM book_borrow_table WHERE borrow_id = ?`,
        [borrow_id_fk]
      );
      if (!borrowRecord) {
        return res.status(404).json({ success: false, message: "Borrow record not found" });
      }
      const bookId = borrowRecord.book_id_fk;
      await pool.query(
        `UPDATE book_table SET book_inventory = book_inventory + 1, book_status = CASE WHEN book_inventory + 1 > 0 THEN 'available' ELSE 'unavailable' END WHERE book_id = ?`,
        [bookId]
      );
      return res.status(200).json({ success: true, message: "Book successfully returned" });
    }
  } catch (error) {
    console.log(error.message || error);
    return res.status(500).json({ success: false, message: error.message || error });
  }
});

module.exports = routes;