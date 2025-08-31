const express = require('express');
const routes = express.Router();

const { checkReader } = require('../NFC/checkReader'); // check if reader is connected
const { writeNFC } = require('../NFC/nfc_write'); // nfc wrtie function
const { readNFC }  = require('../NFC/nfc_read'); // nfc read function
const { genRandom }  = require('../Crypto/crypto-utils');

// make express js api end point at /write
routes.post('/write', async (req, res) => {  
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


// same with /write api endpoint
routes.get('/read', async (req, res) => {
  try {
    const data = await readNFC();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to read NFC card');
  }
});

// to check if reader is connected (for debugging)
routes.get('/check-reader', (req, res) => {
  const isConnected = checkReader();
  res.json({ connected: isConnected });
});

module.exports = routes;
