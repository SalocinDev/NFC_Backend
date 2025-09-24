const nodemailer = require("nodemailer");
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

async function sendEmail(recipient, subject, text) {
    try {
        const mailOptions = {
            from: email,
            to: recipient,
            subject: subject,
            text: text
        };

        return new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error sending email:", error);
                    return reject(error);
                }
                console.log("Email sent:", info.response);
                resolve({ info });
            });
        });
    } catch (err) {
        console.error("Error generating/sending email:", err);
        throw err;
    }
}

/* (async () => {
  sendEmail("nicholaslonganilla@gmail.com","General Email Sending Test","This is a Test")
    .then(result => {
      console.log("email sent", result);
    })
    .catch(err => {
      console.error("Failed to send email:", err);
    });
})();
 */
module.exports = {
    sendEmail
};
