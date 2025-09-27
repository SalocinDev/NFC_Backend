const express = require("express")
const routes = express.Router();
const { sendEmail } = require("../nodemailer/sendEmail")

routes.get("/", async (req, res) => {
    try {
        const {recipient, subject, message} = req.query;
        if (!recipient || !subject || !message){
            return res.status(400).json({ success: false, message: "Bad Request" })
        }
        const result = await sendEmail(recipient, subject, message)
        if (!result.success){
            return res.status(400).json({ success: false, message: "Email not Sent" })
        }
        if (result.success){            
            return res.status(200).json({ success: true, message: "Email Sent!" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || error })
    }
})

module.exports = routes;