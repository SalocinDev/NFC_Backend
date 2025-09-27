function verifyApiKey(req, res, next) {
    // console.log("Backend expected:", process.env.API_KEY);
    // console.log("Frontend sent:", req.headers['x-api-key']);
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid API key" });
    }
    next();
}

module.exports = verifyApiKey