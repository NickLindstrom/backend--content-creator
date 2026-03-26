const { supabaseClient } = require("./supabaseClient");

async function createAiGenerationLog(logEntry) {
  const { data, error } = await supabaseClient
    .from("ai_generation_logs")
    .insert(logEntry)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  createAiGenerationLog
};
