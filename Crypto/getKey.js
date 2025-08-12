const crypto = require("crypto");

let cachedKey = null;

function getKey() {
    if (!cachedKey) {
        const rawKey = crypto.randomBytes(16);
        cachedKey = rawKey.toString('hex');
    }
    return cachedKey;
}

module.exports = { getKey };