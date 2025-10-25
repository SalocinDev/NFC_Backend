const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

(async () => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello from MCL AI!" }]
    });
    console.log(response.choices[0].message.content);
  } catch (err) {
    console.error("❌ Error testing GPT:", err.message);
  }
})()

