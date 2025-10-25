require('dotenv').config();
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function testGPT() {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful library assistant." },
        { role: "user", content: "Can you suggest popular fantasy books?" }
      ],
      max_tokens: 150
    });

    console.log("GPT Response:\n", response.data.choices[0].message.content);
  } catch (err) {
    console.error("Error calling GPT:", err.message);
  }
}

testGPT();
