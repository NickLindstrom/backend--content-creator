const { z, nonEmptyString, socialLinkSchema } = require("./commonSchemas");

const createSiteSchema = z.object({
  companyName: nonEmptyString,
  displayName: nonEmptyString,
  contactPerson: nonEmptyString,
  email: z.string().email(),
  phone: nonEmptyString,
  city: nonEmptyString,
  serviceArea: nonEmptyString,
  industry: nonEmptyString,
  businessDescription: nonEmptyString,
  services: z.array(nonEmptyString).min(1),
  targetAudience: nonEmptyString,
  usp: z.array(nonEmptyString).min(1),
  yearsInBusiness: z.union([z.number().int().nonnegative(), nonEmptyString]),
  certifications: z.array(nonEmptyString).default([]),
  language: nonEmptyString,
  toneOfVoice: nonEmptyString,
  salesLevel: nonEmptyString,
  localFeel: nonEmptyString,
  primaryCta: nonEmptyString,
  primaryColor: nonEmptyString,
  secondaryColor: nonEmptyString,
  visualStyle: nonEmptyString,
  showTestimonials: z.boolean(),
  showFaq: z.boolean(),
  websiteEmail: z.string().email(),
  websitePhone: nonEmptyString,
  address: nonEmptyString,
  postalCode: nonEmptyString,
  socialLinks: z.array(socialLinkSchema).default([])
}).strict();

module.exports = {
  createSiteSchema
};
