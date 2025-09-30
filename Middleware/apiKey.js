function verifyApiKey(req, res, next) {
    // bypass preflight
    if (req.method === "OPTIONS") return next();

    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid API key" });
    }
    next();
}

module.exports = verifyApiKey;