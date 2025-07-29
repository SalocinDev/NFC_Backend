// server.js
// dito ang server logic

const express = require('express'); // express
const { checkReader } = require('./NFC/checkReader'); // check if reader is connected
const { writeNFC } = require('./NFC/nfc_write'); // nfc wrtie function
const { readNFC }  = require('./NFC/nfc_read'); // nfc read function
const { loginVerify, NFCloginVerify } = require('./loginVerify');
const bodyParser = require('body-parser'); // for json
const path = require('path'); // path module for node
const cors = require('cors'); // cors
const app = express(); // instantiate express
/* const ip = "172.26.82.39"; */
const port = 3000;

// prepare path
const indexHTML = path.join(__dirname, 'public', 'index.html');
const viteReactDist = path.join(__dirname, 'dist');
const viteReactHtml = path.join(__dirname, 'dist', 'index.html');

app.use(cors()); // for development, opens all origins
app.use(express.static(viteReactDist)); // to serve vite-react built files
app.use(bodyParser.json()); // ready json parser

// make express js api end point at /write-nfc
app.post('/write-nfc', async (req, res) => {  
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


// same with /write-nfc api endpoint
app.get('/read-nfc', async (req, res) => {
  try {
    const data = await readNFC();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to read NFC card');
  }
});

// to check if reader is connected (for debugging)
app.get('/check-reader', (req, res) => {
  const isConnected = checkReader();
  res.json({ connected: isConnected });
});

// main page for nfc
app.get('/view', (req, res) => {
  res.sendFile(indexHTML, err =>{
    if (err){
      console.log('Error serving file'+ err);
      res.status(err.status || 500).send('Error serving file');
    } else {
      console.log('File Served');
    }
  });
});

app.get('/test-vitereact', (req, res) =>{
  res.sendFile(viteReactHtml, err =>{
    if (err){
      console.log('Error serving file'+ err);
      res.status(err.status || 500).send('Error serving file');
    } else {
      console.log('File served from vite/react to express/node');
    }
  });
})


app.post('/login-verify', async (req, res) => {
  try {
    const { name, password, hash } = req.body;

    // case 1: Username/password login
    if (name && password) {
      const result = await loginVerify({ name, password });

      if (!result.success) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(200).json(result);  // { success: true, role: '...' }
    }

    // case 2: NFC login
    if (hash) {
      const result = await NFCloginVerify({ hash });

      if (!result.success) {
        return res.status(401).json({ error: 'Invalid NFC hash' });
      }

      return res.status(200).json(result);  // { success: true, role: '...' }
    }

    // if neither login method is provided
    return res.status(400).json({ error: 'Missing login credentials' });

  } catch (err) {
    console.error('Error in /login-verify:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// assign port to listen
app.listen(port, /* ip, */ () => {
  console.log(`NFC server running at http://localhost:${port}`);
});