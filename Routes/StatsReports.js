const express = require("express")
const pool = require("../SQL/conn.js")
const routes = express.Router();


// OVERALL GENDER COUNT
routes.get("/overall/gender", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT user_gender AS label, COUNT(*) AS value
      FROM library_user_table
      GROUP BY user_gender
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching overall gender:", err);
    res.status(500).json({ error: "Failed to fetch overall gender stats" });
  }
});

// OVERALL USER CATEGORY COUNT
routes.get("/overall/category", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.user_category_name AS label, COUNT(*) AS value
      FROM library_user_table u
      LEFT JOIN user_category_table c ON u.user_category_id_fk = c.user_category_id
      GROUP BY c.user_category_name
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching overall category:", err);
    res.status(500).json({ error: "Failed to fetch overall category stats" });
  }
});

// OVERALL USER SCHOOL COUNT
routes.get("/overall/school", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT user_school AS label, COUNT(*) AS value
      FROM library_user_table
      WHERE user_school IS NOT NULL AND user_school <> ''
      GROUP BY user_school
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching overall school:", err);
    res.status(500).json({ error: "Failed to fetch overall school stats" });
  }
});

// USER SCHOOL PER SERVICE
routes.get("/service/:id/school", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT s.library_service_name, u.user_school AS label, COUNT(*) AS value
      FROM user_library_log l
      JOIN library_user_table u ON l.user_id_fk = u.user_id
      JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
      WHERE s.library_service_id = ?
      AND u.user_school IS NOT NULL AND u.user_school <> ''
      GROUP BY s.library_service_name, u.user_school
    `, [id]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching school per service:", err);
    res.status(500).json({ error: "Failed to fetch school per service stats" });
  }
});


//user age category
routes.get("/users/age", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        CASE
          WHEN TIMESTAMPDIFF(YEAR, user_date_of_birth, CURDATE()) < 12 THEN 'lower than 12'
          WHEN TIMESTAMPDIFF(YEAR, user_date_of_birth, CURDATE()) BETWEEN 13 AND 21 THEN '13-21'
          WHEN TIMESTAMPDIFF(YEAR, user_date_of_birth, CURDATE()) BETWEEN 22 AND 35 THEN '22-35'
          WHEN TIMESTAMPDIFF(YEAR, user_date_of_birth, CURDATE()) BETWEEN 36 AND 59 THEN '36-59'
          ELSE '60+'
        END AS age_group,
        COUNT(*) AS total_users
      FROM library_user_table
      GROUP BY age_group
      ORDER BY total_users DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users per age category:", err); z
    res.status(500).json({ error: "Failed to fetch users per age category" });
  }
});

//testtesttesttest


// AGE GROUPS PER SERVICE
routes.get("/service/:id/age", async (req, res) => {
  const { id } = req.params;
  const { range = "all", startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
          s.library_service_name,
          CASE
              WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) < 12 
                  THEN 'Children (<12 - Below)'
              WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 13 AND 21 
                  THEN 'Adolescents (13-21)'
              WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 22 AND 35 
                  THEN 'Young Adult (22-35)'
              WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 36 AND 59 
                  THEN 'Adult (36-59)'
              ELSE 'Seniors (60 Above)'
          END AS label,
          COUNT(*) AS value
      FROM user_library_log l
      JOIN library_user_table u ON l.user_id_fk = u.user_id
      JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
      WHERE s.library_service_id = ?
    `;
    const params = [id];

    if (range === "today") query += " AND DATE(l.log_time) = CURDATE()";
    else if (range === "week") query += " AND YEARWEEK(l.log_time, 1) = YEARWEEK(CURDATE(), 1)";
    else if (range === "month") query += " AND YEAR(l.log_time) = YEAR(CURDATE()) AND MONTH(l.log_time) = MONTH(CURDATE())";
    else if (range === "custom" && startDate && endDate) {
      query += " AND DATE(l.log_time) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    query += " GROUP BY s.library_service_name, label";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching age groups:", err);
    res.status(500).json({ error: "Failed to fetch age groups" });
  }
});

// GENDER PER SERVICE
routes.get("/service/:id/gender", async (req, res) => {
  const { id } = req.params;
  const { range = "all", startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
          s.library_service_name,
          u.user_gender AS label,
          COUNT(*) AS value
      FROM user_library_log l
      JOIN library_user_table u ON l.user_id_fk = u.user_id
      JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
      WHERE s.library_service_id = ?
    `;
    const params = [id];

    if (range === "today") query += " AND DATE(l.log_time) = CURDATE()";
    else if (range === "week") query += " AND YEARWEEK(l.log_time, 1) = YEARWEEK(CURDATE(), 1)";
    else if (range === "month") query += " AND YEAR(l.log_time) = YEAR(CURDATE()) AND MONTH(l.log_time) = MONTH(CURDATE())";
    else if (range === "custom" && startDate && endDate) {
      query += " AND DATE(l.log_time) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    query += " GROUP BY s.library_service_name, u.user_gender";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching gender stats:", err);
    res.status(500).json({ error: "Failed to fetch gender stats" });
  }
});

// USER CATEGORIES PER SERVICE
routes.get("/service/:id/category", async (req, res) => {
  const { id } = req.params;
  const { range = "all", startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
          s.library_service_name,
          c.user_category_name AS label,
          COUNT(*) AS value
      FROM user_library_log l
      JOIN library_user_table u ON l.user_id_fk = u.user_id
      JOIN user_category_table c ON u.user_category_id_fk = c.user_category_id
      JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
      WHERE s.library_service_id = ?
    `;
    const params = [id];

    if (range === "today") query += " AND DATE(l.log_time) = CURDATE()";
    else if (range === "week") query += " AND YEARWEEK(l.log_time, 1) = YEARWEEK(CURDATE(), 1)";
    else if (range === "month") query += " AND YEAR(l.log_time) = YEAR(CURDATE()) AND MONTH(l.log_time) = MONTH(CURDATE())";
    else if (range === "custom" && startDate && endDate) {
      query += " AND DATE(l.log_time) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    query += " GROUP BY s.library_service_name, c.user_category_name";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching category stats:", err);
    res.status(500).json({ error: "Failed to fetch category stats" });
  }
});

module.exports = routes;