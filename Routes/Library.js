const express = require('express');
const { getBooks, getServicesPK, logServices } = require('../SQL/SQL-utils');
const { writetoDB } = require('../SQL/sqlNFClogic');
const routes = express.Router();

routes.post('/get-books', async (req, res) => {
  try {
    const books = await getBooks();
    if (books.success) {
        const processed = books.data.map((row) => ({
            book_id: row.book_id,
            book_title: row.book_title,
            book_description: row.book_description
        }));
            res.status(200).json(processed);
    } else {
        res.status(500).json({ success: false, message: "No books found" });
    }
  } catch (error) {
        res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = routes;