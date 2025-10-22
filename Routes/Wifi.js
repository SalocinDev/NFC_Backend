const express = require("express");
const pool = require("../SQL/conn.js");
const routes = express.Router();

routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM library_wifi_table");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching Wi-Fi entries:", error);
    res.status(500).json({ message: "Error fetching Wi-Fi entries" });
  }
});

routes.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM library_wifi_table WHERE wifi_id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Wi-Fi entry not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching Wi-Fi entry:", error);
    res.status(500).json({ message: "Error fetching Wi-Fi entry" });
  }
});

routes.post("/", async (req, res) => {
  const { wifi_name, wifi_password, wifi_security } = req.body;

  if (!wifi_name || !wifi_password || !wifi_security) {
    return res
      .status(400)
      .json({ message: "wifi_name, wifi_password, and wifi_security are required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO library_wifi_table (wifi_name, wifi_password, wifi_security) VALUES (?, ?, ?)",
      [wifi_name, wifi_password, wifi_security]
    );
    res.status(201).json({
      message: "Wi-Fi entry added",
      wifi_id: result.insertId,
    });
  } catch (error) {
    console.error("Error adding Wi-Fi entry:", error);
    res.status(500).json({ message: "Error adding Wi-Fi entry" });
  }
});

routes.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { wifi_name, wifi_password, wifi_security } = req.body;

  if (!wifi_name || !wifi_password || !wifi_security) {
    return res
      .status(400)
      .json({ message: "wifi_name, wifi_password, and wifi_security are required" });
  }

  try {
    const [result] = await pool.query(
      "UPDATE library_wifi_table SET wifi_name = ?, wifi_password = ?, wifi_security = ? WHERE wifi_id = ?",
      [wifi_name, wifi_password, wifi_security, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Wi-Fi entry not found" });
    }

    res.json({ message: "Wi-Fi entry updated" });
  } catch (error) {
    console.error("Error updating Wi-Fi entry:", error);
    res.status(500).json({ message: "Error updating Wi-Fi entry" });
  }
});

routes.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      "DELETE FROM library_wifi_table WHERE wifi_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Wi-Fi entry not found" });
    }

    res.json({ message: "Wi-Fi entry deleted" });
  } catch (error) {
    console.error("Error deleting Wi-Fi entry:", error);
    res.status(500).json({ message: "Error deleting Wi-Fi entry" });
  }
});

module.exports = routes;
