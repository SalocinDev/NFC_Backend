const express = require('express');
const multer = require('multer');
const path = require('path');
const { updateProfilePicture, getProfilePicture } = require("../SQL/acc-utils");
require('dotenv').config;
const router = express.Router();
const isProduction = process.env.NODE_env
const apiUrl = process.env.BACKEND_URL === "https://seriously-trusting-octopus.ngrok-free.app" || "http://172.26.1.2:3000"
const sharp = require("sharp");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/profile-picture-update', upload.single('file'), async (req, res) => {
  try {
    const userID = req.session?.login?.user_id;
    if (!userID) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const compressedBuffer = await sharp(req.file.buffer)
      .resize(100, 100, {
        fit: "cover",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toBuffer();

    /* const profilePictureName = req.file.originalname.replace(/\.[^/.]+$/, ".jpg"); */
    const profilePictureName = `profile-${userID}.png`;
    const result = await updateProfilePicture(profilePictureName, compressedBuffer, userID);

    if (!result.success) {
      return res.status(500).json({ success: false, message: "Database error", error: result.error });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
