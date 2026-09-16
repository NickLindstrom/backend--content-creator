const dbIntegration = require("../integrations/supabase/dbIntegration");
const authIntegration = require("../integrations/supabase/authIntegration");
const resendIntegration = require("../integrations/resend/resendIntegration");
const {
  renderSiteAdminAccessEmail,
} = require("../emailTemplates/siteAdminAccessEmailTemplate");
const env = require("../config/env");
const { SITE_ROLES } = require("../constants/roles");

function getMembershipKey(userId, siteId) {
  return `${userId}:${siteId}`;
}

function mapSiteAdminActivity(record) {
  return {
    activityId: record.site_admin_activity_id,
    siteId: record.site_id,
    userId: record.user_id,
    status: record.status,
    comment: record.comment || "",
    actorUserId: record.actor_user_id,
    actorEmail: record.actor_email,
    createdAt: record.created_at,
  };
}

function mapMembershipSite(record, activities = []) {
  const latestActivity = activities[0] || null;

  return {
    siteId: record.sites.site_id,
    displayName: record.sites.display_name,
    repoName: record.sites.repo_name,
    repoOwner: record.sites.repo_owner,
    branch: record.sites.branch,
    publicUrl: record.sites.public_url,
    role: record.role,
    linkedAt: record.created_at,
    latestStatus: latestActivity?.status || "",
    latestActivity,
    activity: activities,
  };
}

function mapSiteSummary(record) {
  return {
    siteId: record.site_id,
    displayName: record.display_name,
    repoName: record.repo_name,
    repoOwner: record.repo_owner,
    branch: record.branch,
    publicUrl: record.public_url,
    status: record.status,
  };
}

function buildAccessMetadata(user, sites) {
  return {
    ...(user.user_metadata || {}),
    lastAccessEmailSentAt: new Date().toISOString(),
    assignedSiteNames: sites.map((site) => site.displayName),
    assignedSiteIds: sites.map((site) => site.siteId),
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
    metadata,
  });
}

async function listSiteAdmins() {
  const [users, memberships, sites, activities] = await Promise.all([
    authIntegration.listUsers(),
    dbIntegration.getAllSiteMemberships(),
    dbIntegration.getAllSites(),
    dbIntegration.getAllSiteAdminActivities(),
  ]);

  const activitiesByMembership = activities.reduce((acc, activity) => {
    const key = getMembershipKey(activity.user_id, activity.site_id);
    const entry = acc.get(key) || [];
    entry.push(mapSiteAdminActivity(activity));
    acc.set(key, entry);
    return acc;
  }, new Map());
  const ownedSiteIds = new Set(
    memberships
      .filter((membership) => membership.role === SITE_ROLES.OWNER)
      .map((membership) => membership.site_id),
  );
  const membershipsByUserId = memberships.reduce((acc, membership) => {
    const entry = acc.get(membership.user_id) || [];
    entry.push(
      mapMembershipSite(
        membership,
        activitiesByMembership.get(getMembershipKey(membership.user_id, membership.site_id)) || [],
      ),
    );
    acc.set(membership.user_id, entry);
    return acc;
  }, new Map());

  const siteAdmins = users
    .filter((user) => membershipsByUserId.has(user.id))
    .map((user) => ({
      userId: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      siteCount: membershipsByUserId.get(user.id).length,
      sites: membershipsByUserId
        .get(user.id)
        .sort((left, right) =>
          left.displayName.localeCompare(right.displayName, "sv"),
        ),
    }))
    .sort((left, right) => left.email.localeCompare(right.email, "sv"));

  return {
    users: siteAdmins,
    orphanedSites: sites
      .filter((site) => !ownedSiteIds.has(site.site_id))
      .map(mapSiteSummary)
      .sort((left, right) => left.displayName.localeCompare(right.displayName, "sv")),
  };
}

async function assignSiteAdmin({ email, siteIds }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await ensureCustomerUser(normalizedEmail, {
    roleLabel: "site-admin",
  });

  for (const siteId of siteIds) {
    await ensureSiteMember({
      site_id: siteId,
      user_id: user.id,
      role: SITE_ROLES.OWNER,
    });
  }

  const memberships = await dbIntegration.getMembershipsByUserId(user.id);

  return {
    userId: user.id,
    email: user.email,
    created:
      user.email?.toLowerCase() === normalizedEmail && !user.last_sign_in_at,
    sites: memberships
      .map(mapMembershipSite)
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "sv"),
      ),
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

  const sites = memberships
    .map(mapMembershipSite)
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, "sv"),
    );
  const resolvedRedirectTo =
    redirectTo || `${env.ADMIN_APP_URL}?authFlow=password-setup`;
  await authIntegration.updateUserMetadata(
    userId,
    buildAccessMetadata(user, sites),
  );
  const passwordSetupLink = await authIntegration.generatePasswordSetupLink({
    email: user.email,
    redirectTo: resolvedRedirectTo,
  });
  const emailContent = renderSiteAdminAccessEmail({
    appName: env.ADMIN_APP_NAME,
    email: user.email,
    setupLink: passwordSetupLink.actionLink,
    sites,
  });
  let companyName = "";
  if (sites[0]) {
    if (sites[0].displayName) companyName = `för ${sites[0].displayName}`;
  }
  const sentEmail = await resendIntegration.sendEmail({
    to: user.email,
    from: env.RESEND_FROM_EMAIL,
    subject: env.ACCESS_EMAIL_SUBJECT.replace("{{company_name}}", companyName),
    html: emailContent.html,
    text: emailContent.text,
    idempotencyKey: `site-admin-access-${userId}-${Date.now()}`,
  });

  return {
    userId: user.id,
    email: user.email,
    redirectTo: resolvedRedirectTo,
    emailProvider: "resend",
    emailId: sentEmail?.id || null,
    siteCount: sites.length,
    sites,
  };
}

async function removeSiteAdminAccess({ userId, siteId }) {
  const existing = await dbIntegration.getMembership(userId, siteId);

  if (!existing) {
    const error = new Error("Site membership not found");
    error.statusCode = 404;
    throw error;
  }

  const deletedMembership = await dbIntegration.deleteSiteMember(userId, siteId);

  return {
    userId,
    siteId,
    deleted: Boolean(deletedMembership),
    role: existing.role,
  };
}

async function removeSiteAdminUser({ userId, actor }) {
  if (actor?.userId === userId) {
    const error = new Error("Du kan inte ta bort ditt eget konto");
    error.statusCode = 400;
    throw error;
  }

  const user = await authIntegration.getUserById(userId);
  const deletedMemberships = await dbIntegration.deleteSiteMembershipsByUserId(userId);
  await authIntegration.deleteUser(userId);

  return {
    userId,
    email: user.email,
    deletedMembershipCount: deletedMemberships.length,
  };
}

async function addSiteAdminActivity({ userId, siteId, status, comment, actor }) {
  const existing = await dbIntegration.getMembership(userId, siteId);

  if (!existing) {
    const error = new Error("Site membership not found");
    error.statusCode = 404;
    throw error;
  }

  const activity = await dbIntegration.createSiteAdminActivity({
    user_id: userId,
    site_id: siteId,
    status,
    comment: comment || "",
    actor_user_id: actor?.userId || null,
    actor_email: actor?.email || null,
  });

  return mapSiteAdminActivity(activity);
}

module.exports = {
  getMembership,
  addSiteMember,
  ensureSiteMember,
  ensureCustomerUser,
  listSiteAdmins,
  assignSiteAdmin,
  removeSiteAdminAccess,
  removeSiteAdminUser,
  addSiteAdminActivity,
  sendSiteAdminAccessEmail,
};
