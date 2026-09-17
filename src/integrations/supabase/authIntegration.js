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

async function deleteUser(userId) {
  const { data, error } = await supabaseClient.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }

  return data?.user || null;
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

function assertActionLinkRedirect(actionLink, expectedRedirectTo) {
  let actualRedirectTo = "";

  try {
    actualRedirectTo = new URL(actionLink).searchParams.get("redirect_to") || "";
  } catch (error) {
    // The missing/invalid redirect is handled by the validation error below.
  }

  let normalizedActual = "";

  try {
    normalizedActual = actualRedirectTo
      ? new URL(actualRedirectTo).toString()
      : "";
  } catch (error) {
    // The malformed redirect is handled by the validation error below.
  }
  const normalizedExpected = new URL(expectedRedirectTo).toString();

  if (normalizedActual !== normalizedExpected) {
    const error = new Error(
      `Supabase ignored the requested redirect URL. Add ${normalizedExpected} to Authentication > URL Configuration > Redirect URLs and set the Site URL to https://admin.sajt24.se.`,
    );
    error.statusCode = 502;
    throw error;
  }
}

async function generatePasswordSetupLink({ email, redirectTo }) {
  const { data, error } = await supabaseClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo
    }
  });

  if (error) {
    throw error;
  }

  const actionLink = data?.properties?.action_link;

  if (!actionLink) {
    throw new Error("Supabase did not return a password setup link");
  }

  assertActionLinkRedirect(actionLink, redirectTo);

  return {
    actionLink,
    properties: data.properties,
    user: data.user
  };
}

module.exports = {
  verifyAccessToken,
  listUsers,
  findUserByEmail,
  getUserById,
  createUser,
  deleteUser,
  updateUserMetadata,
  sendPasswordSetupEmail,
  generatePasswordSetupLink,
  assertActionLinkRedirect
};
