const express = require("express")
const pool = require("../SQL/conn.js")

const routes = express.Router();

// 📌 Get all categories
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM book_category_table");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

module.exports = routes;
