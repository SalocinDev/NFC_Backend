const express = require("express")
const pool = require("../SQL/conn.js")

const routes = express.Router();

//GET all books with category
routes.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const search = req.query.search ? `%${req.query.search}%` : "%";

    const [rows] = await pool.query(`
      SELECT b.*, c.book_category_name 
      FROM book_table b
      LEFT JOIN book_category_table c 
      ON b.book_category_id_fk = c.book_category_id
      WHERE b.book_title LIKE ?
      LIMIT ?
    `, [search, limit]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

routes.get("/:id", async (req, res) => {
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
routes.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM book_table WHERE book_id=?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

module.exports = routes;
