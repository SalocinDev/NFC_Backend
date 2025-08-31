// dito ang server logic
// todo: Routing

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
const indexHTML = path.join(__dirname, 'public', 'index.html');
const viteReactDist = path.join(__dirname, 'dist');
/* const viteReactHtml = path.join(__dirname, 'dist', 'index.html'); */
const allowedOrigins = [
  "http://localhost:3000",
  "http://172.26.13.248:3000",
  "http://localhost:5000", 
  "http://172.26.82.39:5000",     //Nick Laptop
  "http://172.26.71.43:5000",     //Nick Laptop (Debian)
  "http://172.26.13.248:5000",    //Nick PC
  "http://172.26.101.94:5000",    //Nick PC (Debian)
  "http://172.26.21.211:5000",    //JM PC
  "http://172.26.248.50:5000",    //Jed Laptop
  "http://172.26.216.153:5000",   //Jet Laptop (Debian)
  "http://172.23.80.1:5000/",      //idk who pero pc ko
  "http://localhost:5001", 
  "http://172.26.82.39:5001",     //Nick Laptop
  "http://172.26.71.43:5001",     //Nick Laptop (Debian)
  "http://172.26.13.248:5001",    //Nick PC
  "http://172.26.101.94:5001",    //Nick PC (Debian)
  "http://172.26.21.211:5001",    //JM PC
  "http://172.26.248.50:5001",    //Jed Laptop
  "http://172.26.216.153:5001",   //Jet Laptop (Debian)
  "http://172.23.80.1:5001/"      //idk who pero pc ko
];

// sessions storage. only exists in memory
const MemoryStore = session.MemoryStore;
const store = new MemoryStore();

// session details
app.use(session({
  name: 'anongginagawamodito',
  secret: getKey(),
  saveUninitialized: false,
  resave: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  }
}));

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
app.use(express.static(viteReactDist)); // to serve vite-react built files

// routing
const nfcRoute = require('./Routes/NFC');
const accRoute = require('./Routes/Acc');
const sessionRoute = require('./Routes/Sessions')(store);
const sqlRoute = require('./Routes/SQL');

app.use('/nfc', nfcRoute);
app.use('/acc', accRoute);
app.use('/session', sessionRoute);
app.use('/sql', sqlRoute);
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