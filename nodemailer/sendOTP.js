const nodemailer = require("nodemailer");
const { makeOTP, generateOTPandStoreOTP } = require("../Crypto/crypto-utils");
require("dotenv").config();

const email = process.env.EMAIL;
const password = process.env.APP_PASSWORD;

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: email,
      pass: password,
    }
});

async function sendOTPthroughMail(recipient) {
    try {
        const OTP = await generateOTPandStoreOTP(recipient);

        const mailOptions = {
            from: email,
            to: recipient,
            subject: "Your OTP Code",
            text: `Your OTP is: ${OTP}\n\nThis code will expire in 15 minutes.`
        };

        return new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error sending OTP email:", error);
                    return reject(error);
                }
                console.log("Email sent:", info.response);
                resolve({ info, OTP });
            });
        });
    } catch (err) {
        console.error("Error generating/sending OTP:", err);
        throw err;
    }
}

/* (async () => {
  sendOTPthroughMail("mcl.manila.1@gmail.com")
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
