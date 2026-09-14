const { z, nonEmptyString } = require('./commonSchemas');
const { SITE_THEME_IDS, DEFAULT_SITE_THEME, SITE_THEME_MODE_IDS, DEFAULT_SITE_THEME_MODE } = require('../constants/siteThemes');

const contentString = z.string().trim();
const siteThemeSchema = z.enum(SITE_THEME_IDS).default(DEFAULT_SITE_THEME);
const siteThemeModeSchema = z.enum(SITE_THEME_MODE_IDS).default(DEFAULT_SITE_THEME_MODE);

const mediaAssetSchema = z.object({
  url: z.string().trim(),
  alt: z.string().trim().default('')
}).strict();

const seoSchema = z.object({
  title: contentString,
  description: contentString,
  keywords: z.array(contentString).default([])
}).strict();

const heroSchema = z.object({
  eyebrow: contentString,
  headline: contentString,
  subheadline: contentString,
  primaryCtaLabel: contentString,
  primaryCtaHref: contentString
}).strict();

const introSchema = z.object({
  heading: contentString,
  body: contentString
}).strict();

const serviceItemSchema = z.object({
  title: contentString,
  description: contentString,
  image: mediaAssetSchema.default({ url: '', alt: '' })
}).strict();

const servicesSchema = z.object({
  heading: contentString,
  items: z.array(serviceItemSchema).default([])
}).strict();

const aboutSchema = z.object({
  heading: contentString,
  body: contentString
}).strict();

const uspSchema = z.object({
  heading: contentString,
  items: z.array(contentString).default([])
}).strict();

const testimonialSchema = z.object({
  name: contentString,
  quote: contentString
}).strict();

const testimonialsSchema = z.object({
  heading: contentString,
  enabled: z.boolean(),
  items: z.array(testimonialSchema).default([])
}).strict();

const faqItemSchema = z.object({
  question: contentString,
  answer: contentString
}).strict();

const faqSchema = z.object({
  heading: contentString,
  enabled: z.boolean(),
  items: z.array(faqItemSchema).default([])
}).strict();

const contactSchema = z.object({
  heading: contentString,
  body: contentString,
  email: contentString,
  phone: contentString,
  address: contentString
}).strict();

const footerSchema = z.object({
  companyName: contentString,
  tagline: contentString,
  copyright: contentString,
  socialLinks: z.record(contentString).default({})
}).strict();

const mediaSchema = z.object({
  logoUrl: z.union([contentString, z.null()]),
  headerLogoOnly: z.boolean().default(false),
  logoWidth: contentString.default('42px'),
  imageRatio: contentString.default('4 / 3'),
  heroImage: mediaAssetSchema,
  aboutImage: mediaAssetSchema,
  galleryHeading: contentString.default('Inblick i verksamheten'),
  gallery: z.array(mediaAssetSchema).default([])
}).strict();

const homeContentSchema = z.object({
  site: z.object({
    siteId: z.string().uuid(),
    companyName: nonEmptyString,
    displayName: nonEmptyString,
    language: nonEmptyString,
    primaryColor: nonEmptyString,
    secondaryColor: nonEmptyString,
    theme: siteThemeSchema,
    themeMode: siteThemeModeSchema
  }).strict(),
  seo: seoSchema,
  hero: heroSchema,
  intro: introSchema,
  services: servicesSchema,
  about: aboutSchema,
  usp: uspSchema,
  testimonials: testimonialsSchema,
  faq: faqSchema,
  contact: contactSchema,
  footer: footerSchema,
  media: mediaSchema
}).strict();

const imageInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('base64'),
    value: z.string().regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, 'Expected base64 image data URL')
  }).strict(),
  z.object({
    type: z.literal('url'),
    value: z.string().url()
  }).strict()
]);

const previewSiteSchema = z.object({
  content: homeContentSchema,
  previewSources: z.record(z.string()).default({})
}).strict();

const contentPatchSchema = z.record(z.string(), z.unknown());

const uploadSiteAssetSchema = z.object({
  fileNameBase: nonEmptyString,
  image: imageInputSchema
}).strict();

module.exports = {
  homeContentSchema,
  previewSiteSchema,
  contentPatchSchema,
  uploadSiteAssetSchema
};
