const express = require("express")
const pool = require("../SQL/conn.js")

const routes = express.Router();

// Get all WiFi entries
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM library_wifi_table");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching WiFi entries:", error);
    res.status(500).json({ message: "Error fetching WiFi entries" });
  }
});

// Get a specific WiFi entry by ID
routes.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM library_wifi_table WHERE wifi_id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "WiFi entry not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching WiFi entry:", error);
    res.status(500).json({ message: "Error fetching WiFi entry" });
  }
});

// Add a new WiFi entry
routes.post("/", async (req, res) => {
  const { wifi_name, wifi_password } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO library_wifi_table (wifi_name, wifi_password) VALUES (?, ?)",
      [wifi_name, wifi_password]
    );
    res.status(201).json({ message: "WiFi entry added", wifi_id: result.insertId });
  } catch (error) {
    console.error("Error adding WiFi entry:", error);
    res.status(500).json({ message: "Error adding WiFi entry" });
  }
});

// Update a WiFi entry
routes.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { wifi_name, wifi_password } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE library_wifi_table SET wifi_name = ?, wifi_password = ? WHERE wifi_id = ?",
      [wifi_name, wifi_password, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "WiFi entry not found" });
    }
    res.json({ message: "WiFi entry updated" });
  } catch (error) {
    console.error("Error updating WiFi entry:", error);
    res.status(500).json({ message: "Error updating WiFi entry" });
  }
});

// Delete a WiFi entry
routes.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "DELETE FROM library_wifi_table WHERE wifi_id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "WiFi entry not found" });
    }
    res.json({ message: "WiFi entry deleted" });
  } catch (error) {
    console.error("Error deleting WiFi entry:", error);
    res.status(500).json({ message: "Error deleting WiFi entry" });
  }
});

module.exports = routes;