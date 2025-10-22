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

async function sendEmail(recipient, subject, message) {
    try {
        const mailOptions = {
            from: email,
            to: recipient,
            subject: subject,
            text: message
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.response);
        return { success: true, info };

    } catch (error) {
        console.error("Error generating/sending email:", error);
        return { success: false, error };
    }
}

/* (async () => {
  sendEmail("inglesajohnrey01@gmail.com","JanRay","Bading bading bading bading")
    .then(result => {
      console.log("email sent", result);
    })
    .catch(err => {
      console.error("Failed to send email:", err);
    });
})(); */

module.exports = {
    sendEmail
};
