const express = require("express");
const pool = require("../SQL/conn.js");
const routes = express.Router();

/**
 * GET /UserLibraryLog
 * Fetches user activity logs with user & service info
 * Query params:
 *   searchType = "user" | "service" | "all"
 *   searchValue = string
 *   range = "all" | "today" | "week" | "month" | "custom"
 *   startDate, endDate = string (YYYY-MM-DD)
 */
routes.get("/", async (req, res) => {
  const {
    searchType = "all",
    searchValue = "",
    range = "all",
    startDate,
    endDate,
  } = req.query;

  try {
    let query = `
      SELECT 
        l.log_id,
        l.log_time,
        CONCAT(u.user_firstname, ' ', u.user_lastname) AS user_fullname,
        s.library_service_name AS service_name
      FROM user_library_log l
      LEFT JOIN library_user_table u 
        ON l.user_id_fk = u.user_id
      LEFT JOIN library_services_table s 
        ON l.log_service_id_fk = s.library_service_id
      WHERE 1=1
    `;
    const params = [];

    //Search Filter
    if (searchType === "user" && searchValue) {
      query += " AND (u.user_firstname LIKE ? OR u.user_lastname LIKE ?)";
      params.push(`%${searchValue}%`, `%${searchValue}%`);
    } else if (searchType === "service" && searchValue) {
      query += " AND s.library_service_name LIKE ?";
      params.push(`%${searchValue}%`);
    }

    //Date Range Filters
    if (range === "today") {
      query += " AND DATE(l.log_time) = CURDATE()";
    } else if (range === "week") {
      query += " AND YEARWEEK(l.log_time, 1) = YEARWEEK(CURDATE(), 1)";
    } else if (range === "month") {
      query +=
        " AND YEAR(l.log_time) = YEAR(CURDATE()) AND MONTH(l.log_time) = MONTH(CURDATE())";
    } else if (range === "custom" && startDate && endDate) {
      query += " AND DATE(l.log_time) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    query += " ORDER BY l.log_time DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Error fetching logs" });
  }
});

module.exports = routes;
