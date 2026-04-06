const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const githubIntegration = require("../integrations/github/githubIntegration");
const aiIntegration = require("../integrations/ai/contentGenerationIntegration");
const siteService = require("./siteService");
const membershipService = require("./membershipService");
const siteAssetService = require("./siteAssetService");
const { buildRepoName } = require("../utils/repoName");
const { normalizeHomeContent } = require("../utils/normalizeHomeContent");
const { SITE_STATUS } = require("../constants/siteStatus");
const { SITE_ROLES } = require("../constants/roles");
const { homeContentSchema } = require("../validators/contentSchemas");
const { CONTENT_FILES } = require("../constants/contentFiles");
const siteRenderService = require("./siteRenderService");

async function generateValidHomeContent({ siteId, input, uploadedAssets }) {
  const schemaShape = JSON.stringify({
    site: {},
    seo: {},
    hero: {},
    intro: {},
    services: {},
    about: {},
    usp: {},
    testimonials: {},
    faq: {},
    contact: {},
    footer: {},
    media: {}
  });

  const aiContent = await aiIntegration.generateHomeContent({
    siteId,
    input,
    schemaShape
  });

  const normalizedContent = normalizeHomeContent(aiContent, {
    siteId,
    input,
    uploadedAssets
  });

  return homeContentSchema.parse(normalizedContent);
}

function buildRepoConflictError(existingRepo, baseRepoName) {
  const error = new Error(
    `GitHub-repot ${baseRepoName} finns redan. Vill du skriva over det befintliga eller skapa en kopia med suffix?`
  );
  error.statusCode = 409;
  error.details = {
    code: "repo_exists",
    repo: existingRepo,
    suggestedName: `${baseRepoName}-2`
  };
  return error;
}

async function createCopyRepo(baseRepoName) {
  for (let attempt = 2; attempt <= 6; attempt += 1) {
    const repoName = `${baseRepoName}-${attempt}`;
    const existingRepo = await githubIntegration.getRepo({
      owner: env.GITHUB_OWNER,
      repo: repoName
    });

    if (existingRepo) {
      continue;
    }

    return githubIntegration.createRepoFromTemplate({
      owner: env.GITHUB_OWNER,
      name: repoName,
      templateOwner: env.GITHUB_TEMPLATE_OWNER,
      templateRepo: env.GITHUB_TEMPLATE_REPO,
      isPrivate: false
    });
  }

  const error = new Error(`Kunde inte skapa ett ledigt suffixrepo for ${baseRepoName}.`);
  error.statusCode = 409;
  throw error;
}

async function resolveRepo(baseRepoName, strategy) {
  const existingRepo = await githubIntegration.getRepo({
    owner: env.GITHUB_OWNER,
    repo: baseRepoName
  });

  if (!existingRepo) {
    const repo = await githubIntegration.createRepoFromTemplate({
      owner: env.GITHUB_OWNER,
      name: baseRepoName,
      templateOwner: env.GITHUB_TEMPLATE_OWNER,
      templateRepo: env.GITHUB_TEMPLATE_REPO,
      isPrivate: false
    });

    return {
      repo,
      linkedSite: null,
      reusedExistingSite: false
    };
  }

  if (!strategy) {
    throw buildRepoConflictError(existingRepo, baseRepoName);
  }

  if (strategy === "overwrite") {
    const linkedSite = await siteService.getSiteByRepoName(existingRepo.name);

    return {
      repo: existingRepo,
      linkedSite,
      reusedExistingSite: Boolean(linkedSite)
    };
  }

  if (strategy === "copy") {
    const repo = await createCopyRepo(baseRepoName);

    return {
      repo,
      linkedSite: null,
      reusedExistingSite: false
    };
  }

  const error = new Error("Invalid repo conflict strategy");
  error.statusCode = 400;
  throw error;
}

async function waitForRepoBranchReady({ owner, repo, branch, attempts = 8, delayMs = 1500 }) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await githubIntegration.getBranchHead({ owner, repo, branch });
      return;
    } catch (error) {
      const isLastAttempt = attempt === attempts;
      if (error.status !== 404 || isLastAttempt) {
        if (error.status === 404) {
          const branchError = new Error('GitHub branch ' + branch + ' for ' + owner + '/' + repo + ' is not ready yet');
          branchError.statusCode = 503;
          throw branchError;
        }

        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function persistSiteRecord({ linkedSite, repo, input, siteId, status }) {
  const updates = {
    company_name: input.companyName,
    display_name: input.displayName,
    repo_name: repo.name,
    repo_owner: repo.owner,
    branch: repo.defaultBranch || env.DEFAULT_SITE_BRANCH,
    status
  };

  if (linkedSite) {
    return siteService.updateSiteRecord(linkedSite.site_id, updates);
  }

  return siteService.createSiteRecord({
    site_id: siteId,
    ...updates,
    domain: null
  });
}

async function createSite(input) {
  const baseRepoName = buildRepoName(input.companyName);
  const resolved = await resolveRepo(baseRepoName, input.repoConflictStrategy);
  const siteId = resolved.linkedSite?.site_id || uuidv4();
  const branch = resolved.repo.defaultBranch || env.DEFAULT_SITE_BRANCH;

  const siteRecord = await persistSiteRecord({
    linkedSite: resolved.linkedSite,
    repo: resolved.repo,
    input,
    siteId,
    status: SITE_STATUS.CREATING
  });

  try {
    await waitForRepoBranchReady({
      owner: resolved.repo.owner,
      repo: resolved.repo.name,
      branch
    });

    const uploadedAssets = await siteAssetService.uploadSiteAssets({
      owner: resolved.repo.owner,
      repo: resolved.repo.name,
      branch,
      siteId: siteRecord.site_id,
      input
    });

    const homeContent = await generateValidHomeContent({
      siteId: siteRecord.site_id,
      input,
      uploadedAssets
    });

    const user = await membershipService.ensureCustomerUser(input.email, {
      companyName: input.companyName,
      contactPerson: input.contactPerson
    });

    await membershipService.ensureSiteMember({
      site_id: siteRecord.site_id,
      user_id: user.id,
      role: SITE_ROLES.OWNER
    });

    const initialContent = {
      ...homeContent,
      site: {
        ...homeContent.site,
        siteId: siteRecord.site_id
      }
    };

    const sharedTemplateFiles = await siteRenderService.getSharedTemplateFiles();
    const renderedHtml = await siteRenderService.renderSiteHtml(initialContent);

    const publishResult = await githubIntegration.updateTextFiles({
      owner: resolved.repo.owner,
      repo: resolved.repo.name,
      branch,
      files: [
        {
          path: CONTENT_FILES.HOME.path,
          content: `${JSON.stringify(initialContent, null, 2)}\n`
        },
        {
          path: CONTENT_FILES.INDEX.path,
          content: renderedHtml
        },
        ...sharedTemplateFiles
      ],
      message: `Initialize home content for site ${siteRecord.site_id}`
    });

    const activeSiteRecord = await siteService.updateSiteRecord(siteRecord.site_id, {
      status: SITE_STATUS.ACTIVE
    });

    return {
      site: activeSiteRecord,
      repo: resolved.repo,
      ownerUserId: user.id,
      contentPath: CONTENT_FILES.HOME.path,
      reusedExistingSite: resolved.reusedExistingSite,
      commitSha: publishResult.commitSha
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createSite
};
