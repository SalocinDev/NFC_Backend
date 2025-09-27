const express = require("express")
const pool = require("../SQL/conn.js")
const routes = express.Router();

routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT library_service_id, library_service_name FROM library_services_table");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

module.exports = routes;