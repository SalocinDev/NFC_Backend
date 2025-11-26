const express = require("express");
const pool = require("../SQL/conn.js");
const routes = express.Router();

// get services sorted by most used with count
routes.get("/services/log", async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT 
                library_services_table.library_service_id, 
                library_services_table.library_service_name,
                COUNT(user_library_log.log_service_id_fk) AS count
            FROM library_services_table
            INNER JOIN user_library_log 
                ON library_services_table.library_service_id = user_library_log.log_service_id_fk
            GROUP BY library_services_table.library_service_id, library_services_table.library_service_name
            ORDER BY count DESC
            `);
        return res.json({ success: true, data: result });
    } catch (error) {
        console.log(error.message || error);
        return res.json({ success: false, message: error.message || error });
    }
});

routes.get("/users/count", async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT
                COUNT(user_id) as User_Count
            FROM library_user_table
            `);
        return res.json({ success: true, data: result });
    } catch (error) {
        return res.json({ success: false, message: error.message || error });
    }
});

routes.get("/services/count", async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT
                COUNT(library_service_id) as Service_Count
            FROM library_services_table
            `);
        return res.json({ success: true, data: result });
    } catch (error) {
        return res.json({ success: false, message: error.message || error });
    }
});

routes.get("/surveyfeedback/count", async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT
                COUNT(feedback_id) as Survey_Feedback_Count
            FROM library_survey_feedback
            `);
        return res.json({ success: true, data: result });
    } catch (error) {
        return res.json({ success: false, message: error.message || error });
    }
});

routes.get("/analytics/", async (req, res) => {
    try {
        const [mostUsed] = await pool.query(`
        SELECT 
            l.library_service_id,
            l.library_service_name,
            COUNT(u.log_service_id_fk) AS usage_count
        FROM library_services_table l
        LEFT JOIN user_library_log u 
            ON l.library_service_id = u.log_service_id_fk
        GROUP BY l.library_service_id, l.library_service_name
        ORDER BY usage_count DESC
        `);

        const [leastUsed] = await pool.query(`
        SELECT 
            l.library_service_id,
            l.library_service_name,
            COUNT(u.log_service_id_fk) AS usage_count
        FROM library_services_table l
        LEFT JOIN user_library_log u 
            ON l.library_service_id = u.log_service_id_fk
        GROUP BY l.library_service_id, l.library_service_name
        ORDER BY usage_count ASC
        `);

        const [highestRated] = await pool.query(`
        SELECT 
            l.library_service_id,
            l.library_service_name,
            AVG(f.feedback_rating) AS avg_rating,
            COUNT(f.feedback_id) AS total_feedback
        FROM library_services_table l
        LEFT JOIN library_survey_feedback f 
            ON l.library_service_id = f.service_id_fk
        GROUP BY l.library_service_id, l.library_service_name
        ORDER BY avg_rating DESC
        `);

        const [lowestRated] = await pool.query(`
        SELECT 
            l.library_service_id,
            l.library_service_name,
            AVG(f.feedback_rating) AS avg_rating,
            COUNT(f.feedback_id) AS total_feedback
        FROM library_services_table l
        LEFT JOIN library_survey_feedback f 
            ON l.library_service_id = f.service_id_fk
        GROUP BY l.library_service_id, l.library_service_name
        ORDER BY avg_rating ASC
        `);

        return res.json({
        success: true,
        mostUsed,
        leastUsed,
        highestRated,
        lowestRated,
        });

    } catch (error) {
        console.error(error.message || error);
        return res.json({ success: false, message: error.message || error });
    }
});

module.exports = routes;
