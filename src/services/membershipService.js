const dbIntegration = require("../integrations/supabase/dbIntegration");
const authIntegration = require("../integrations/supabase/authIntegration");

async function getMembership(userId, siteId) {
  return dbIntegration.getMembership(userId, siteId);
}

async function addSiteMember(member) {
  return dbIntegration.addSiteMember(member);
}

async function ensureSiteMember(member) {
  const existing = await getMembership(member.user_id, member.site_id);

  if (existing) {
    return existing;
  }

  return addSiteMember(member);
}

async function ensureCustomerUser(email, metadata = {}) {
  const existing = await authIntegration.findUserByEmail(email);

  if (existing) {
    return existing;
  }

  return authIntegration.createUser({
    email,
    metadata
  });
}

module.exports = {
  getMembership,
  addSiteMember,
  ensureSiteMember,
  ensureCustomerUser
};
