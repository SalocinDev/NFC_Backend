require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const MariaDBStore = require("./Middleware/sessionMariaDB");
const verifyApiKey = require("./Middleware/apiKey");

const { getKey, genRandom } = require("./Crypto/crypto-utils");

const app = express();
const port = 3000;
const startTime = Date.now();
const isProduction = process.env.NODE_ENV === "production";
const environment = process.env.NODE_ENV;

// const indexHTML = path.join(__dirname, "index.html");

//cors
const allowedOrigins = [
  "https://phalluis.github.io",
  "https://salocindev.github.io",
  "https://seriously-trusting-octopus.ngrok-free.app",
  "http://172.26.1.2:3000",
  "http://172.26.1.2:5000",
  "http://172.26.1.2:5001",
  "http://manila.city.library",
  "http://manila.city.library:3000",
  "http://manila.city.library:5000",
  "http://manila.city.library:5001",
];

//apply CORS middleware BEFORE everything else
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow curl/Postman
    if (allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-api-key"]
}));

//body parser
app.use(bodyParser.json());

//session 
const store = new MariaDBStore("main_sessions");
app.set("trust proxy", 1);

app.use(session({
  name: "main_session",
  secret: process.env.SESSION_SECRET || "shhhhhhhhhhhh",
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
}));

//csp
app.use((req, res, next) => {
  if (isProduction) {
    const apiUrl = "https://seriously-trusting-octopus.ngrok-free.app";
    res.setHeader(
      "Content-Security-Policy",
      [
        `default-src 'self' ${apiUrl} https://salocindev.github.io https://phalluis.github.io`,
        `script-src 'self' ${apiUrl} https://salocindev.github.io https://phalluis.github.io`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `font-src 'self' https://fonts.gstatic.com`,
        `img-src 'self' ${apiUrl} data:`,
        `connect-src 'self' ${apiUrl}`,
        `object-src 'none'`
      ].join("; ")
    );
  } else {
    res.setHeader("Content-Security-Policy", "default-src 'self' * data: blob:;");
  }

  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");

  next();
});

//attach routes (CORS already applied globally)
app.use("/nfc", verifyApiKey, require("./Routes/NFC")); console.log("NFC Route Loaded: /nfc");
app.use("/acc", verifyApiKey, require("./Routes/Acc")); console.log("Account Route Loaded: /acc");
app.use("/session", require("./Routes/Sessions")(store)); console.log("Session Route Loaded: /session");
app.use("/lib", verifyApiKey, require("./Routes/Library")); console.log("Library Route Loaded: /lib");
app.use("/file", verifyApiKey, require("./Routes/File")); console.log("File Route Loaded: /file");
app.use("/books", verifyApiKey, require("./Routes/Books")); console.log("Books Route Loaded: /books");
app.use("/categories", verifyApiKey, require("./Routes/Categories")); console.log("Categories Route Loaded: /categories");
app.use("/borrowing", verifyApiKey, require("./Routes/Borrowing")); console.log("Borrowing Route Loaded: /borrowing");
app.use("/returning", verifyApiKey, require("./Routes/Returning")); console.log("Returning Route Loaded: /returning");
app.use("/servicelogs", verifyApiKey, require("./Routes/ServiceLogs")); console.log("Service Logs Route Loaded: /servicelogs");
app.use("/user", verifyApiKey, require("./Routes/User")); console.log("User Route Loaded: /user");
app.use("/ai", verifyApiKey, require("./Routes/AI")); console.log("AI Route Loaded: /ai");
app.use("/email", verifyApiKey, require("./Routes/Email")); console.log("Email Route Loaded: /email");
app.use("/services", verifyApiKey, require("./Routes/Services")); console.log("Services Route Loaded: /services");
app.use("/statsreports", verifyApiKey, require("./Routes/StatsReports")); console.log("Stats Reports Route Loaded: /statsreports");

//debug
app.get("/view", (req, res) => {
  res.sendFile(indexHTML, (err) => {
    if (err) {
      console.error("Error serving file:", err);
      res.status(err.status || 500).send("Error serving file");
    } else {
      console.log("File served");
    }
  });
});

app.get("/status", (req, res) => {
  const headers = req.headers;
  const origin = req.get("origin");
  res.status(200).json({
    success: true,
    system: "online",
    headers,
    origin,
  });
});

//start
app.listen(port, "0.0.0.0", () => {
  const endTime = Date.now();
  console.log(`Server Mode: ${environment}`);
  console.log(`Server running at http://0.0.0.0:${port}`);
  console.log(`Server started in ${endTime - startTime}ms`);
});
