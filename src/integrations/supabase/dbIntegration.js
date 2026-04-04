const { supabaseClient } = require("./supabaseClient");

async function getSitesForUser(userId) {
  const { data, error } = await supabaseClient
    .from("site_members")
    .select("role, sites(*)")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data || [];
}

async function getAllSites() {
  const { data, error } = await supabaseClient
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getSitesByIds(siteIds) {
  const { data, error } = await supabaseClient
    .from("sites")
    .select("*")
    .in("site_id", siteIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getSiteById(siteId) {
  const { data, error } = await supabaseClient
    .from("sites")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getSiteByRepoName(repoName) {
  const { data, error } = await supabaseClient
    .from("sites")
    .select("*")
    .eq("repo_name", repoName)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function createSite(site) {
  const { data, error } = await supabaseClient
    .from("sites")
    .insert(site)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateSite(siteId, updates) {
  const { data, error } = await supabaseClient
    .from("sites")
    .update(updates)
    .eq("site_id", siteId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function deleteSite(siteId) {
  const { data, error } = await supabaseClient
    .from("sites")
    .delete()
    .eq("site_id", siteId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getMembership(userId, siteId) {
  const { data, error } = await supabaseClient
    .from("site_members")
    .select("*")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getMembershipsByUserId(userId) {
  const { data, error } = await supabaseClient
    .from("site_members")
    .select("*, sites(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getAllSiteMemberships() {
  const { data, error } = await supabaseClient
    .from("site_members")
    .select("*, sites(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function addSiteMember(member) {
  const { data, error } = await supabaseClient
    .from("site_members")
    .insert(member)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function createSitePatchRun(run) {
  const { data, error } = await supabaseClient
    .from("site_patch_runs")
    .insert(run)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getRecentSitePatchRuns(limit = 50) {
  const { data, error } = await supabaseClient
    .from("site_patch_runs")
    .select("*, sites(site_id, display_name, repo_name, repo_owner, branch)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

module.exports = {
  getSitesForUser,
  getAllSites,
  getSitesByIds,
  getSiteById,
  getSiteByRepoName,
  createSite,
  updateSite,
  deleteSite,
  getMembership,
  getMembershipsByUserId,
  getAllSiteMemberships,
  addSiteMember,
  createSitePatchRun,
  getRecentSitePatchRuns
};