const express = require('express');
const routes = express.Router();

const { checkReader } = require('../NFC/checkReader');
const { writeNFC } = require('../NFC/nfc_write');
const { readNFC } = require('../NFC/nfc_read');

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
    res.status(500).send('Failed to read NFC card');
  }
});

routes.post('/check-reader', (req, res) => {
  res.json({ connected: checkReader() });
});

module.exports = routes;
