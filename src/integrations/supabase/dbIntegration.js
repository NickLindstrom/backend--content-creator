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

module.exports = {
  getSitesForUser,
  getAllSites,
  getSiteById,
  getSiteByRepoName,
  createSite,
  updateSite,
  deleteSite,
  getMembership,
  addSiteMember
};
