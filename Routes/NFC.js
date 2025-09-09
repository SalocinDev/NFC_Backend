const express = require('express');
const routes = express.Router();

let readerConnected = false;
let checkReader, writeNFC, readNFC;

try {
  checkReader = require('../NFC/checkReader').checkReader;
  writeNFC = require('../NFC/nfc_write').writeNFC;
  readNFC = require('../NFC/nfc_read').readNFC;

  readerConnected = checkReader();
} catch (err) {
  console.warn("No NFC reader detected or pcsclite not available:", err.message);
  readerConnected = false;
}

if (readerConnected) {
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

  routes.get('/read', async (req, res) => {
    try {
      const data = await readNFC();
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).send('Failed to read NFC card');
    }
  });

  routes.get('/check-reader', (req, res) => {
    res.json({ connected: checkReader() });
  });

} else {
  routes.all(['/', '/write', '/read', '/check-reader'], (req, res) => {
    res.status(503).json({ success: false, message: "No NFC reader attached" });
  });
}

module.exports = routes;
