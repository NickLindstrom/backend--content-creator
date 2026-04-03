const { z } = require("zod");
const contentService = require("../services/contentService");
const siteService = require("../services/siteService");
const siteAssetService = require("../services/siteAssetService");
const workflowStatusService = require("../services/workflowStatusService");
const { uploadSiteAssetSchema } = require("../validators/contentSchemas");

const workflowRunsQuerySchema = z.object({
  commitSha: z.string().trim().min(1)
});

async function getHomeContent(req, res) {
  const result = await contentService.getHomeContent(req.params.siteId);

  return res.json({
    data: result.content,
    meta: {
      siteId: req.params.siteId,
      sha: result.sha
    }
  });
}

async function saveHomeContent(req, res) {
  const result = await contentService.saveHomeContent(req.params.siteId, req.body, req.auth);

  return res.json({
    data: result.content,
    meta: {
      siteId: req.params.siteId,
      sha: result.sha,
      commitSha: result.commitSha
    }
  });
}

async function getWorkflowRunsStatus(req, res) {
  const query = workflowRunsQuerySchema.parse(req.query);
  const result = await workflowStatusService.getWorkflowRunsStatus(req.params.siteId, query.commitSha);

  return res.json({
    data: {
      runs: result.runs
    },
    meta: {
      siteId: req.params.siteId,
      commitSha: query.commitSha
    }
  });
}

async function uploadSiteAsset(req, res) {
  const input = uploadSiteAssetSchema.parse(req.body);
  const site = await siteService.getSiteById(req.params.siteId);
  const path = await siteAssetService.uploadImage({
    owner: site.repo_owner,
    repo: site.repo_name,
    branch: site.branch,
    siteId: site.site_id,
    fileNameBase: input.fileNameBase,
    imageInput: input.image
  });

  return res.status(201).json({
    data: {
      path,
      previewUrl: `https://raw.githubusercontent.com/${site.repo_owner}/${site.repo_name}/${site.branch}/${path}`
    }
  });
}

module.exports = {
  getHomeContent,
  saveHomeContent,
  getWorkflowRunsStatus,
  uploadSiteAsset
};