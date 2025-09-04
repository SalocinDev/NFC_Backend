const nodemailer = require("nodemailer");
const { makeOTP, generateOTPandStoreOTP } = require("../Crypto/crypto-utils");
const credentials = require("./credentials")

const email = credentials.email;
const password = credentials.password;

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
  sendOTPthroughMail("nicholaslonganilla@gmail.com")
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
