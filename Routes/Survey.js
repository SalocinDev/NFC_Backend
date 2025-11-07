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

//Check if user already submitted a survey today
routes.get("/has-submitted/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM library_survey_feedback
      WHERE user_id_fk = ?
        AND DATE(response_timestamp) = CURDATE()
      `,
      [user_id]
    );

    const hasSubmitted = rows[0].count > 0;
    res.json({ hasSubmitted });
  } catch (err) {
    console.error("Error checking survey submission:", err);
    res.status(500).json({ error: "Database error" });
  }
});

//Get services the user has NOT yet submitted feedback for today
routes.get("/available-services/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT s.library_service_id, s.library_service_name
      FROM user_library_log l
      JOIN library_services_table s
        ON l.log_service_id_fk = s.library_service_id
      WHERE l.user_id_fk = ?
        AND DATE(l.log_time) = CURDATE()
        AND s.library_service_id NOT IN (
          SELECT service_id_fk
          FROM library_survey_feedback
          WHERE user_id_fk = ?
          AND DATE(response_timestamp) = CURDATE()
        )
      `,
      [userId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching available services:", err);
    res.status(500).json({ error: "Database query error" });
  }
});


// Submit survey (must rate ALL services before commenting)
routes.post("/submit", async (req, res) => {
  const { user_id, responses, comment } = req.body;

  try {
    //Fetch all services the user availed today
    const [todayServices] = await pool.query(
      `
      SELECT DISTINCT l.log_service_id_fk AS service_id, s.library_service_name
      FROM user_library_log l
      JOIN library_services_table s 
        ON s.library_service_id = l.log_service_id_fk
      WHERE l.user_id_fk = ? 
        AND DATE(l.log_time) = CURDATE()
      `,
      [user_id]
    );

    if (todayServices.length === 0) {
      return res.status(400).json({
        success: false,
        message: "You have no logged services today.",
      });
    }

    const totalServices = todayServices.length;

    //Find services not rated
    const ratedServiceIds = Object.keys(responses).filter(
      (key) => responses[key] !== null && responses[key] !== undefined && responses[key] !== ""
    );

    const unratedServices = todayServices.filter(
      (svc) => !ratedServiceIds.includes(String(svc.service_id))
    );

    //If user is trying to comment but missed rating any service
    if (comment && unratedServices.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You must rate all the services you availed today before submitting a comment.",
        missingServices: unratedServices.map((svc) => ({
          id: svc.service_id,
          name: svc.library_service_name,
        })),
      });
    }

    //Check if user already commented today
    if (comment) {
      const [existingComment] = await pool.query(
        `
        SELECT c.library_survey_feedback_comment_id
        FROM library_survey_feedback_comment c
        JOIN library_survey_feedback f 
          ON f.library_survey_feedback_comment_id_fk = c.library_survey_feedback_comment_id
        WHERE f.user_id_fk = ?
          AND DATE(f.response_timestamp) = CURDATE()
          AND c.library_survey_comment IS NOT NULL
        `,
        [user_id]
      );

      if (existingComment.length > 0) {
        return res.status(400).json({
          success: false,
          message: "You have already submitted a comment today.",
        });
      }
    }

    //Insert feedback for each rated service (skip duplicates)
    let insertedCount = 0;

    for (const [serviceId, rating] of Object.entries(responses)) {
      if (!rating) continue;

      const [existing] = await pool.query(
        `
        SELECT feedback_id FROM library_survey_feedback
        WHERE user_id_fk = ? AND service_id_fk = ?
          AND DATE(response_timestamp) = CURDATE()
        `,
        [user_id, serviceId]
      );

      if (existing.length > 0) continue; // skip duplicates

      await pool.query(
        `
        INSERT INTO library_survey_feedback 
          (user_id_fk, service_id_fk, feedback_rating, response_timestamp)
        VALUES (?, ?, ?, NOW())
        `,
        [user_id, serviceId, rating]
      );
      insertedCount++;
    }

    //If user rated all and gave a comment → save comment
    if (comment && unratedServices.length === 0) {
      const [commentResult] = await pool.query(
        `
        INSERT INTO library_survey_feedback_comment (library_survey_comment)
        VALUES (?)
        `,
        [comment]
      );
      const commentId = commentResult.insertId;

      await pool.query(
        `
        UPDATE library_survey_feedback 
        SET library_survey_feedback_comment_id_fk = ?
        WHERE user_id_fk = ?
          AND DATE(response_timestamp) = CURDATE()
        `,
        [commentId, user_id]
      );
    }

    //Response message
    res.json({
      success: true,
      message:
        comment && unratedServices.length === 0
          ? "All services rated and comment submitted successfully."
          : insertedCount > 0
            ? "Feedback submitted successfully."
            : "No new feedback submitted (duplicates ignored).",
      missingServices: unratedServices.length > 0 ? unratedServices : [],
    });
  } catch (err) {
    console.error("Error submitting survey:", err);
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

/*Helper: Build date condition */
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

/* Get comments for a specific service */
routes.get("/comments/:serviceId", async (req, res) => {
  const { serviceId } = req.params;
  const { range, start, end } = req.query;
  const dateCondition = getDateCondition(range, start, end);

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        f.feedback_id,
        f.user_id_fk,
        s.library_service_name,
        f.feedback_rating,
        c.library_survey_comment AS comment,
        f.response_timestamp
      FROM library_survey_feedback f
      LEFT JOIN library_survey_feedback_comment c
        ON f.library_survey_feedback_comment_id_fk = c.library_survey_feedback_comment_id
      LEFT JOIN library_services_table s
        ON f.service_id_fk = s.library_service_id
      WHERE f.service_id_fk = ?
        AND ${dateCondition}
        AND c.library_survey_comment IS NOT NULL
        AND c.library_survey_comment <> ''
      ORDER BY f.response_timestamp DESC;
      `,
      [serviceId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Database query error" });
  }
});


/* Get all comments (generalized, across all services) */
routes.get("/comments-all", async (req, res) => {
  const { range, start, end } = req.query;
  const dateCondition = getDateCondition(range, start, end);

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        f.feedback_id,
        f.user_id_fk,
        s.library_service_name,
        f.feedback_rating,
        c.library_survey_comment AS comment,
        f.response_timestamp
      FROM library_survey_feedback f
      LEFT JOIN library_survey_feedback_comment c
        ON f.library_survey_feedback_comment_id_fk = c.library_survey_feedback_comment_id
      LEFT JOIN library_services_table s
        ON f.service_id_fk = s.library_service_id
      WHERE ${dateCondition}
        AND c.library_survey_comment IS NOT NULL
        AND c.library_survey_comment <> ''
      ORDER BY f.response_timestamp DESC;
      `
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching all comments:", err);
    res.status(500).json({ error: "Database query error" });
  }
});

// POST /survey/report
routes.post("/report", async (req, res) => {
  const { serviceIds, range, startDate, endDate } = req.body;

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

  const dateCondition = getDateCondition(range, startDate, endDate);
  const serviceFilter = serviceIds?.length
    ? `AND s.library_service_id IN (${serviceIds.join(",")})`
    : "";

  try {
    //Fetch detailed ratings
    const [details] = await pool.query(
      `
      SELECT 
        s.library_service_id,
        s.library_service_name,
        f.feedback_rating,
        f.response_timestamp
      FROM library_survey_feedback f
      JOIN library_services_table s 
        ON f.service_id_fk = s.library_service_id
      WHERE ${dateCondition} ${serviceFilter}
      ORDER BY s.library_service_name, f.response_timestamp DESC;
      `
    );

    //Fetch summarized averages
    const [summary] = await pool.query(
      `
      SELECT 
        s.library_service_id,
        s.library_service_name,
        ROUND(AVG(f.feedback_rating), 2) AS avg_rating,
        COUNT(f.feedback_id) AS total_responses
      FROM library_survey_feedback f
      JOIN library_services_table s 
        ON f.service_id_fk = s.library_service_id
      WHERE ${dateCondition} ${serviceFilter}
      GROUP BY s.library_service_id;
      `
    );

    res.json({ details, summary });
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ error: "Database query error" });
  }
});



module.exports = routes;