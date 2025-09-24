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
  "http://172.26.1.2:5001",
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
const environment = process.env.NODE_ENV;

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

const apiUrl = isProduction
  ? "https://seriously-trusting-octopus.ngrok-free.app"
  : "http://172.26.1.2:5000";

// CSP middleware
app.use((req, res, next) => {
  if (isProduction) {
    res.setHeader(
      "Content-Security-Policy",
      [
        `default-src 'self' ${apiUrl} https://salocindev.github.io https://phalluis.github.io`,
        `script-src 'self' ${apiUrl} https://salocindev.github.io https://phalluis.github.io 'nonce-abc123'`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `font-src 'self' https://fonts.gstatic.com`,
        `img-src 'self' ${apiUrl} data:`,
        `connect-src 'self' ${apiUrl}`,
        `object-src 'none'`
      ].join("; ")
    );
  } else {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' * data: blob:;"
    );
  }

  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");

  next();
});

/* app.use(express.static(viteReactDist)); // to serve vite-react built files */

// routing
const nfcRoute = require('./Routes/NFC');
console.log("NFC route loaded: /nfc");

const accRoute = require('./Routes/Acc');
console.log("Acc route loaded: /acc");

const sessionRoute = require('./Routes/Sessions')(store);
console.log("Session route loaded: session");

const libRoute = require('./Routes/Library');
console.log("Library route loaded: /lib");

const fileRoute= require('./Routes/File');
console.log("File route loaded: /file");

const booksRoute = require('./Routes/Books');
console.log("Books route loaded: /books");

const categoriesRoute = require('./Routes/Categories');
console.log("Categories route loaded: /categories");

const borrowingRoute = require('./Routes/Borrowing');
console.log("Borrowing route loaded: /borrowing");

const returningRoute = require('./Routes/Returning');
console.log("Returning route loaded: /returning");

const servicelogsRoute = require('./Routes/ServiceLogs');
console.log("ServiceLogs route loaded: /servicelogs");

const userRoute = require('./Routes/User');
console.log("User route loaded: /user");

const aiRoute = require('./Routes/AI')
console.log("AI route loaded: /ai")

app.use('/nfc', nfcRoute);
app.use('/acc', accRoute);
app.use('/session', sessionRoute);
app.use('/lib', libRoute);
app.use('/file', fileRoute); 
app.use('/books', booksRoute);
app.use('/categories', categoriesRoute);
app.use('/borrowing', borrowingRoute);
app.use('/returning', returningRoute);
app.use('/servicelogs', servicelogsRoute);
app.use('/user', userRoute);
app.use('/ai', aiRoute);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* app.use(express.static(viteReactDist)); */
// test test

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
  console.log(`Server Mode: ${environment}`);
  console.log(`Server running at ${port}`);
});