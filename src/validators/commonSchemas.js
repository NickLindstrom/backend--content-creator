const { z } = require("zod");

const nonEmptyString = z.string().trim().min(1);

const socialLinkSchema = z.object({
  platform: nonEmptyString,
  url: z.string().url()
}).strict();

module.exports = {
  z,
  nonEmptyString,
  socialLinkSchema
};
