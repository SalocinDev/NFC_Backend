// gptIntegration.js
const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function askGPT(message, context = []) {
  try {
    const prompt = `
You are MCL AI, a smart library assistant. 
The user said: "${message}"
Here is the available book context: ${JSON.stringify(context)}

Please respond naturally with a helpful and relevant answer.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("❌ GPT API Error:", err.message);
    return null; // return null triggers fallback text in your AI.js
  }
}

module.exports = { askGPT };

