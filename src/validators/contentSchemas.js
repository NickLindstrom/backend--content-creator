const { z, nonEmptyString } = require("./commonSchemas");

const seoSchema = z.object({
  title: nonEmptyString,
  description: nonEmptyString,
  keywords: z.array(nonEmptyString).default([])
}).strict();

const heroSchema = z.object({
  eyebrow: nonEmptyString,
  headline: nonEmptyString,
  subheadline: nonEmptyString,
  primaryCtaLabel: nonEmptyString,
  primaryCtaHref: nonEmptyString
}).strict();

const introSchema = z.object({
  heading: nonEmptyString,
  body: nonEmptyString
}).strict();

const serviceItemSchema = z.object({
  title: nonEmptyString,
  description: nonEmptyString
}).strict();

const servicesSchema = z.object({
  heading: nonEmptyString,
  items: z.array(serviceItemSchema).min(1)
}).strict();

const aboutSchema = z.object({
  heading: nonEmptyString,
  body: nonEmptyString
}).strict();

const uspSchema = z.object({
  heading: nonEmptyString,
  items: z.array(nonEmptyString).min(1)
}).strict();

const testimonialSchema = z.object({
  name: nonEmptyString,
  quote: nonEmptyString
}).strict();

const testimonialsSchema = z.object({
  heading: nonEmptyString,
  enabled: z.boolean(),
  items: z.array(testimonialSchema)
}).strict();

const faqItemSchema = z.object({
  question: nonEmptyString,
  answer: nonEmptyString
}).strict();

const faqSchema = z.object({
  heading: nonEmptyString,
  enabled: z.boolean(),
  items: z.array(faqItemSchema)
}).strict();

const contactSchema = z.object({
  heading: nonEmptyString,
  body: nonEmptyString,
  email: nonEmptyString,
  phone: nonEmptyString,
  address: nonEmptyString
}).strict();

const footerSchema = z.object({
  companyName: nonEmptyString,
  tagline: nonEmptyString,
  copyright: nonEmptyString
}).strict();

const homeContentSchema = z.object({
  site: z.object({
    siteId: z.string().uuid(),
    companyName: nonEmptyString,
    displayName: nonEmptyString,
    language: nonEmptyString,
    primaryColor: nonEmptyString,
    secondaryColor: nonEmptyString
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
  footer: footerSchema
}).strict();

module.exports = {
  homeContentSchema
};
