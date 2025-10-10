const express = require("express");
const pool = require("../SQL/conn.js");
const multer = require("multer");
const path = require("path");

const routes = express.Router();

// Allowed file types
const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Multer storage with safe filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads")); // safe absolute path
  },
  filename: function (req, file, cb) {
    const safeName = path.basename(file.originalname); // prevent traversal
    cb(null, Date.now() + "-" + safeName.replace(/\s+/g, "_"));
  },
});

// Multer filter for type checking
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed!"), false);
  }
};

// Multer middleware with size limit (5 MB)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Sanitizer for text input
const sanitize = (str) =>
  str ? str.replace(/<[^>]*>?/gm, "").trim() : null;

// Add book route
routes.post("/", upload.single("cover"), async (req, res) => {
  try {
    const {
      book_title,
      book_author,
      book_description,
      book_publisher,
      book_year_publish,
      book_category_id_fk,
      book_status,
      book_inventory,
    } = req.body;

    const coverFile = req.file ? `uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO book_table 
      (book_title, book_cover_img, book_author, book_description, book_publisher, book_year_publish, book_category_id_fk, book_status, book_inventory, book_view_count) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        sanitize(book_title),
        coverFile,
        sanitize(book_author),
        sanitize(book_description),
        sanitize(book_publisher),
        book_year_publish,
        book_category_id_fk || null,
        book_status,
        book_inventory,
      ]
    );

    res.json({ success: true, book_id: result.insertId });
  } catch (err) {
    console.error("Error adding book:", err);
    res.status(500).json({ error: err.message || "Failed to add book" });
  }
});

// Get all books with category name
routes.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b.book_id,
        b.book_title,
        b.book_cover_img,
        b.book_author,
        b.book_description,
        b.book_publisher,
        b.book_year_publish,
        b.book_status,
        b.book_inventory,
        b.book_view_count,
        c.book_category_name AS book_category
      FROM book_table b
      LEFT JOIN book_category_table c 
        ON b.book_category_id_fk = c.book_category_id
    `);
    res.json(rows);
  } catch (err) {
    console.error("SQL ERROR in GET /opac:", err);
    res.status(500).json({ error: "Database error", details: err.sqlMessage || err.message });
  }
});

routes.get("/search", async (req, res) => {
  try {
    const {
      q = "",
      type = "keyword", // keyword | title | author
      category = "all",
      startDate,
      endDate,
      sort = "title-asc",
    } = req.query;

    // Base SQL
    let sql = `
      SELECT 
        b.book_id,
        b.book_title,
        b.book_author,
        b.book_description,
        b.book_publisher,
        b.book_year_publish,
        b.book_cover_img,
        b.book_status,
        b.book_view_count,
        c.book_category_name AS book_category,
        (
          (b.book_title LIKE ?) * 3 + 
          (b.book_author LIKE ?) * 2 + 
          (b.book_publisher LIKE ?) * 1
        ) AS relevance_score
      FROM book_table b
      LEFT JOIN book_category_table c 
        ON b.book_category_id_fk = c.book_category_id
      WHERE 1=1
    `;

    const params = [`%${q}%`, `%${q}%`, `%${q}%`];

    // Search by type
    if (q.trim()) {
      if (type === "title") {
        sql += " AND b.book_title LIKE ?";
        params.push(`%${q}%`);
      } else if (type === "author") {
        sql += " AND b.book_author LIKE ?";
        params.push(`%${q}%`);
      } else {
        sql +=
          " AND (b.book_title LIKE ? OR b.book_author LIKE ? OR b.book_publisher LIKE ?)";
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
    }

    // Category filter
    if (category !== "all") {
      sql += " AND c.book_category_name = ?";
      params.push(category);
    }

    // Date filter
    if (startDate && endDate) {
      sql += " AND b.book_year_publish BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else if (startDate || endDate) {
      return res
        .status(400)
        .json({ error: "Both start and end dates are required." });
    }

    // Sorting logic
    switch (sort) {
      case "relevance":
        sql += " ORDER BY relevance_score DESC, b.book_title ASC";
        break;
      case "title-asc":
        sql += " ORDER BY b.book_title ASC";
        break;
      case "title-desc":
        sql += " ORDER BY b.book_title DESC";
        break;
      case "author-asc":
        sql += " ORDER BY b.book_author ASC";
        break;
      case "author-desc":
        sql += " ORDER BY b.book_author DESC";
        break;
      case "views-asc":
        sql += " ORDER BY b.book_view_count ASC";
        break;
      case "views-desc":
        sql += " ORDER BY b.book_view_count DESC";
        break;
      case "pub-recent":
        sql += " ORDER BY b.book_year_publish DESC";
        break;
      case "pub-oldest":
        sql += " ORDER BY b.book_year_publish ASC";
        break;
      default:
        sql += " ORDER BY b.book_title ASC";
        break;
    }

    //console.log("🟦 Final SQL:\n", sql);
    //console.log("🟨 Params:", params);

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});






//top viewed books
routes.get("/top-viewed", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b.book_id,
        b.book_title,
        b.book_cover_img,
        b.book_author,
        b.book_view_count,
        c.book_category_name AS book_category
      FROM book_table b
      LEFT JOIN book_category_table c
        ON b.book_category_id_fk = c.book_category_id
      ORDER BY b.book_view_count DESC
      LIMIT 10
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching top viewed books:", err);
    res.status(500).json({ error: "Failed to fetch top viewed books" });
  }
});


//Recently Added Books
routes.get("/recent", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         b.book_id,
         b.book_title,
         b.book_cover_img,
         b.book_author,
         b.book_description,
         b.book_publisher,
         b.book_year_publish,
         b.book_status,
         b.book_inventory,
         c.book_category_name AS book_category
       FROM book_table b
       LEFT JOIN book_category_table c 
         ON b.book_category_id_fk = c.book_category_id
       ORDER BY b.book_id DESC
       LIMIT 10`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching recent books:", err);
    res.status(500).json({ error: "Failed to fetch recently added books" });
  }
});


//Random Books
routes.get("/random", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         b.book_id,
         b.book_title,
         b.book_cover_img,
         b.book_author,
         b.book_description,
         b.book_publisher,
         b.book_year_publish,
         b.book_status,
         b.book_inventory,
         c.book_category_name AS book_category
       FROM book_table b
       LEFT JOIN book_category_table c 
         ON b.book_category_id_fk = c.book_category_id
       ORDER BY RAND()
       LIMIT 10`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching random books:", err);
    res.status(500).json({ error: "Failed to fetch random books" });
  }
});

//SIMILAR BOOKS UNDER RTHE BOOK DETAILS
routes.get("/similar", async (req, res) => {
  try {
    const { category, exclude } = req.query;

    if (!category) {
      return res.status(400).json({ error: "Missing category" });
    }

    const [rows] = await pool.query(
      `SELECT 
         b.book_id,
         b.book_title,
         b.book_cover_img,
         b.book_author,
         c.book_category_name AS book_category
       FROM book_table b
       LEFT JOIN book_category_table c 
         ON b.book_category_id_fk = c.book_category_id
       WHERE c.book_category_name = ? 
         AND b.book_id != ?
       ORDER BY b.book_view_count DESC
       LIMIT 8`,
      [category, exclude || 0]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching similar books:", err);
    res.status(500).json({ error: "Failed to fetch similar books" });
  }
});

// Routes/Opac.js
routes.post("/get-books", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM book_table");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// GET /opac/book/:id
routes.get("/book/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, c.book_category_name
       FROM book_table b
       LEFT JOIN book_category_table c
       ON b.book_category_id_fk = c.book_category_id
       WHERE b.book_id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Book not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Book detail error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Get a single book by ID with category name
routes.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const [rows] = await pool.query(`
      SELECT 
        b.book_id,
        b.book_title,
        b.book_cover_img,
        b.book_author,
        b.book_description,
        b.book_publisher,
        b.book_year_publish,
        b.book_status,
        b.book_inventory,
        b.book_view_count,
        c.book_category_name AS book_category
      FROM book_table b
      LEFT JOIN book_category_table c 
        ON b.book_category_id_fk = c.book_category_id
      WHERE b.book_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("SQL ERROR in GET /opac/:id:", err);
    res.status(500).json({ error: "Database error", details: err.sqlMessage || err.message });
  }
});

// Increment view count
routes.post("/:id/view", async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    await pool.query(
      "UPDATE book_table SET book_view_count = book_view_count + 1 WHERE book_id = ?",
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error incrementing view count:", err);
    res.status(500).json({ error: "Failed to update view count" });
  }
});



module.exports = routes;
