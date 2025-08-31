const nodemailer = require("nodemailer");
const { sendOTPthroughMail } = require("./sendOTP");

const email = "nicholaslonganilla@gmail.com";
const password = "vtdc qfgx igsn urzn";

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // use false for STARTTLS; true for SSL on port 465
  auth: {
    user: email,
    pass: password,
  }
});

// Configure the mailoptions object
const mailOptions = {
  from: email,
  to: email,
  subject: 'Sending Email using Node.js',
  text: 'Test 1'
};

// Send the email
transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Email sent: ', info.response);
  }
});

/* sendOTPthroughMail("nicholaslonganilla@gmail.com"); */