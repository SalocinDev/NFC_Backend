// dito ang server logic
// todo: Routing
require("dotenv").config();

const express = require('express'); // express
const session = require("express-session"); // express-session
const { getKey } = require("./Crypto/crypto-utils");
/* const { getOTP, generateOTPandStoreOTP } = require("./Crypto/OTP"); */
const bodyParser = require('body-parser'); // for json
const path = require('path'); // path module for node
const cors = require('cors'); // cors
/* const { corsOptions } = require('./CORS/corswhitelist') */
const app = express(); // instantiate express
const port = 3000;


// prepare path
const indexHTML = path.join(__dirname, 'index.html');
const viteReactDist = path.join(__dirname, 'dist');
/* const viteReactHtml = path.join(__dirname, 'dist', 'index.html'); */

const allowedOrigins = [
  "https://phalluis.github.io",
  "https://salocindev.github.io",
  "https://seriously-trusting-octopus.ngrok-free.app",
  "http://172.26.1.2:3000",
  "http://172.26.1.2:5000",
  "https://124.6.136.178"
];

// Dynamic CORS middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // curl / Postman
    if (allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Body parser
app.use(bodyParser.json());

// Session (after CORS)
/* app.use(session({
  name: 'anongginagawamodito',
  secret: process.env.SESSION_SECRET || 'shhhhhhhhhhhh',
  saveUninitialized: false,
  resave: true,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60, // 1 hour
    httpOnly: true,
    secure: true,
    sameSite: 'none'
    }
    })); */
    
  // sessions storage. only exists in memory
const MemoryStore = session.MemoryStore;
const store = new MemoryStore();

const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1); // required for secure cookies behind ngrok/proxies

app.use(session({
  name: "anongginagawamodito",
  secret: process.env.SESSION_SECRET || "shhhhhhhhhhhh",
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    httpOnly: true,
    secure: isProduction,                         // only true when prod (ngrok/github)
    sameSite: isProduction ? "none" : "lax",      // none for cross-site, lax for localhost
    maxAge: 1000 * 60 * 60                        // 1 hour
  }
}));

/* app.use(session({
  name: 'anongginagawamodito',
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
    secure: isProduction,          // true if production
    sameSite: isProduction ? "none" : "lax"
  }
})); */

app.use(express.static(viteReactDist)); // to serve vite-react built files

// routing
const nfcRoute = require('./Routes/NFC');
console.log("NFC route loaded");

const accRoute = require('./Routes/Acc');
console.log("Acc route loaded");

const sessionRoute = require('./Routes/Sessions')(store);
console.log("Session route loaded");

const libRoute = require('./Routes/Library');
console.log("Library route loaded");

const orvieRoute = require('./Routes/mysql-orvie');
console.log("Mysql Orvie route loaded");

/* const aiRoute = require('./Routes/AI') */

app.use('/nfc', nfcRoute);
app.use('/acc', accRoute);
app.use('/session', sessionRoute);
app.use('/lib', libRoute);
app.use('/orv', orvieRoute);
/* app.use('/ai', aiRoute); */

// main page for debugging
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

app.get('/status', (req, res) => {
  const headers = req.headers;
  const origin = req.get('origin');

  res.status(200).json({ 
    success: true, 
    system: "online",
    headers, 
    origin
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`NFC server running at ${port}`);
});