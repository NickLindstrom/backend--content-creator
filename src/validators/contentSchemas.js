const { z, nonEmptyString } = require('./commonSchemas');
const { SITE_THEME_IDS, DEFAULT_SITE_THEME, SITE_THEME_MODE_IDS, DEFAULT_SITE_THEME_MODE } = require('../constants/siteThemes');

const contentString = z.string().trim();
const siteThemeSchema = z.enum(SITE_THEME_IDS).default(DEFAULT_SITE_THEME);
const siteThemeModeSchema = z.enum(SITE_THEME_MODE_IDS).default(DEFAULT_SITE_THEME_MODE);
const enabledSchema = z.boolean().default(true);

const mediaAssetSchema = z.object({
  url: z.string().trim(),
  alt: z.string().trim().default('')
}).strict();

const seoSchema = z.object({
  title: contentString,
  description: contentString,
  keywords: z.array(contentString).default([])
}).strict();

const heroButtonSchema = z.object({
  label: contentString,
  variant: z.enum(['primary', 'secondary', 'ghost', 'secondary-ghost']).default('primary'),
  linkType: z.enum(['section', 'external']).default('section'),
  target: contentString
}).strict();

const heroObjectSchema = z.object({
  enabled: enabledSchema,
  eyebrow: contentString,
  headline: contentString,
  subheadline: contentString,
  primaryCtaLabel: contentString,
  primaryCtaHref: contentString,
  buttons: z.array(heroButtonSchema).default([])
}).strict();

const heroSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value.buttons)) {
    const firstButton = value.buttons[0];
    const firstTarget = typeof firstButton?.target === 'string' ? firstButton.target.trim() : '';
    const firstHref = firstButton?.linkType === 'external'
      ? firstTarget
      : firstTarget
        ? `#${firstTarget.replace(/^#/, '')}`
        : '';

    return {
      ...value,
      primaryCtaLabel: typeof firstButton?.label === 'string' ? firstButton.label : '',
      primaryCtaHref: firstHref
    };
  }

  const label = typeof value.primaryCtaLabel === 'string' ? value.primaryCtaLabel.trim() : '';
  const href = typeof value.primaryCtaHref === 'string' ? value.primaryCtaHref.trim() : '';

  return {
    ...value,
    buttons: label
      ? [{
          label,
          variant: 'primary',
          linkType: href.startsWith('#') ? 'section' : 'external',
          target: href.startsWith('#') ? href.slice(1) : href
        }]
      : []
  };
}, heroObjectSchema);

const introSchema = z.object({
  enabled: enabledSchema,
  eyebrow: contentString.default('Introduktion'),
  heading: contentString,
  body: contentString
}).strict();

const serviceItemSchema = z.object({
  title: contentString,
  description: contentString,
  image: mediaAssetSchema.default({ url: '', alt: '' })
}).strict();

const servicesSchema = z.object({
  enabled: enabledSchema,
  eyebrow: contentString.default('Tjänster'),
  heading: contentString,
  items: z.array(serviceItemSchema).default([])
}).strict();

const aboutSchema = z.object({
  enabled: enabledSchema,
  eyebrow: contentString.default('Om oss'),
  heading: contentString,
  body: contentString
}).strict();

const uspSchema = z.object({
  enabled: enabledSchema,
  eyebrow: contentString.default('Varför välja oss'),
  heading: contentString,
  items: z.array(contentString).default([])
}).strict();

const testimonialSchema = z.object({
  name: contentString,
  quote: contentString
}).strict();

const testimonialsSchema = z.object({
  eyebrow: contentString.default('Omdömen'),
  heading: contentString,
  enabled: enabledSchema,
  items: z.array(testimonialSchema).default([])
}).strict();

const faqItemSchema = z.object({
  question: contentString,
  answer: contentString
}).strict();

const faqSchema = z.object({
  eyebrow: contentString.default('FAQ'),
  heading: contentString,
  enabled: enabledSchema,
  items: z.array(faqItemSchema).default([])
}).strict();

const openingHoursDaySchema = z.object({
  day: contentString,
  opens: contentString.default(''),
  closes: contentString.default(''),
  closed: z.boolean().default(false)
}).strict();

const openingHoursObjectSchema = z.object({
  enabled: enabledSchema,
  alwaysOpen: z.boolean().default(false),
  eyebrow: contentString.default('Öppettider'),
  heading: contentString.default('Öppettider'),
  body: contentString.default(''),
  days: z.array(openingHoursDaySchema).default([])
}).strict();

const openingHoursSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return { days: value };
  }

  if (!value) {
    return {};
  }

  return value;
}, openingHoursObjectSchema);

const contactSchema = z.object({
  enabled: enabledSchema,
  eyebrow: contentString.default('Kontakt'),
  heading: contentString,
  body: contentString,
  email: contentString,
  phone: contentString,
  address: contentString
}).strict();

const footerSchema = z.object({
  enabled: enabledSchema,
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
  galleryEnabled: enabledSchema,
  galleryEyebrow: contentString.default('Bilder'),
  galleryHeading: contentString.default('Inblick i verksamheten'),
  gallery: z.array(mediaAssetSchema).default([])
}).strict();

const securitySchema = z.object({
  csp: z.object({
    enabled: enabledSchema,
    allowAnyHttpsImages: z.boolean().default(true),
    extraImageSources: z.array(contentString).default([])
  }).strict().default({})
}).strict().default({});

const homeContentSchema = z.object({
  site: z.object({
    siteId: z.string().uuid(),
    companyName: nonEmptyString,
    organizationNumber: contentString.default(''),
    displayName: nonEmptyString,
    language: nonEmptyString,
    primaryColor: nonEmptyString,
    secondaryColor: nonEmptyString,
    headingFont: contentString.default('Georgia, "Times New Roman", serif'),
    bodyFont: contentString.default('Arial, sans-serif'),
    headerBackgroundColor: contentString.default(''),
    mainBackgroundColor: contentString.default(''),
    footerBackgroundColor: contentString.default(''),
    schemaType: contentString.default('LocalBusiness'),
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
  openingHours: openingHoursSchema.default({}),
  contact: contactSchema,
  footer: footerSchema,
  media: mediaSchema,
  security: securitySchema
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
