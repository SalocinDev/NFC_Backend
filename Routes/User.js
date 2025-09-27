const express = require("express");
const pool = require("../SQL/conn.js");

const routes = express.Router();

// Get all users
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT user_id,
             user_email,
             user_firstname,
             user_middlename,
             user_lastname,
             user_date_of_birth,
             user_gender,
             user_contact_number,
             user_category_id_fk,
             user_school,
             user_creation_time
      FROM library_user_table
      ORDER BY user_id ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

//available users
routes.get("/available-users", async (req, res) => {
  try {
    const [rows] = await pool.query(/* `
      SELECT u.user_id, CONCAT(u.user_firstname, ' ', u.user_lastname) AS full_name
      FROM library_user_table u
      WHERE u.user_id NOT IN (
          SELECT bb.user_id_fk
          FROM book_borrow_table bb
          LEFT JOIN book_returned_table br ON bb.borrow_id = br.borrow_id_fk
          WHERE br.date_returned IS NULL
      );
    ` */
      `SELECT 
      u.user_id, 
      CONCAT(u.user_firstname, ' ', u.user_lastname) AS full_name
      FROM library_user_table u;
      `);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "None Found for Users" });
    }

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching available users:", error);
    res.status(500).json({ success: false, message: error.message || error });
  }
});

// Get a single user
routes.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM library_user_table WHERE user_id = ?",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create new user
routes.post("/", async (req, res) => {
  try {
    const {
      user_email,
      user_password,
      user_firstname,
      user_middlename,
      user_lastname,
      user_date_of_birth,
      user_gender,
      user_contact_number,
      user_category,
      user_school,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO library_user_table
       (user_email, user_password, user_firstname, user_middlename, user_lastname,
        user_date_of_birth, user_gender, user_contact_number, user_category, user_school,
        user_password_salt, user_pfp_id_fk, nfc_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, '')`,
      [
        user_email,
        user_password,
        user_firstname,
        user_middlename,
        user_lastname,
        user_date_of_birth,
        user_gender,
        user_contact_number,
        user_category,
        user_school,
      ]
    );

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user
routes.put("/:id", async (req, res) => {
  try {
    const {
      user_firstname,
      user_middlename,
      user_lastname,
      user_gender,
      user_contact_number,
      user_category,
      user_school,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE library_user_table
       SET user_firstname=?, user_middlename=?, user_lastname=?,
           user_gender=?, user_contact_number=?, user_category=?, user_school=?
       WHERE user_id=?`,
      [
        user_firstname,
        user_middlename,
        user_lastname,
        user_gender,
        user_contact_number,
        user_category,
        user_school,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user
routes.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM library_user_table WHERE user_id=?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = routes;
