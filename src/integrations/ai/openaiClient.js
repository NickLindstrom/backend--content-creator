const OpenAI = require("openai");
const env = require("../../config/env");

const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

module.exports = {
  openaiClient
};
