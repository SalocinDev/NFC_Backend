const express = require('express');
const router = express.Router();
const pool = require('../SQL/conn');

//pre sa routes dapat ito VVV
//ang mga nasa SQL folder ay sql functions lang
//nich sa list ng book to sa book table
router.post('/', async (req, res) => {
    try{
        const [rows] = await pool.query("SELECT * FROM book_table");
        res.status(200).json({ success: true, data: rows[0] });
    }
    catch(err){
        console.error(err);
        res.status(500).json({ success: false, error:"FAILLLEDDD" });
  }
});

//para sa button to doon sa booktable hindi pa tapos
router.post("/:bookid", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT book_id, book_title, book_author FROM book_table WHERE book_id = ?", [req.params.bookid]);
        if (rows.lenght === 0){
            return res.status(404).json({ succsess: false, error: "Book is in the void"});
        }
        res.status(200).json({ success: true, data: rows[0] });
    }catch (err){
        console.error(err);
        res.status(500).json({ success: false, error:"FAILLLEDDD" });
    }
});


//insert book
router.post('/', async (req, res) => {
    const { book_title_fe, book_img_fe, book_author_fe, book_description_fe, book_publisher_fe, book_year_publish_fe, book_status_fe, book_inventory_fe} = res.body;
    if(!book_title_fe || !book_img_fe || !book_author_fe || !book_description_fe || !book_publisher_fe || !book_year_publish_fe || !book_status_fe || !book_inventory_fe) return res.status(400).json({error: "put all books information"});
    
    try{
        const [rows] = await pool.query("INSERT INTO books_table (book_title, book_img, book_author, book_author, book_description, book_publisher, book_year_publish, book_status, book_inventory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        res.status(200).json({ success: true, data: rows });
    }
    catch(err){ 
        console.error(err);
        res.status(500).json({ success: false, error:"FAILLLEDDD" });
  }
});

//update
router.put('/', async (req, res) => {
    const { book_title_fe, book_img_fe, book_author_fe, book_description_fe, book_publisher_fe, book_year_publish_fe, book_status_fe, book_inventory_fe} = res.body;
    if(!book_title_fe || !book_img_fe || !book_author_fe || !book_description_fe || !book_publisher_fe || !book_year_publish_fe || !book_status_fe || !book_inventory_fe) return res.status(400).json({error: "put all books information"});
    
    try{
        const [rows] = await pool.query("INSERT INTO books_table (book_title, book_img, book_author, book_author, book_description, book_publisher, book_year_publish, book_status, book_inventory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        res.status(200).json({ success: true, data: rows });
    }
    catch(err){ 
        console.error(err);
        res.status(500).json({ success: false, error:"FAILLLEDDD" });
  }
});

//delete



/* router.delete(); */



//SERVICE
//INSERT






module.exports = router;