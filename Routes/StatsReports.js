const express = require("express")
const pool = require("../SQL/conn.js")
const routes = express.Router();


//OVERALL  total user
routes.get("/users/total", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS total_users FROM library_user_table");
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching total users:", err);
    res.status(500).json({ error: "Failed to fetch total users" });
  }
});

//OVERALL user gender
routes.get("/users/gender", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT user_gender, COUNT(*) AS total_users
      FROM library_user_table
      GROUP BY user_gender
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching male/female users:", err);
    res.status(500).json({ error: "Failed to fetch male/female users" });
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

//user gender per category
routes.get("/services/gender-totals", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.library_service_name,
        CASE
          WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) < 12 THEN '<12'
          WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 13 AND 21 THEN '13-21'
          WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 22 AND 35 THEN '22-35'
          WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 36 AND 59 THEN '36-59'
          ELSE '60+'
        END AS age_group,
        COUNT(*) AS total_users
      FROM user_library_log l
      JOIN library_user_table u ON l.user_id_fk = u.user_id
      JOIN library_services_table s ON l.log_service_id_fk = s.library_service_id
      GROUP BY s.library_service_name, age_group
      ORDER BY s.library_service_name, age_group;
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching gender totals per service:", err);
    res.status(500).json({ error: "Failed to fetch gender totals per service" });
  }
});

//user per user category
routes.get("/users/category", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
          c.user_category_name,
          COUNT(u.user_id) AS total_users
      FROM library_user_table u
      JOIN user_category_table c 
          ON u.user_category_id_fk = c.user_category_id
      GROUP BY c.user_category_id, c.user_category_name
      ORDER BY total_users DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users per category:", err);
    res.status(500).json({ error: "Failed to fetch users per category" });
  }
});

//

//user age group per service
routes.get("/service/:id/age", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
          s.library_service_name,
          CASE
              WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) < 12 THEN '<12'
              WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 13 AND 21 THEN '13-21'
              WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 22 AND 35 THEN '22-35'
              WHEN TIMESTAMPDIFF(YEAR, u.user_date_of_birth, CURDATE()) BETWEEN 36 AND 59 THEN '36-59'
              ELSE '60+'
          END AS age_group,
          COUNT(*) AS total_users
      FROM user_library_log l
      JOIN library_user_table u 
          ON l.user_id_fk = u.user_id
      JOIN library_services_table s 
          ON l.log_service_id_fk = s.library_service_id
      WHERE s.library_service_id = ?
      GROUP BY s.library_service_name, age_group
      ORDER BY FIELD(age_group, '<12', '13-21', '22-35', '36-59', '60+')
    `, [id]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching age group per service:", err);
    res.status(500).json({ error: "Failed to fetch age group per service" });
  }
});


//per category use stats
//today
//week
//month
//year

module.exports = routes;