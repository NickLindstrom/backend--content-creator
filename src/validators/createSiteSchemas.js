const { z, nonEmptyString, socialLinkSchema } = require("./commonSchemas");

const imageInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("base64"),
    value: z.string().regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "Expected base64 image data URL")
  }).strict(),
  z.object({
    type: z.literal("url"),
    value: z.string().url()
  }).strict()
]);

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
  logo: imageInputSchema.nullable().optional(),
  showTestimonials: z.boolean(),
  showFaq: z.boolean(),
  websiteEmail: z.string().email(),
  websitePhone: nonEmptyString,
  address: nonEmptyString,
  postalCode: nonEmptyString,
  socialLinks: z.array(socialLinkSchema).default([]),
  images: z.array(imageInputSchema).default([]),
  repoConflictStrategy: z.enum(["overwrite", "copy"]).optional()
}).strict();

module.exports = {
  createSiteSchema
};

