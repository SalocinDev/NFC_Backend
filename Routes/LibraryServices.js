const express = require("express");
const pool = require("../SQL/conn.js");

const routes = express.Router();

/* GET all services */
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM library_services_table ORDER BY library_service_id ASC"
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ADD service */
routes.post("/", async (req, res) => {
  try {
    const { library_service_name, library_service_status } = req.body;

    const sql = `
      INSERT INTO library_services_table 
      (library_service_name, library_service_status)
      VALUES (?, ?)
    `;

    await pool.query(sql, [
      library_service_name,
      library_service_status
    ]);

    res.json({ message: "Service added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* UPDATE service */
routes.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { library_service_name, library_service_status } = req.body;

    const sql = `
      UPDATE library_services_table
      SET library_service_name = ?, library_service_status = ?
      WHERE library_service_id = ?
    `;

    await pool.query(sql, [
      library_service_name,
      library_service_status,
      id
    ]);

    res.json({ message: "Service updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* DELETE service */
routes.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const sql = `DELETE FROM library_services_table WHERE library_service_id = ?`;
    await pool.query(sql, [id]);

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = routes;
