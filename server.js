// dito ang server logic
// todo: Routing

const express = require('express'); // express
const session = require("express-session"); // express-session
const { checkReader } = require('./NFC/checkReader'); // check if reader is connected
const { writeNFC } = require('./NFC/nfc_write'); // nfc wrtie function
const { readNFC }  = require('./NFC/nfc_read'); // nfc read function
const { loginVerify, NFCloginVerify } = require('./SQL/loginVerify');
const { getKey } = require("./Crypto/getKey");
const { getUserID, getUserID_NFC, getInfo } = require("./SQL/SQL-utils");
const bodyParser = require('body-parser'); // for json
const path = require('path'); // path module for node
const cors = require('cors'); // cors
const { corsOptions } = require('./CORS/corswhitelist')
const app = express(); // instantiate express
const port = 3000;

// prepare path
const indexHTML = path.join(__dirname, 'public', 'index.html');
const viteReactDist = path.join(__dirname, 'dist');
/* const viteReactHtml = path.join(__dirname, 'dist', 'index.html'); */
const allowedOrigins = [
  "http://localhost:5173", 
  "http://172.26.82.39:5173",     //Nick Laptop
  "http://172.26.71.43:5173",     //Nick Laptop (Debian)
  "http://172.26.13.248:5173",    //Nick PC
  "http://172.26.101.94:5173",    //Nick PC (Debian)
  "http://172.26.21.211:5173",    //JM PC
  "http://172.26.248.50:5173",    //Jed Laptop
  "http://172.26.216.153:5173",   //Jet Laptop (Debian)
  "http://172.23.80.1:5173/"      //idk who pero pc ko
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(bodyParser.json()); // ready json parser
app.use(session({
  name: 'anongginagawamodito',
  secret: getKey(),
  saveUninitialized: false,
  resave: false,
  cookie: {
    maxAge: 1000 * 60,
    httpOnly: true,
    secure: false
  }
}));
app.use(express.static(viteReactDist)); // to serve vite-react built files

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

app.post('/login-verify', async (req, res) => {
  try {
    const { name, password, hash } = req.body;

    // case 1: Username/password login
    if (name && password) {
      const result = await loginVerify({ name, password });

      if (!result.success) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const id = await getUserID(name);
      req.session.login = { userID: id };
      req.session.cookie.expires = new Date(Date.now() + 1000 * 60 * 60); // expires in 1 minute


      return res.status(200).json(result);  // { success: true, role: '...' }
    }

    // case 2: NFC login
    if (hash) {
      const result = await NFCloginVerify({ hash });

      if (!result.success) {
        return res.status(401).json({ error: 'Invalid NFC hash' });
      }

      const id = await getUserID_NFC(hash);
      req.session.login = { userID: id };
      req.session.cookie.expires = new Date(Date.now() + 1000 * 60 * 60); // expires in 1 minute


      return res.status(200).json(result);  // { success: true, role: '...' }
    }

    // if neither login method is provided
    return res.status(400).json({ error: 'Missing login credentials' });

  } catch (err) {
    console.error('Error in /login-verify:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/get-session', (req, res) => {
  console.log("Session data:", req.session);

  if (req.session?.login?.userID) {
    res.json({
      loggedIn: true,
      user: req.session.login.userID,
      sessionID: req.session.id
    });
  } else {
    console.log("No user logged in.");
    res.json({ loggedIn: false });
  }
});


app.post('/logout', (req, res) =>{
  req.session.destroy(err => {
    if (err) {
      console.error("Session destroy error:", err);
      return res.status(500).json({ success: false, message: "Could not log out" });
    }

    res.clearCookie("anongginagawamodito");
    res.json({ success: true });
  });
})

// assign port to listen
app.listen(port, /* ip, */ () => {
  console.log(`NFC server running at http://localhost:${port}`);
});