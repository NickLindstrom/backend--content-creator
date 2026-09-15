const { z, nonEmptyString } = require("./commonSchemas");

const siteAdminActivityStatuses = [
  "Ska skickas",
  "Skickad",
  "Ringt",
  "Inte intresserad",
  "Ta bort all info",
  "Återkom",
  "Vill köpa"
];

const assignSiteAdminSchema = z.object({
  email: z.string().trim().email(),
  siteIds: z.array(z.string().uuid()).min(1)
}).strict();

const sendSiteAdminAccessEmailSchema = z.object({
  redirectTo: z.string().trim().url().optional()
}).strict();

const removeSiteAdminAccessSchema = z.object({
  userId: z.string().uuid(),
  siteId: z.string().uuid()
}).strict();

const siteAdminActivitySchema = z.object({
  status: z.enum(siteAdminActivityStatuses),
  comment: z.string().trim().max(5000).optional().default("")
}).strict();

module.exports = {
  assignSiteAdminSchema,
  sendSiteAdminAccessEmailSchema,
  removeSiteAdminAccessSchema,
  siteAdminActivitySchema,
  siteAdminActivityStatuses
};
