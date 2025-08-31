const nodemailer = require("nodemailer");
const { makeOTP } = require("../Crypto/crypto-utils");

const email = "nicholaslonganilla@gmail.com";
const password = "vtdc qfgx igsn urzn";

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: email,
      pass: password,
    }
});

async function sendOTPthroughMail(recipient) {
    const OTP = await makeOTP(); 
    const mailOptions = {
        from: email,
        to: recipient,
        subject: 'This da OTP',
        text: OTP
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log('Error:', error);
                reject(error);
            } else {
                console.log('Email sent: ', info.response);
                resolve({ info, OTP });
            }
        });
    });
}

/* (async () => {
  sendOTPthroughMail("orvierepole50@gmail.com")
    .then(result => {
      console.log("email sent", result);
    })
    .catch(err => {
      console.error("Failed to send email:", err);
    });
})(); */

module.exports = {
    sendOTPthroughMail
};
