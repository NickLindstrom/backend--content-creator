const { createSiteSchema } = require("../validators/createSiteSchemas");
const createSiteService = require("../services/createSiteService");
const pagesService = require("../services/pagesService");

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

module.exports = {
  createSite,
  activatePages
};
