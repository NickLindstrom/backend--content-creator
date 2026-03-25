const { createSiteSchema } = require("../validators/createSiteSchemas");
const createSiteService = require("../services/createSiteService");

async function createSite(req, res) {
  const payload = createSiteSchema.parse(req.body);
  const result = await createSiteService.createSite(payload);

  return res.status(201).json({
    data: result
  });
}

module.exports = {
  createSite
};
