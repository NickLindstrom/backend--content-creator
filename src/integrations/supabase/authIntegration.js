const { supabaseClient } = require("./supabaseClient");

async function verifyAccessToken(token) {
  const { data, error } = await supabaseClient.auth.getUser(token);

  if (error || !data.user) {
    const authError = new Error("Invalid or expired access token");
    authError.statusCode = 401;
    throw authError;
  }

  return data.user;
}

async function findUserByEmail(email) {
  const { data, error } = await supabaseClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function createUser({ email, metadata }) {
  const { data, error } = await supabaseClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: metadata
  });

  if (error || !data.user) {
    throw error || new Error("Failed to create Supabase user");
  }

  return data.user;
}

module.exports = {
  verifyAccessToken,
  findUserByEmail,
  createUser
};
