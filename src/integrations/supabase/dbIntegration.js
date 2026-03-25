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
  getSiteById,
  createSite,
  getMembership,
  addSiteMember
};
