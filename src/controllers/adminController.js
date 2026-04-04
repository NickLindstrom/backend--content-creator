const { createSiteSchema } = require("../validators/createSiteSchemas");
const { patchTargetSchema, patchRunsQuerySchema } = require("../validators/patchSchemas");
const { assignSiteAdminSchema, sendSiteAdminAccessEmailSchema } = require("../validators/siteAdminSchemas");
const createSiteService = require("../services/createSiteService");
const pagesService = require("../services/pagesService");
const sitePatchService = require("../services/sitePatchService");
const membershipService = require("../services/membershipService");

async function createSite(req, res) {
  const payload = createSiteSchema.parse(req.body);
  const result = await createSiteService.createSite(payload);

  return res.status(201).json({
    data: result
  });
}

async function activatePages(req, res) {
  const result = await pagesService.activatePages(req.params.siteId);

  return res.json({
    data: result
  });
}

async function deactivatePages(req, res) {
  const result = await pagesService.deactivatePages(req.params.siteId);

  return res.json({
    data: result
  });
}

async function listPatches(req, res) {
  const patches = await sitePatchService.listSitePatches();

  return res.json({
    data: patches
  });
}

async function previewPatch(req, res) {
  const payload = patchTargetSchema.parse(req.body || {});
  const result = await sitePatchService.previewPatch({
    patchId: req.params.patchId,
    targetMode: payload.targetMode,
    siteIds: payload.siteIds,
    actor: req.auth
  });

  return res.json({
    data: result
  });
}

async function applyPatch(req, res) {
  const payload = patchTargetSchema.parse(req.body || {});
  const result = await sitePatchService.applyPatch({
    patchId: req.params.patchId,
    targetMode: payload.targetMode,
    siteIds: payload.siteIds,
    actor: req.auth
  });

  return res.json({
    data: result
  });
}

async function listPatchRuns(req, res) {
  const query = patchRunsQuerySchema.parse(req.query || {});
  const result = await sitePatchService.getRecentPatchRuns(query.limit);

  return res.json({
    data: result,
    meta: {
      limit: query.limit
    }
  });
}

async function deletePatchRun(req, res) {
  const result = await sitePatchService.deletePatchRun(req.params.sitePatchRunId);

  return res.json({
    data: result
  });
}

async function listSiteAdmins(req, res) {
  const result = await membershipService.listSiteAdmins();

  return res.json({
    data: result
  });
}

async function assignSiteAdmin(req, res) {
  const payload = assignSiteAdminSchema.parse(req.body || {});
  const result = await membershipService.assignSiteAdmin(payload);

  return res.status(201).json({
    data: result
  });
}

async function sendSiteAdminAccessEmail(req, res) {
  const payload = sendSiteAdminAccessEmailSchema.parse(req.body || {});
  const result = await membershipService.sendSiteAdminAccessEmail({
    userId: req.params.userId,
    redirectTo: payload.redirectTo
  });

  return res.json({
    data: result
  });
}

module.exports = {
  createSite,
  activatePages,
  deactivatePages,
  listPatches,
  previewPatch,
  applyPatch,
  listPatchRuns,
  deletePatchRun,
  listSiteAdmins,
  assignSiteAdmin,
  sendSiteAdminAccessEmail
};
