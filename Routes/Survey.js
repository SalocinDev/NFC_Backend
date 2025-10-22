const express = require("express");
const pool = require("../SQL/conn.js");
const routes = express.Router();

//Get services availed today
routes.get("/services/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT s.library_service_id, s.library_service_name
       FROM user_library_log l
       JOIN library_services_table s
         ON l.log_service_id_fk = s.library_service_id
       WHERE l.user_id_fk = ? AND DATE(l.log_time) = CURDATE()`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching today's services:", err);
    res.status(500).json({ error: "Database query error" });
  }
});

//Submit survey (with duplication check)
routes.post("/submit", async (req, res) => {
  const { user_id, responses, comment } = req.body;

  try {
    const entries = Object.entries(responses);

    for (const [serviceId, rating] of entries) {
      //Check if user already submitted for this service today
      const [existing] = await pool.query(
        `SELECT feedback_id FROM library_survey_feedback
         WHERE user_id_fk = ? AND service_id_fk = ? 
         AND DATE(response_timestamp) = CURDATE()`,
        [user_id, serviceId]
      );

      if (existing.length > 0) {
        console.log(`Duplicate feedback detected for user ${user_id}, service ${serviceId}`);
        continue; // skip this service — already submitted
      }

      //Insert new feedback
      await pool.query(
        `INSERT INTO library_survey_feedback 
          (user_id_fk, service_id_fk, feedback_rating, comment, response_timestamp)
         VALUES (?, ?, ?, ?, NOW())`,
        [user_id, serviceId, rating, comment]
      );
    }

    res.json({ success: true, message: "Feedback recorded (duplicates ignored)" });
  } catch (err) {
    console.error("Error inserting survey feedback:", err);
    res.status(500).json({ success: false, message: "Database insert error" });
  }
});

/*Get all library services */
routes.get("/all-services", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT library_service_id, library_service_name 
       FROM library_services_table 
       WHERE library_service_status = 'active'`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ error: "Database query error" });
  }
});

/* 🟦 Helper: Build date condition */
function getDateCondition(range, start, end) {
  switch (range) {
    case "today":
      return "DATE(f.response_timestamp) = CURDATE()";
    case "week":
      return "YEARWEEK(f.response_timestamp, 1) = YEARWEEK(CURDATE(), 1)";
    case "month":
      return "MONTH(f.response_timestamp) = MONTH(CURDATE()) AND YEAR(f.response_timestamp) = YEAR(CURDATE())";
    case "custom":
      return `DATE(f.response_timestamp) BETWEEN '${start}' AND '${end}'`;
    default:
      return "1=1";
  }
}

/*Get report for a specific service */
routes.get("/report/:serviceId", async (req, res) => {
  const { serviceId } = req.params;
  const { range, start, end } = req.query;
  const dateCondition = getDateCondition(range, start, end);

  try {
    // Distribution (1–5)
    const [rows] = await pool.query(
      `
      SELECT r.rating, COUNT(f.feedback_id) AS total
      FROM (
        SELECT 1 AS rating UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
      ) r
      LEFT JOIN library_survey_feedback f 
        ON f.feedback_rating = r.rating 
        AND f.service_id_fk = ? 
        AND ${dateCondition}
      GROUP BY r.rating
      ORDER BY r.rating;
      `,
      [serviceId]
    );

    // Average rating for this service
    const [avg] = await pool.query(
      `
      SELECT 
        ROUND(AVG(f.feedback_rating), 2) AS avg_rating,
        COUNT(f.feedback_id) AS total_responses
      FROM library_survey_feedback f
      WHERE f.service_id_fk = ?
      AND ${dateCondition};
      `,
      [serviceId]
    );

    res.json({
      ratings: rows.map((r) => ({
        feedback_rating: r.rating,
        total: r.total,
      })),
      avg_rating: avg[0].avg_rating || 0,
      total_responses: avg[0].total_responses || 0,
    });
  } catch (err) {
    console.error("Error generating service report:", err);
    res.status(500).json({ error: "Database query error" });
  }
});

/* Get report for all services (no helper function)
routes.get("/report/all", async (req, res) => {
  const { range, start, end } = req.query;

  // Build date condition inline (no helper function)
  let dateCondition = "1=1"; // default (no filter)
  const today = "CURDATE()";
  const weekStart = "DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
  const monthStart = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";

  if (range === "today") {
    dateCondition = `DATE(f.response_timestamp) = ${today}`;
  } else if (range === "week") {
    dateCondition = `DATE(f.response_timestamp) BETWEEN ${weekStart} AND CURDATE()`;
  } else if (range === "month") {
    dateCondition = `DATE(f.response_timestamp) BETWEEN ${monthStart} AND CURDATE()`;
  } else if (range === "custom") {
    // validate custom dates
    if (!start || !end || isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
      return res.status(400).json({ error: "Invalid custom date range" });
    }
    dateCondition = `DATE(f.response_timestamp) BETWEEN '${start}' AND '${end}'`;
  }

  try {
    // Distribution (ratings 1–5 per service)
    const [rows] = await pool.query(
      `
      SELECT 
        s.library_service_id,
        s.library_service_name,
        r.rating,
        COUNT(f.feedback_id) AS total
      FROM (
        SELECT 1 AS rating UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
      ) r
      CROSS JOIN library_services_table s
      LEFT JOIN library_survey_feedback f 
        ON f.feedback_rating = r.rating 
        AND f.service_id_fk = s.library_service_id
        AND ${dateCondition}
      GROUP BY s.library_service_id, s.library_service_name, r.rating
      ORDER BY s.library_service_name, r.rating;
      `
    );

    // Average rating per service
    const [avgRows] = await pool.query(
      `
      SELECT 
        s.library_service_id,
        s.library_service_name,
        ROUND(AVG(f.feedback_rating), 2) AS avg_rating,
        COUNT(f.feedback_id) AS total_responses
      FROM library_services_table s
      LEFT JOIN library_survey_feedback f 
        ON f.service_id_fk = s.library_service_id
        AND ${dateCondition}
      GROUP BY s.library_service_id, s.library_service_name
      ORDER BY s.library_service_name;
      `
    );

    res.json({
      distribution: rows.map((r) => ({
        library_service_id: r.library_service_id,
        library_service_name: r.library_service_name,
        feedback_rating: r.rating,
        total: r.total,
      })),
      averages: avgRows.map((r) => ({
        library_service_id: r.library_service_id,
        library_service_name: r.library_service_name,
        avg_rating: r.avg_rating || 0,
        total_responses: r.total_responses || 0,
      })),
    });
  } catch (err) {
    console.error("Error generating all-service report:", err);
    res.status(500).json({ error: "Database query error" });
  }
});*/

module.exports = routes;