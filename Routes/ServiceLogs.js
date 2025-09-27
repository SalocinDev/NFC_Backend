const express = require("express")
const pool = require("../SQL/conn.js")
const { getBooks, getServicesPK, logServices } = require('../SQL/SQL-utils');

const routes = express.Router();

// Get all logs (with joined user + service info)
routes.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT l.log_id, l.log_time,
             l.user_id_fk AS user_id,
             u.user_firstname, u.user_lastname,
             l.log_service_id_fk AS service_id,
             s.library_service_name
      FROM user_library_log l
      LEFT JOIN library_user_table u ON l.user_id_fk = u.user_id
      LEFT JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
      ORDER BY l.log_time DESC
    `;
    const [rows] = await pool.query(sql)
    if (rows.length > 0) {
      res.json(rows[0] || null);
    } else {
      res.status(200).json({ success: false, message: "Database" })
    }
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Get single log by ID
routes.get("/:user_id", async (req, res) => {
  try {
    const sql = `
      SELECT 
        l.log_id,
        l.log_time,
        CONCAT(u.user_firstname, ' ', u.user_lastname) AS user_name,
        s.library_service_name AS service_name
      FROM user_library_log l
      LEFT JOIN library_user_table u 
        ON l.user_id_fk = u.user_id
      LEFT JOIN library_services_table s 
        ON l.log_service_id_fk = s.library_service_id
      WHERE l.user_id_fk = ?
      ORDER BY l.log_time DESC;
    `;
    const [rows] = await pool.query(sql, [req.params.user_id]);
    if (rows.length > 0) {
      res.status(200).json(rows);
    } else {
      res.status(404).json({ success: false, message: "No logs found" });
    }
  } catch (error) {
    console.error("Error fetching log:", error);
    res.status(500).json({ error: "Failed to fetch log" });
  }
});

routes.post('/', async (req, res) => {
  try {
    const { services } = req.body;
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ success: false, message: "No services provided" });
    }
    console.log("Services Availed:", services);
    const servicePK = await getServicesPK(services);
    const result = await logServices(servicePK, req.session.login.user_id);
    if (!result.success) {
      return res.status(400).json({ success: false, message: "Something went wrong" });
    }
    res.status(200).json({ success: true, loggedServices: result.loggedServices });
  } catch (error) {
    console.error("Error in /servicelogs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = routes;