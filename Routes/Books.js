//TO DO ILIPAT YUNG UPLOAD NG BOOKS DITO na nasa OPAC
const express = require("express")
const pool = require("../SQL/conn.js")
const multer = require("multer");
const path = require("path");

const routes = express.Router();

//GET all books with category
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM book_table");
    res.type("application/json").status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch book table" });
  }
});

//available books
routes.get("/available-books", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.book_id, b.book_title
      FROM book_table b
      WHERE b.book_id NOT IN (
        SELECT book_id_fk 
        FROM book_borrow_table 
        WHERE borrowed_due_date IS NULL
      )
    `);

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching available books:", error);
    res.status(500).json({ success: false, message: error.message || error });
  }
});

routes.get("/book-categories", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT bc.book_category_id, bc.book_category_name
      FROM book_category_table bc
      JOIN book_table bt 
        ON bt.book_category_id_fk = bc.book_category_id
      WHERE bt.book_id NOT IN (
        SELECT bb.book_id_fk
        FROM book_borrow_table bb
        LEFT JOIN book_returned_table br 
          ON bb.borrow_id = br.borrow_id_fk
        WHERE br.date_returned IS NULL
      )
    `);

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching available categories:", error);
    res.status(500).json({ success: false, message: error.message || error });
  }
});

routes.get(":id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM book_table WHERE book_id = ?`,
      [id]
    );
    if (rows.length > 0) {
      res.status(200).json({rows});
    } else {
      res.status(400).json({message: "Book Not Found"})
    }
/*     if (role === "user") {
      const [rows] = await pool.query(
        `SELECT * FROM book_table WHERE book_id = ?`,
        [id]
      );
      if (rows.length > 0) {
        res.status(200).json({rows});
      } else {
        res.status(400).json({message: "Book Not Found"})
      }
    } */
  } catch (error) {
    res.status(400).json({error: error.message || error})
  }
})

//CREATE new book
routes.post("/", async (req, res) => {
  try {
    const {
      book_title,
      book_author,
      book_description,
      book_publisher,
      book_year_publish,
      book_category_id_fk,
      book_status,
      book_inventory,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO book_table 
      (book_title, book_author, book_description, book_publisher, book_year_publish, book_category_id_fk, book_status, book_inventory, book_view_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        book_title,
        book_author,
        book_description,
        book_publisher,
        book_year_publish,
        book_category_id_fk,
        book_status,
        book_inventory,
      ]
    );
    console.log(`Book ${book_title} Added`);
    res.json({ book_id: result.insertId, ...req.body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add book" });
  }
});

routes.post("/:role", async (req, res) => {
  try {
    const { role } = req.params;
    const formValues = req.body;
    const { book_title, book_author, book_description, book_publisher, book_year_publish, book_category_id_fk, book_status, book_inventory, book_view_count } = formValues;
    if (!role || !formValues) {
      return res.status(400).json({ success: false, message: "Bad Request" })
    }
    if (role != "staff") {
      return res.status(401).json({ success: false, message: "Not Authorized" })
    }
    const [result] = await pool.query(
      `INSERT INTO book_table (book_title, book_author, book_description, book_publisher, book_year_publish, book_category_id_fk, book_status, book_inventory, book_view_count) VALUES (?,?,?,?,?,?,?,?,?)`,
      [book_title, book_author, book_description, book_publisher, book_year_publish, book_category_id_fk, book_status, book_inventory, book_view_count]
    )
    if (result.affectedRows > 0){
      return res.status(200).json({ success: true, message: "Book Successfully Added" })
    }
  } catch (error) {
    console.log(error.message || error)
    return res.status(500).json({ success: false, message: error.message || error});
  }
})

//UPDATE book
routes.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      book_title,
      book_author,
      book_description,
      book_publisher,
      book_year_publish,
      book_category_id_fk,
      book_status,
      book_inventory,
    } = req.body;

    await pool.query(
      `UPDATE book_table 
       SET book_title=?, book_author=?, book_description=?, book_publisher=?, book_year_publish=?, book_category_id_fk=?, book_status=?, book_inventory=? 
       WHERE book_id=?`,
      [
        book_title,
        book_author,
        book_description,
        book_publisher,
        book_year_publish,
        book_category_id_fk,
        book_status,
        book_inventory,
        id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update book" });
  }
});

//DELETE book
routes.delete("/", async (req, res) => {
  try {
    const { id } = req.query;
    await pool.query("DELETE FROM book_table WHERE book_id=?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

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
    const checkSql = `SELECT b.book_id, b.book_title, b.book_author FROM book_borrow_table bb JOIN book_table b ON bb.book_id_fk = b.book_id WHERE b.book_id IN (${placeholders})`;
    const [rows] = await pool.query(checkSql, selectedIds);

    if (rows.length > 0) {
      return res.status(400).json({success: false, message: "Cannot delete books that are still referenced in borrow records.",books: rows
      });
    }
    
    const deleteSql = `DELETE FROM book_table WHERE book_id IN (${placeholders})`;
    const [result] = await pool.query(deleteSql, selectedIds);
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
