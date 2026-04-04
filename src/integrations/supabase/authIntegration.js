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

async function listUsers() {
  const { data, error } = await supabaseClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) {
    throw error;
  }

  return data.users || [];
}

async function findUserByEmail(email) {
  const users = await listUsers();
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function getUserById(userId) {
  const { data, error } = await supabaseClient.auth.admin.getUserById(userId);

  if (error || !data.user) {
    const userError = new Error("Supabase user not found");
    userError.statusCode = 404;
    throw userError;
  }

  return data.user;
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

async function updateUserMetadata(userId, metadata) {
  const { data, error } = await supabaseClient.auth.admin.updateUserById(userId, {
    user_metadata: metadata
  });

  if (error || !data.user) {
    throw error || new Error("Failed to update Supabase user metadata");
  }

  return data.user;
}

async function sendPasswordSetupEmail({ email, redirectTo }) {
  const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (error) {
    throw error;
  }

  return data || null;
}

module.exports = {
  verifyAccessToken,
  listUsers,
  findUserByEmail,
  getUserById,
  createUser,
  updateUserMetadata,
  sendPasswordSetupEmail
};