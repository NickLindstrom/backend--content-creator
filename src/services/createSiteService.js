const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const githubIntegration = require("../integrations/github/githubIntegration");
const aiIntegration = require("../integrations/ai/contentGenerationIntegration");
const siteService = require("./siteService");
const membershipService = require("./membershipService");
const { buildRepoName } = require("../utils/repoName");
const { SITE_STATUS } = require("../constants/siteStatus");
const { SITE_ROLES } = require("../constants/roles");
const { homeContentSchema } = require("../validators/contentSchemas");
const { CONTENT_FILES } = require("../constants/contentFiles");

async function generateValidHomeContent({ siteId, input }) {
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
    footer: {}
  });

  const aiContent = await aiIntegration.generateHomeContent({
    siteId,
    input,
    schemaShape
  });

  return homeContentSchema.parse(aiContent);
}

async function createTemplateRepo(baseRepoName) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const repoName = attempt === 0 ? baseRepoName : `${baseRepoName}-${attempt + 1}`;

    try {
      return await githubIntegration.createRepoFromTemplate({
        owner: env.GITHUB_OWNER,
        name: repoName,
        templateOwner: env.GITHUB_TEMPLATE_OWNER,
        templateRepo: env.GITHUB_TEMPLATE_REPO,
        isPrivate: false
      });
    } catch (error) {
      if (error.status !== 422 || attempt === 4) {
        throw error;
      }
    }
  }

  throw new Error("Failed to create unique repository name");
}

async function createSite(input) {
  const siteId = uuidv4();
  const baseRepoName = buildRepoName(input.companyName);
  const homeContent = await generateValidHomeContent({ siteId, input });
  const repo = await createTemplateRepo(baseRepoName);

  const user = await membershipService.ensureCustomerUser(input.email, {
    companyName: input.companyName,
    contactPerson: input.contactPerson
  });

  const siteRecord = await siteService.createSiteRecord({
    site_id: siteId,
    company_name: input.companyName,
    display_name: input.displayName,
    repo_name: repo.name,
    repo_owner: repo.owner,
    branch: env.DEFAULT_SITE_BRANCH,
    domain: null,
    status: SITE_STATUS.ACTIVE
  });

  await membershipService.addSiteMember({
    site_id: siteId,
    user_id: user.id,
    role: SITE_ROLES.OWNER
  });

  const initialContent = {
    ...homeContent,
    site: {
      ...homeContent.site,
      siteId
    }
  };

  await githubIntegration.updateJsonFile({
    owner: repo.owner,
    repo: repo.name,
    path: CONTENT_FILES.HOME.path,
    branch: env.DEFAULT_SITE_BRANCH,
    content: initialContent,
    message: `Initialize home content for site ${siteId}`
  });

  return {
    site: siteRecord,
    repo,
    ownerUserId: user.id,
    contentPath: CONTENT_FILES.HOME.path
  };
}

module.exports = {
  createSite
};
