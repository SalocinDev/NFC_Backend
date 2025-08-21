const crypto = require('crypto')

const generateOTP = () => new Promise(res =>
	crypto.randomBytes(3, (err, buffer) => {
		res(
			parseInt(buffer.toString("hex"), 16)
				.toString()
		);
	})
);

async function generateAndPrintOTP() {
    const OTP = await generateOTP();
    console.log(OTP);
    setTimeout(() => {
        console.log("OTP has expired!!!");
    }, 1000);
}

generateAndPrintOTP();

// shiet, baka need natin mag HMAC. fuck fuck fuck fuck