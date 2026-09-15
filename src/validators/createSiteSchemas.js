const { z, socialLinkSchema } = require("./commonSchemas");
const { SITE_THEME_IDS, DEFAULT_SITE_THEME } = require("../constants/siteThemes");

const optionalString = z.string().trim().default("");
const optionalEmail = z.union([z.literal(""), z.string().trim().email()]).default("");
const optionalStringArray = z.array(optionalString).default([]);
const openingHoursDayInputSchema = z.object({
  day: optionalString,
  opens: optionalString,
  closes: optionalString,
  closed: z.boolean().default(false)
}).strict();
const themeSchema = z.union([z.enum(SITE_THEME_IDS), z.literal("")]).default(DEFAULT_SITE_THEME);
const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.union([z.literal(""), z.string().url()]).default("")
);

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
  companyName: optionalString,
  displayName: optionalString,
  contactPerson: optionalString,
  email: optionalEmail,
  phone: optionalString,
  city: optionalString,
  serviceArea: optionalString,
  industry: optionalString,
  businessDescription: optionalString,
  services: optionalStringArray,
  targetAudience: optionalString,
  usp: optionalStringArray,
  yearsInBusiness: z.union([z.number().int().nonnegative(), optionalString]).default(""),
  certifications: optionalStringArray,
  language: optionalString,
  toneOfVoice: optionalString,
  salesLevel: optionalString,
  localFeel: z.union([z.boolean(), optionalString]).default(""),
  primaryCta: optionalString,
  primaryColor: optionalString,
  secondaryColor: optionalString,
  visualStyle: optionalString,
  theme: themeSchema,
  logo: imageInputSchema.nullable().optional(),
  showTestimonials: z.boolean().default(true),
  showFaq: z.boolean().default(true),
  openingHours: z.array(openingHoursDayInputSchema).default([]),
  websiteEmail: optionalEmail,
  websitePhone: optionalString,
  address: optionalString,
  postalCode: optionalString,
  socialLinks: z.array(socialLinkSchema).default([]),
  images: z.array(imageInputSchema).default([]),
  repoConflictStrategy: z.enum(["overwrite", "copy"]).optional()
}).strict();

const createSiteResearchSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  websiteUrl: optionalUrl
}).strict();

module.exports = {
  createSiteSchema,
  createSiteResearchSchema
};
