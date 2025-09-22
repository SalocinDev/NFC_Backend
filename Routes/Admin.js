/* const express = require("express")
const pool = require("../SQL/conn.js")

const routes = express.Router();

routes.post("/book", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.book_category_name 
      FROM book_table b
      LEFT JOIN book_category_table c 
      ON b.book_category_id_fk = c.book_category_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

module.exports = routes;
 */