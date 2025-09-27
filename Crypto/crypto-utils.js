const crypto = require("crypto")

let cachedKey = null;
const OTPStore = new Map();

function genRandom(x){
    return crypto.randomBytes(16*x).toString("hex");
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

async function generateOTPandStoreOTP(email) {
    try {
        const otp = await makeOTP();
        const expiry = Date.now() + 15 * 60 * 1000;

        OTPStore.set(email, { otp, expiry });
        console.log(`Generated OTP for ${email}:`, otp);

        return otp;
    } catch (err) {
        console.error("Error generating OTP:", err);
        throw err;
    }
}

function getOTP(email) {
    const data = OTPStore.get(email);
    if (!data) return null;

    if (Date.now() > data.expiry) {
        OTPStore.delete(email);
        return null;
    }
    return data.otp;
}

function verifyOTP(email, otpFromRequest) {
    const data = OTPStore.get(email);
    if (!data) return { verified: false, message: "No OTP found" };

    if (Date.now() > data.expiry) {
        OTPStore.delete(email);
        return { verified: false, message: "OTP expired" };
    }

    if (otpFromRequest !== data.otp) {
        return { verified: false, message: "Invalid OTP" };
    }

    OTPStore.delete(email);
    return { verified: true, message: "OTP verified" };
}
module.exports = {
    genRandom,
    getKey,
    hashAll,
    makeOTP,
	generateOTPandStoreOTP,
	getOTP,
    verifyOTP,
    OTPStore
};