const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const { updateProfilePicture, getProfilePicture } = require("../SQL/acc-utils");
require('dotenv').config();

const router = express.Router();

//Fix: Use correct NODE_ENV variable name
const isProduction = process.env.NODE_ENV === "production";

//Fix: Use proper conditional logic for backend URL
const apiUrl =
  process.env.BACKEND_URL ||
  (isProduction
    ? "https://seriously-trusting-octopus.ngrok-free.app"
    : "http://172.26.1.2:3000");

//Add file size limit (10 MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } //10 MB
});

//Profile Picture Upload
router.post('/profile-picture-update', upload.single('file'), async (req, res) => {
  try {
    const userID = req.session?.login?.user_id;
    if (!userID) {
      return res.status(401).json({ error: "Not logged in" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const compressedBuffer = await sharp(req.file.buffer)
      .resize(100, 100, {
        fit: "cover",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toBuffer();

    const profilePictureName = `profile-${userID}.png`;
    const result = await updateProfilePicture(profilePictureName, compressedBuffer, userID);

    if (!result.success) {
      return res.status(500).json({ success: false, message: "Database error", error: result.error });
    }

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: "File too large (max 10MB)" });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Serve Profile Picture
router.post('/profile-picture/:user_pfp_id', async (req, res) => {
  try {
    const { user_pfp_id } = req.params;
    const result = await getProfilePicture(user_pfp_id);

    console.log("Profile picture lookup:", {
      id: user_pfp_id,
      success: result.success,
      bufferLength: result.buffer?.length
    });

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.message });
    }

    res.set("Content-Type", "image/png");
    res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Route error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
