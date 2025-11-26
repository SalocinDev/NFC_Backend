const express = require("express")
const pool = require("../SQL/conn.js");
const { route } = require("./NFC.js");

const routes = express.Router();

//get all borrow
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        bb.borrow_id,
        bb.book_id_fk,
        b.book_title,
        bb.user_id_fk,
        CONCAT(u.user_firstname, ' ', u.user_lastname) AS user_name,
        bb.book_borrowed_date,
        bb.borrowed_due_date,
        bb.Borrow_Status
      FROM book_borrow_table bb
      JOIN book_table b ON bb.book_id_fk = b.book_id
      JOIN library_user_table u ON bb.user_id_fk = u.user_id
    `);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch borrowed table" });
  }
});


// Get all currently borrowed books with borrow_id
routes.get("/borrowing-id", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        bb.borrow_id, 
        bb.book_id_fk, 
        b.book_title,
        u.user_id,
        CONCAT(u.user_firstname, ' ', u.user_lastname) AS full_name
      FROM book_borrow_table bb
      JOIN book_table b ON bb.book_id_fk = b.book_id
      JOIN library_user_table u ON bb.user_id_fk = u.user_id
      WHERE bb.borrow_id NOT IN (
        SELECT borrow_id_fk FROM book_returned_table
      )
    `);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No borrowed books found" });
    }

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching borrowed books:", error);
    res.status(500).json({ success: false, message: error.message || error });
  }
});

routes.get("/:id", async (req, res) => {
  try {
    // console.log("/borrowing has been hit by the production");
    const sql = `
      SELECT 
        bbt.borrow_id,
        bt.book_title,
        bt.book_author,
        bt.book_publisher,
        bt.book_year_publish,
        bbt.book_borrowed_date,
        bbt.borrowed_due_date
      FROM book_borrow_table bbt
      JOIN book_table bt 
        ON bbt.book_id_fk = bt.book_id
      WHERE bbt.user_id_fk = ?
    `;
    
    const [rows] = await pool.query(sql, [req.params.id]);
    if (rows.length > 0) {
      res.type("application/json").status(200).json(rows);
    } else {
      res.status(204).json({ success: false, message: "None Found for User" });
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

routes.post("/:role", async (req, res) => {
  try {
    const { role } = req.params;
    const formValues = req.body;
    const { book_id_fk, user_id_fk, book_borrowed_date, borrowed_due_date, Borrow_Status } = formValues;
    if (!role || !formValues) {
      return res.status(400).json({ success: false, message: "Bad Request" })
    }
    // console.log(`${role} with ${JSON.stringify(formValues)}`);
    // res.status(200).json({ success: true, message: `/borrowing/${role} has been hit`});
    if (role != "staff") {
      return res.status(401).json({ success: false, message: "Not Authorized" })
    }
    const [result] = await pool.query(
      `INSERT INTO book_borrow_table (book_id_fk, user_id_fk, book_borrowed_date, borrowed_due_date, Borrow_Status)
      VALUES (?, ?, ?, ?, ?)`,
      [book_id_fk, user_id_fk, book_borrowed_date, borrowed_due_date, Borrow_Status]
    );

    if (result.affectedRows === 0) {
      return res.status(204).json({ success: false, message: "No Record for user" })
    }
    if (result.affectedRows > 0) {
      await pool.query(
        `UPDATE book_table SET book_inventory = book_inventory - 1, book_status = CASE WHEN book_inventory - 1 <= 0 THEN 'unavailable' ELSE 'available' END WHERE book_id = ?`,
        [book_id_fk]
      );
      return res.status(200).json({ success: true, message: "Borrow Record Successfully Added" })
    }
  } catch (error) {
    console.log(error.message || error)
    return res.status(500).json({ success: false, message: error.message || error});
  }
})

routes.delete("/:role", async (req, res) => {
  try {
    const selectedIds = req.body;
    const { role } = req.params;

    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({ success: false, message: "No IDs provided" });
    }
    if (role !== "staff") {
      return res.status(401).json({ success: false, message: "Not Authorized" });
    }

    const placeholders = selectedIds.map(() => "?").join(",");
    const sql = `DELETE FROM book_borrow_table WHERE borrow_id IN (${placeholders})`;

    const [result] = await pool.query(sql, selectedIds);

    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: "Database Error!" });
    }
    return res.status(200).json({ success: true, message: "Deleted Successfully!" });
  } catch (error) {
    console.log(error.message || error);
    return res.status(500).json({ success: false, message: error.message || error });
  }
});


module.exports = routes;