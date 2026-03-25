const { createClient } = require("@supabase/supabase-js");
const env = require("../../config/env");

const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = {
  supabaseClient
};
