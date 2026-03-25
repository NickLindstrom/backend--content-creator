const { openaiClient } = require("./openaiClient");
const env = require("../../config/env");

async function generateHomeContent({ siteId, input, schemaShape }) {
  const prompt = [
    "You generate JSON content for a static one-page business website.",
    "Return valid JSON only. No markdown. No explanations.",
    "The JSON must match this root structure exactly:",
    schemaShape,
    "Business input:",
    JSON.stringify({ siteId, ...input }, null, 2)
  ].join("\n\n");

  const response = await openaiClient.responses.create({
    model: env.OPENAI_MODEL,
    input: prompt
  });

  const text = response.output_text?.trim();

  if (!text) {
    const error = new Error("AI content generation returned an empty response");
    error.statusCode = 502;
    throw error;
  }

  return JSON.parse(text);
}

module.exports = {
  generateHomeContent
};
