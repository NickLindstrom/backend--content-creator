const { z, nonEmptyString } = require("./commonSchemas");

const assignSiteAdminSchema = z.object({
  email: z.string().trim().email(),
  siteIds: z.array(z.string().uuid()).min(1)
}).strict();

const sendSiteAdminAccessEmailSchema = z.object({
  redirectTo: z.string().trim().url().optional()
}).strict();

module.exports = {
  assignSiteAdminSchema,
  sendSiteAdminAccessEmailSchema
};