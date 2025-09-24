const pool = require('./conn');
    
async function getTokenfromDB(hash) {
    try {
        const [rows] = await pool.query(
            'SELECT user_id, user_firstname, user_middlename, user_lastname, nfc_token FROM library_user_table WHERE nfc_token = ?',
            [hash]
    );
        if (rows.length > 0) {
            // console.log(rows[0]);
            console.log("Token Real");
            
            return { success: true, tokenReal: true, data: rows[0] };
    }     else {
            return { success: false, tokenReal: false };
    }
  
    } catch (err) {
        console.error('Error in getHashfromDB:', err);
        throw err;
    }
}

/* getHashfromDB("e226585688a7f2b269ac7bc638f4f637d782dfd63334dbf2eaae10ba55add83a") */

module.exports = {
    getTokenfromDB
};