const express = require('express');
const routes = express.Router();

const { checkReader } = require('../NFC/checkReader');
const { writeNFC } = require('../NFC/nfc_write');
const { readNFC } = require('../NFC/nfc_read');
const pool = require('../SQL/conn');
const { genRandom } = require('../Crypto/crypto-utils');

routes.post('/write', async (req, res) => {
  if (!checkReader()) {
    return res.status(503).json({ success: false, message: "No NFC reader attached" });
  }
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid or missing JSON payload' });
    }

    await writeNFC(payload);
    res.status(200).json({ success: true, message: 'NFC card written successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to write NFC card' });
  }
});

routes.post('/read', async (req, res) => {
  if (!checkReader()) {
    return res.status(503).json({ success: false, message: "No NFC reader attached" });
  }
  try {
    const data = await readNFC();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to read NFC card' });
  }
});

routes.post('/check-reader', (req, res) => {
  res.json({ connected: checkReader() });
});

routes.post("/token", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: "Missing user_id" });
    }
    const [userRows] = await pool.query(
      "SELECT user_firstname FROM library_user_table WHERE user_id = ?",
      [user_id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const user_firstname = userRows[0].user_firstname;

    const new_token = genRandom(2);
    const [updateResult] = await pool.query(
      "UPDATE library_user_table SET nfc_token = ? WHERE user_id = ?",
      [new_token, user_id]
    );
    if (updateResult.affectedRows === 0) {
      return res.status(400).json({ success: false, message: `Token failed to generate for user ${user_firstname}` });
    }

    res.status(200).json({ success: true, message: `Token successfully generated for ${user_firstname}!`, nfc_token: new_token });
  } catch (error) {
    console.error(error.message || error);
    res.status(500).json({success: false, message: error.message || error,});
  }
});

module.exports = routes;
