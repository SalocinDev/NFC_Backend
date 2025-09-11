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

/* const aiRoute = require('./Routes/AI') */

// prepare path
const indexHTML = path.join(__dirname, 'index.html');
const viteReactDist = path.join(__dirname, 'dist');
/* const viteReactHtml = path.join(__dirname, 'dist', 'index.html'); */
const allowedOrigins = [
  "https://phalluis.github.io",
  "https://seriously-trusting-octopus.ngrok-free.app",
  "http://localhost:3000",
  "http://localhost:5000"
];

// sessions storage. only exists in memory
const MemoryStore = session.MemoryStore;
const store = new MemoryStore();

// session details
app.set("trust proxy", 1); // trust ngrok / reverse proxy

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(bodyParser.json());

app.use(session({
  name: 'anongginagawamodito',
  secret: getKey(),
  saveUninitialized: false,
  resave: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
    secure: (req) => {
      if (process.env.NODE_ENV === 'production') {
        return req.headers['x-forwarded-proto'] === 'https';
      }
      return false; // local dev
    },
    sameSite: (req) => {
      if (process.env.NODE_ENV === 'production') {
        return req.headers['x-forwarded-proto'] === 'https' ? 'none' : 'lax';
      }
      return 'lax';
    }
  }
}));

app.use(express.static(viteReactDist)); // to serve vite-react built files

// routing
const nfcRoute = require('./Routes/NFC');
const accRoute = require('./Routes/Acc');
const sessionRoute = require('./Routes/Sessions')(store);
const libRoute = require('./Routes/Library');

app.use('/nfc', nfcRoute);
app.use('/acc', accRoute);
app.use('/session', sessionRoute);
app.use('/lib', libRoute);
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

app.listen(port, "0.0.0.0", () => {
  console.log(`NFC server running at ${port}`);
});