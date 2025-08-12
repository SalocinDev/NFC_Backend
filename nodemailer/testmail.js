const nodemailer = require("nodemailer");

const email = "nicholaslonganilla@gmail.com";
const password = "Nicsalocin@92";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: email,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
  });
  
  let mailOptions = {
    from: email,
    to: 'xidexi4014@hostbyt.com',
    subject: 'Sending Email using Node.js',
    text: 'tite'
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });