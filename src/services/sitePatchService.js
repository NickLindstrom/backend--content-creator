const dbIntegration = require("../integrations/supabase/dbIntegration");
const githubIntegration = require("../integrations/github/githubIntegration");
const siteService = require("./siteService");
const { getSitePatch, listSitePatches } = require("../sitePatches");
const { homeContentSchema } = require("../validators/contentSchemas");
const { CONTENT_FILES } = require("../constants/contentFiles");
const templateSourceService = require("./templateSourceService");

function stringifyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function flattenPatchRun(record) {
  return {
    sitePatchRunId: record.site_patch_run_id,
    siteId: record.site_id,
    patchId: record.patch_id,
    action: record.action,
    status: record.status,
    reason: record.reason,
    commitSha: record.commit_sha,
    changedFiles: record.changed_files || [],
    pullRequest: record.pull_request_url
      ? {
          number: record.pull_request_number,
          url: record.pull_request_url,
          branch: record.pull_request_branch
        }
      : null,
    actorUserId: record.actor_user_id,
    actorEmail: record.actor_email,
    createdAt: record.created_at,
    site: record.sites
      ? {
          siteId: record.sites.site_id,
          displayName: record.sites.display_name,
          repoName: record.sites.repo_name,
          repoOwner: record.sites.repo_owner,
          branch: record.sites.branch
        }
      : null
  };
}

async function persistPatchRun({ siteId, patchId, action, status, reason, commitSha = null, changedFiles = [], pullRequest = null, actor }) {
  await dbIntegration.createSitePatchRun({
    site_id: siteId,
    patch_id: patchId,
    action,
    status,
    reason,
    commit_sha: commitSha,
    changed_files: changedFiles,
    pull_request_number: pullRequest?.number || null,
    pull_request_url: pullRequest?.url || null,
    pull_request_branch: pullRequest?.branch || null,
    actor_user_id: actor?.userId || null,
    actor_email: actor?.email || null
  });
}

async function resolveTargetSites(targetMode, siteIds) {
  if (targetMode === "all") {
    return siteService.getActiveSites();
  }

  const selectedSites = await siteService.getSitesByIds(siteIds);
  const selectedMap = new Map(selectedSites.map((site) => [site.site_id, site]));
  const missingSiteIds = siteIds.filter((siteId) => !selectedMap.has(siteId));

  if (missingSiteIds.length > 0) {
    const error = new Error("One or more selected sites do not exist");
    error.statusCode = 400;
    error.details = missingSiteIds;
    throw error;
  }

  return siteIds.map((siteId) => selectedMap.get(siteId));
}

async function loadPatchContext(site, patch) {
  const files = {};
  let content = null;

  for (const path of patch.allowedFiles) {
    try {
      if (path === CONTENT_FILES.HOME.path) {
        const file = await githubIntegration.getFileContent({
          owner: site.repo_owner,
          repo: site.repo_name,
          path,
          branch: site.branch
        });
        content = file.content;
      } else {
        const file = await githubIntegration.getTextFileContent({
          owner: site.repo_owner,
          repo: site.repo_name,
          path,
          branch: site.branch
        });
        files[path] = file.content;
      }
    } catch (error) {
      if (error.status === 404 || error.statusCode === 404) {
        const missingFileError = new Error(`Required template file is missing: ${path}`);
        missingFileError.statusCode = 409;
        missingFileError.details = {
          path,
          status: "conflict_or_customized"
        };
        throw missingFileError;
      }

      throw error;
    }
  }

  return {
    files,
    content
  };
}

function buildResult({ site, patchId, status, reason, commitSha = null, changedFiles = [], pullRequest = null }) {
  return {
    siteId: site.site_id,
    repoName: site.repo_name,
    status,
    reason,
    commitSha,
    changedFiles,
    pullRequest,
    patchId
  };
}

function sanitizeBranchSegment(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-/.]+|[-/.]+$/g, "")
    .slice(0, 80);
}

function validateFilesForCommit(filesToUpdate) {
  return filesToUpdate.map((file) => {
    if (file.path === CONTENT_FILES.HOME.path) {
      const validatedContent = homeContentSchema.parse(file.content);
      return {
        path: file.path,
        content: stringifyJson(validatedContent)
      };
    }

    return {
      path: file.path,
      content: file.content
    };
  });
}

function buildPullRequestBody({ patch, site, reason, changedFiles, actor }) {
  const lines = [
    `Detta PR skapades automatiskt eftersom patchen \`${patch.patchId}\` inte kunde appliceras direkt på sajten.`,
    "",
    `Sajt: ${site.display_name || site.repo_name} (${site.site_id})`,
    `Basbranch: ${site.branch}`,
    actor?.email ? `Initierad av: ${actor.email}` : null,
    "",
    "Orsak till manuell review:",
    reason,
    "",
    "Föreslagna filer:",
    ...(changedFiles.length ? changedFiles.map((filePath) => `- ${filePath}`) : ["- Inga filer kunde förberedas automatiskt"]),
    "",
    "Inspektera diffen innan merge."
  ].filter(Boolean);

  return `${lines.join("\n")}\n`;
}

async function createConflictPullRequest({ site, patch, context, actor, reason }) {
  if (typeof patch.buildConflictPullRequest !== "function") {
    return null;
  }

  const templateFiles = patch.templateFallbackFiles?.length
    ? await templateSourceService.getTemplateFiles(patch.templateFallbackFiles)
    : {};

  const proposal = patch.buildConflictPullRequest({
    site,
    files: context.files,
    content: context.content,
    reason,
    templateFiles
  });

  if (!proposal || !Array.isArray(proposal.filesToUpdate) || proposal.filesToUpdate.length === 0) {
    return null;
  }

  const validatedFiles = validateFilesForCommit(proposal.filesToUpdate);
  const branch = sanitizeBranchSegment(`patch-review/${patch.patchId}/${site.site_id}`);

  await githubIntegration.createOrResetBranchFromBase({
    owner: site.repo_owner,
    repo: site.repo_name,
    baseBranch: site.branch,
    branch
  });

  const updateResult = await githubIntegration.updateTextFiles({
    owner: site.repo_owner,
    repo: site.repo_name,
    branch,
    files: validatedFiles,
    message: `Prepare review PR for patch ${patch.patchId} on site ${site.site_id}`
  });

  const pullRequest = await githubIntegration.createOrReusePullRequest({
    owner: site.repo_owner,
    repo: site.repo_name,
    baseBranch: site.branch,
    headBranch: branch,
    title: `[Patch] ${patch.title}`,
    body: buildPullRequestBody({
      patch,
      site,
      reason,
      changedFiles: proposal.changedFiles || proposal.filesToUpdate.map((file) => file.path),
      actor
    })
  });

  return {
    commitSha: updateResult.commitSha,
    changedFiles: proposal.changedFiles || proposal.filesToUpdate.map((file) => file.path),
    pullRequest,
    summary: proposal.summary || "Pull request skapad för manuell granskning."
  };
}

async function processSitePatch({ site, patch, action, actor }) {
  if (site.status !== "active") {
    const result = buildResult({
      site,
      patchId: patch.patchId,
      status: "failed_validation",
      reason: "Only active sites can be patched."
    });
    await persistPatchRun({ ...result, siteId: site.site_id, action, actor });
    return result;
  }

  let context = null;

  try {
    context = await loadPatchContext(site, patch);
    const detected = patch.detect({
      site,
      files: context.files,
      content: context.content
    });

    if (action === "preview") {
      const result = buildResult({
        site,
        patchId: patch.patchId,
        status: detected.status,
        reason: detected.reason,
        changedFiles: detected.status === "applicable" ? patch.allowedFiles : []
      });
      await persistPatchRun({ ...result, siteId: site.site_id, action, actor });
      return result;
    }

    if (detected.status === "conflict_or_customized") {
      const pullRequestResult = await createConflictPullRequest({
        site,
        patch,
        context,
        actor,
        reason: detected.reason
      });

      if (pullRequestResult) {
        const result = buildResult({
          site,
          patchId: patch.patchId,
          status: "pull_request_created",
          reason: `${detected.reason} En pull request skapades för manuell granskning.`,
          commitSha: pullRequestResult.commitSha,
          changedFiles: pullRequestResult.changedFiles,
          pullRequest: pullRequestResult.pullRequest
        });
        await persistPatchRun({ ...result, siteId: site.site_id, action, actor });
        return result;
      }

      const result = buildResult({
        site,
        patchId: patch.patchId,
        status: detected.status,
        reason: detected.reason
      });
      await persistPatchRun({ ...result, siteId: site.site_id, action, actor });
      return result;
    }

    if (detected.status !== "applicable") {
      const result = buildResult({
        site,
        patchId: patch.patchId,
        status: detected.status,
        reason: detected.reason
      });
      await persistPatchRun({ ...result, siteId: site.site_id, action, actor });
      return result;
    }

    const applied = patch.apply({
      site,
      files: context.files,
      content: context.content
    });

    const validatedFiles = validateFilesForCommit(applied.filesToUpdate);

    const updateResult = await githubIntegration.updateTextFiles({
      owner: site.repo_owner,
      repo: site.repo_name,
      branch: site.branch,
      files: validatedFiles,
      message: `Apply patch ${patch.patchId} to site ${site.site_id}`
    });

    const result = buildResult({
      site,
      patchId: patch.patchId,
      status: "applied",
      reason: applied.summary,
      commitSha: updateResult.commitSha,
      changedFiles: applied.changedFiles
    });
    await persistPatchRun({ ...result, siteId: site.site_id, action, actor });
    return result;
  } catch (error) {
    const status = (error.details && error.details.status) || (error.statusCode === 409 ? "conflict_or_customized" : "failed_validation");

    if (action === "apply" && status === "conflict_or_customized" && context) {
      try {
        const pullRequestResult = await createConflictPullRequest({
          site,
          patch,
          context,
          actor,
          reason: error.message || "Patchen kunde inte appliceras automatiskt."
        });

        if (pullRequestResult) {
          const result = buildResult({
            site,
            patchId: patch.patchId,
            status: "pull_request_created",
            reason: `${error.message || "Patchen kunde inte appliceras automatiskt."} En pull request skapades för manuell granskning.`,
            commitSha: pullRequestResult.commitSha,
            changedFiles: pullRequestResult.changedFiles,
            pullRequest: pullRequestResult.pullRequest
          });
          await persistPatchRun({ ...result, siteId: site.site_id, action, actor });
          return result;
        }
      } catch (pullRequestError) {
        error.message = `${error.message || "Patch run failed"} Kunde inte heller skapa pull request: ${pullRequestError.message}`;
      }
    }

    const result = buildResult({
      site,
      patchId: patch.patchId,
      status,
      reason: error.message || "Patch run failed"
    });
    await persistPatchRun({ ...result, siteId: site.site_id, action, actor });
    return result;
  }
}

async function executePatchAction({ patchId, targetMode, siteIds = [], action, actor }) {
  const patch = getSitePatch(patchId);
  const sites = await resolveTargetSites(targetMode, siteIds);
  const results = [];

  for (const site of sites) {
    const result = await processSitePatch({
      site,
      patch,
      action,
      actor
    });
    results.push(result);
  }

  return {
    patch: {
      patchId: patch.patchId,
      title: patch.title,
      description: patch.description,
      createdAt: patch.createdAt,
      riskLevel: patch.riskLevel,
      warning: patch.warning,
      allowedFiles: patch.allowedFiles
    },
    results
  };
}

async function previewPatch({ patchId, targetMode, siteIds, actor }) {
  return executePatchAction({
    patchId,
    targetMode,
    siteIds,
    action: "preview",
    actor
  });
}

async function applyPatch({ patchId, targetMode, siteIds, actor }) {
  return executePatchAction({
    patchId,
    targetMode,
    siteIds,
    action: "apply",
    actor
  });
}

async function getRecentPatchRuns(limit = 50) {
  const records = await dbIntegration.getRecentSitePatchRuns(limit);
  return records.map(flattenPatchRun);
}

async function deletePatchRun(sitePatchRunId) {
  const deletedRun = await dbIntegration.deleteSitePatchRun(sitePatchRunId);

  if (!deletedRun) {
    const error = new Error("Patch run not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    sitePatchRunId: deletedRun.site_patch_run_id
  };
}

module.exports = {
  listSitePatches,
  previewPatch,
  applyPatch,
  getRecentPatchRuns,
  deletePatchRun
};
