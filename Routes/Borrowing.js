const express = require("express")
const pool = require("../SQL/conn.js");
const { route } = require("./NFC.js");

const routes = express.Router();

//get all borrow
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM book_borrow_table");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch borrowed table" });
  }
});

routes.get("/:id", async (req, res) => {
  try {
    const sql = "SELECT * FROM book_borrow_table WHERE user_id_fk = ?";
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

//insert borrow record
routes.post("/", async (req, res) => {
  const { book_id, user_id } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // lock row to prevent race condition
    const [bookRows] = await conn.query(
      `SELECT book_status, book_inventory 
       FROM book_table 
       WHERE book_id = ? FOR UPDATE`,
      [book_id]
    );

    if (bookRows.length === 0) {
      throw new Error("Book not found");
    }

    const { book_status, book_inventory } = bookRows[0];
    if (book_status.toLowerCase() !== "available" || book_inventory <= 0) {
      throw new Error("Book is not available for borrowing");
    }

    // check if already borrowed
    const [existing] = await conn.query(
      `SELECT bb.borrow_id
       FROM book_borrow_table bb
       LEFT JOIN book_returned_table br ON bb.borrow_id = br.borrow_id_fk
       WHERE bb.book_id_fk = ? AND bb.user_id_fk = ? AND br.borrow_id_fk IS NULL`,
      [book_id, user_id]
    );

    if (existing.length > 0) {
      throw new Error("User already borrowed this book and has not returned it");
    }

    // insert borrow record
    const borrowed_date = new Date();
    const due_date = new Date();
    due_date.setMonth(due_date.getMonth() + 1);

    const [result] = await conn.query(
      `INSERT INTO book_borrow_table 
       (book_id_fk, user_id_fk, book_borrowed_date, borrowed_due_date) 
       VALUES (?, ?, ?, ?)`,
      [book_id, user_id, borrowed_date, due_date]
    );

    // update inventory & status
    await conn.query(
      `UPDATE book_table 
       SET book_inventory = book_inventory - 1,
           book_status = CASE WHEN book_inventory - 1 = 0 THEN 'unavailable' ELSE book_status END
       WHERE book_id = ?`,
      [book_id]
    );

    await conn.commit();

    res.json({
      success: true,
      borrowId: result.insertId,
      borrowed_date,
      due_date
    });
  } catch (err) {
    await conn.rollback();
    console.error("Error inserting borrow record:", err.message);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = routes;