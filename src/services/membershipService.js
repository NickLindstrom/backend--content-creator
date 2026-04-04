const dbIntegration = require("../integrations/supabase/dbIntegration");
const authIntegration = require("../integrations/supabase/authIntegration");
const env = require("../config/env");
const { SITE_ROLES } = require("../constants/roles");

function mapMembershipSite(record) {
  return {
    siteId: record.sites.site_id,
    displayName: record.sites.display_name,
    repoName: record.sites.repo_name,
    repoOwner: record.sites.repo_owner,
    branch: record.sites.branch,
    role: record.role,
    linkedAt: record.created_at
  };
}

function buildAccessMetadata(user, sites) {
  return {
    ...(user.user_metadata || {}),
    lastAccessEmailSentAt: new Date().toISOString(),
    assignedSiteNames: sites.map((site) => site.displayName),
    assignedSiteIds: sites.map((site) => site.siteId)
  };
}

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

async function listSiteAdmins() {
  const [users, memberships] = await Promise.all([
    authIntegration.listUsers(),
    dbIntegration.getAllSiteMemberships()
  ]);

  const membershipsByUserId = memberships.reduce((acc, membership) => {
    const entry = acc.get(membership.user_id) || [];
    entry.push(mapMembershipSite(membership));
    acc.set(membership.user_id, entry);
    return acc;
  }, new Map());

  return users
    .filter((user) => membershipsByUserId.has(user.id))
    .map((user) => ({
      userId: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      siteCount: membershipsByUserId.get(user.id).length,
      sites: membershipsByUserId.get(user.id)
        .sort((left, right) => left.displayName.localeCompare(right.displayName, 'sv'))
    }))
    .sort((left, right) => left.email.localeCompare(right.email, 'sv'));
}

async function assignSiteAdmin({ email, siteIds }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await ensureCustomerUser(normalizedEmail, {
    roleLabel: "site-admin"
  });

  for (const siteId of siteIds) {
    await ensureSiteMember({
      site_id: siteId,
      user_id: user.id,
      role: SITE_ROLES.OWNER
    });
  }

  const memberships = await dbIntegration.getMembershipsByUserId(user.id);

  return {
    userId: user.id,
    email: user.email,
    created: user.email?.toLowerCase() === normalizedEmail && !user.last_sign_in_at,
    sites: memberships.map(mapMembershipSite).sort((left, right) => left.displayName.localeCompare(right.displayName, 'sv'))
  };
}

async function sendSiteAdminAccessEmail({ userId, redirectTo }) {
  const user = await authIntegration.getUserById(userId);
  const memberships = await dbIntegration.getMembershipsByUserId(userId);

  if (!memberships.length) {
    const error = new Error("User has no assigned sites");
    error.statusCode = 400;
    throw error;
  }

  const sites = memberships.map(mapMembershipSite).sort((left, right) => left.displayName.localeCompare(right.displayName, 'sv'));
  await authIntegration.updateUserMetadata(userId, buildAccessMetadata(user, sites));
  await authIntegration.sendPasswordSetupEmail({
    email: user.email,
    redirectTo: redirectTo || env.ADMIN_APP_URL
  });

  return {
    userId: user.id,
    email: user.email,
    redirectTo: redirectTo || env.ADMIN_APP_URL,
    siteCount: sites.length,
    sites
  };
}

module.exports = {
  getMembership,
  addSiteMember,
  ensureSiteMember,
  ensureCustomerUser,
  listSiteAdmins,
  assignSiteAdmin,
  sendSiteAdminAccessEmail
};