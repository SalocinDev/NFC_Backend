const crypto = require("crypto")

let cachedKey = null;
let generatedOTP = null;

function genRandom(x){
    return salt = crypto.randomBytes(16*x).toString("hex");
};

function getKey() {
    if (!cachedKey) {
        const rawKey = crypto.randomBytes(16);
        cachedKey = rawKey.toString('hex');
    }
    return cachedKey;
};

function hashAll(...args) {
  const combined = args.join("|"); 
  return crypto.createHash("sha256").update(combined).digest("hex");
}

const makeOTP = () => new Promise((res, rej) =>
    crypto.randomBytes(3, (err, buffer) => {
        if (err) return rej(err);

        const num = parseInt(buffer.toString("hex"), 16);
        const sixDigit = (num % 1000000).toString().padStart(6, "0");

        res(sixDigit);
    })
);

async function generateOTPandStoreOTP() {
    try {
        generatedOTP = await makeOTP();
        console.log("Generated OTP:", generatedOTP);
        return generatedOTP;
    } catch (err) {
        console.error("Error generating OTP:", err);
    }
}

function getOTP() {
  return generatedOTP;
}

module.exports = {
    genRandom,
    getKey,
    hashAll,
    makeOTP,
	generateOTPandStoreOTP,
	getOTP
};