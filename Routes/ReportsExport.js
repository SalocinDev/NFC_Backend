const express = require("express");
const pool = require("../SQL/conn");

const routes = express.Router();

routes.get("/export", async (req, res) => {
  try {
    let { serviceIds, range, type, startDate, endDate } = req.query;

    const serviceIdArray = serviceIds ? serviceIds.split(",").map(Number) : [];
    let whereParts = [];
    let params = [];

    if (serviceIdArray.length > 0) {
      whereParts.push(
        `l.log_service_id_fk IN (${serviceIdArray.map(() => "?").join(",")})`
      );
      params.push(...serviceIdArray);
    }

    if (range === "custom" && startDate && endDate) {
      whereParts.push(`l.log_time BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const queries = {
      gender: `
        SELECT s.library_service_name, u.user_gender AS category, COUNT(*) AS total
        FROM user_library_log l
        JOIN library_user_table u ON l.user_id_fk = u.user_id
        JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
        ${whereClause}
        GROUP BY s.library_service_name, u.user_gender
      `,
      age: `
        SELECT s.library_service_name,
          CASE
            WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) < 12 THEN 'Children (<12 - Below)'
            WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 13 AND 21 THEN 'Adolescents (13-21)'
            WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 22 AND 35 THEN 'Young Adult (22-35)'
            WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 36 AND 59 THEN 'Adult (36-59)'
            ELSE 'Seniors (60 Above)'
          END AS category,
          COUNT(*) AS total
        FROM user_library_log l
        JOIN library_user_table u ON l.user_id_fk = u.user_id
        JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
        ${whereClause}
        GROUP BY s.library_service_name, category
      `,
      user_category: `
        SELECT s.library_service_name, c.user_category_name AS category, COUNT(*) AS total
        FROM user_library_log l
        JOIN library_user_table u ON l.user_id_fk = u.user_id
        JOIN user_category_table c ON u.user_category_id_fk = c.user_category_id
        JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
        ${whereClause}
        GROUP BY s.library_service_name, c.user_category_name
      `,
      user_school: `
        SELECT s.library_service_name, u.user_school AS category, COUNT(*) AS total
        FROM user_library_log l
        JOIN library_user_table u ON l.user_id_fk = u.user_id
        JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
        ${whereClause}
        GROUP BY s.library_service_name, u.user_school
      `
    };

    if (type === "all") {
      const results = {};
      for (let key of Object.keys(queries)) {
        const [rows] = await pool.query(queries[key], params);
        results[key] = rows;
      }
      return res.json(results);
    } else if (queries[type]) {
      const [rows] = await pool.query(queries[type], params);
      return res.json(rows);
    } else {
      return res.status(400).json({ error: "Invalid report type" });
    }
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to fetch report data", details: err.message });
  }
});

module.exports = routes;
