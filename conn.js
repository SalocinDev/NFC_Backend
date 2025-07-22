let mysql = require('mysql');

let con = mysql.createConnection({
  host: "",
  user: "",
  password: ""
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connection");
});