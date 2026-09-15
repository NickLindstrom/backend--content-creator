const { openaiClient } = require("./openaiClient");
const env = require("../../config/env");
const aiLogIntegration = require("../supabase/aiLogIntegration");

async function writeAiLog(entry) {
  try {
    await aiLogIntegration.createAiGenerationLog(entry);
  } catch (error) {
    console.error("Failed to persist AI generation log", {
      message: error.message,
      siteId: entry.site_id,
      operation: entry.operation
    });
  }
}

function buildImagePrompt({ input, slot }) {
  const slotPrompts = {
    hero: "Create a polished website hero image that sells trust, professionalism and local presence.",
    about: "Create a complementary website image that highlights craftsmanship, service quality and human warmth."
  };

  return [
    slotPrompts[slot],
    "The image should feel marketing-ready for a Swedish one-page business website.",
    "It is very important that you do not generate any text overlays, watermarks, logos, UI mockups and split-screen collages.",
    "Use the following business context:",
    JSON.stringify(
      {
        companyName: input.companyName,
        displayName: input.displayName,
        industry: input.industry,
        city: input.city,
        serviceArea: input.serviceArea,
        businessDescription: input.businessDescription,
        services: input.services,
        targetAudience: input.targetAudience,
        usp: input.usp,
        toneOfVoice: input.toneOfVoice,
        visualStyle: input.visualStyle,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        localFeel: input.localFeel
      },
      null,
      2
    )
  ].join("\n\n");
}

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeUrlImage(value) {
  if (!value || typeof value !== "object" || value.type !== "url" || typeof value.value !== "string") {
    return null;
  }

  const trimmed = value.value.trim();

  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  return {
    type: "url",
    value: trimmed
  };
}

function safeSocialLinks(value) {
  const socialLinks = value && typeof value === "object" ? value : {};

  return {
    facebook: safeString(socialLinks.facebook),
    instagram: safeString(socialLinks.instagram),
    linkedin: safeString(socialLinks.linkedin)
  };
}

function safeOpeningHours(value) {
  return Array.isArray(value)
    ? value
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          day: safeString(item.day),
          opens: safeString(item.opens),
          closes: safeString(item.closes),
          closed: Boolean(item.closed)
        }))
        .filter((item) => item.day || item.opens || item.closes || item.closed)
        .slice(0, 7)
    : [];
}

function normalizeResearchResult(parsed, fallbackSources = []) {
  const values = parsed?.values && typeof parsed.values === "object" ? parsed.values : {};
  const logo = safeUrlImage(values.logo);
  const images = Array.isArray(values.images)
    ? values.images.map(safeUrlImage).filter(Boolean).slice(0, 8)
    : [];

  return {
    values: {
      displayName: safeString(values.displayName),
      organizationNumber: safeString(values.organizationNumber),
      contactPerson: safeString(values.contactPerson),
      email: safeString(values.email),
      phone: safeString(values.phone),
      city: safeString(values.city),
      serviceArea: safeString(values.serviceArea),
      industry: safeString(values.industry),
      businessDescription: safeString(values.businessDescription),
      services: safeStringArray(values.services),
      usp: safeStringArray(values.usp),
      yearsInBusiness: safeString(values.yearsInBusiness),
      certifications: safeStringArray(values.certifications),
      websiteEmail: safeString(values.websiteEmail),
      websitePhone: safeString(values.websitePhone),
      address: safeString(values.address),
      postalCode: safeString(values.postalCode),
      openingHours: safeOpeningHours(values.openingHours),
      socialLinks: safeSocialLinks(values.socialLinks),
      logo: logo || { type: "url", value: "" },
      images
    },
    fieldMeta: parsed?.fieldMeta && typeof parsed.fieldMeta === "object" ? parsed.fieldMeta : {},
    summary: safeString(parsed?.summary),
    sources: Array.isArray(parsed?.sources) && parsed.sources.length ? parsed.sources : fallbackSources
  };
}

function extractWebSearchSources(response) {
  const urls = new Set();

  for (const item of response.output || []) {
    const sources = item?.action?.sources;

    if (!Array.isArray(sources)) {
      continue;
    }

    for (const source of sources) {
      if (source?.url) {
        urls.add(source.url);
      }
    }
  }

  return [...urls];
}

async function researchCompanyProfile({ companyName, websiteUrl }) {
  const requestPayload = {
    companyName,
    websiteUrl
  };
  const schemaShape = {
    values: {
      displayName: "",
      organizationNumber: "",
      contactPerson: "",
      email: "",
      phone: "",
      city: "",
      serviceArea: "",
      industry: "",
      businessDescription: "",
      services: [],
      usp: [],
      yearsInBusiness: "",
      certifications: [],
      websiteEmail: "",
      websitePhone: "",
      address: "",
      postalCode: "",
      openingHours: [],
      socialLinks: {
        facebook: "",
        instagram: "",
        linkedin: ""
      },
      logo: { type: "url", value: "" },
      images: []
    },
    fieldMeta: {},
    summary: "",
    sources: []
  };
  const prompt = [
    "Du hjälper en svensk webbplatsgenerator att förifylla ett formulär med publik företagsinformation.",
    "Använd webbsökning. Prioritera företagets egen webbplats om websiteUrl finns, och sök även efter företagsnamnet på allabolag.se för postadress, verksamhetsbeskrivning och kontaktuppgifter.",
    "Returnera ENDAST giltig JSON. Ingen markdown och inga förklaringar.",
    "JSON måste följa denna form exakt:",
    JSON.stringify(schemaShape, null, 2),
    "Regler:",
    "- Använd riktiga svenska tecken: å, ä, ö, Å, Ä, Ö. Använd inte a/o som ersättning och skriv inte Unicode escape-sekvenser.",
    "- Hitta inte på e-post, telefon, kontaktpersoner, certifieringar eller sociala länkar. Lämna tomt om stöd saknas.",
    "- organizationNumber ska bara fyllas om organisationsnummer hittas i en publik källa.",
    "- Fältet industry ska helst vara ett av dessa värden om det passar: electrician, craftsman, law-firm, author, consultant, other, plumber, carpenter, painter, cleaning, moving, real-estate, photographer, marketing-agency, web-agency, it-support, accountant, therapist, coach, personal-trainer, beauty-salon, hairdresser, restaurant, catering, construction, roofing.",
    "- Om branschen inte matchar, använd other.",
    "- services, usp och certifications ska vara korta svenska strängar.",
    "- openingHours ska vara en lista med dag, opens, closes och closed om öppettider hittas. Använd svenska veckodagar och format som 10.00 eller 10:00.",
    "- Bilder ska vara direkta http/https-URL:er från företagets webbplats när de verkar relevanta. Använd inte data-URL:er.",
    "- fieldMeta ska ha nycklar för de fält som fyllts, med { source: \"AI\", confidence: \"high|medium|low\", sources: [url] }.",
    "- sources ska vara en unik lista med de viktigaste URL:erna du använde.",
    "Input:",
    JSON.stringify(requestPayload, null, 2)
  ].join("\n\n");

  let response;

  try {
    response = await openaiClient.responses.create({
      model: env.OPENAI_MODEL,
      tools: [{ type: "web_search" }],
      include: ["web_search_call.action.sources"],
      input: prompt
    });
  } catch (error) {
    await writeAiLog({
      site_id: null,
      provider: "openai",
      operation: "create_site_research",
      model: env.OPENAI_MODEL,
      status: "error",
      request_payload: requestPayload,
      response_text: null,
      response_json: null,
      error_message: error.message || "Unknown OpenAI error"
    });

    if (error.status === 429) {
      const rateLimitError = new Error(
        "OpenAI rate limit reached. Försök igen om en stund eller kontrollera konto/quota i OpenAI."
      );
      rateLimitError.statusCode = 429;
      throw rateLimitError;
    }

    throw error;
  }

  const text = response.output_text?.trim();
  const fallbackSources = extractWebSearchSources(response);

  if (!text) {
    await writeAiLog({
      site_id: null,
      provider: "openai",
      operation: "create_site_research",
      model: env.OPENAI_MODEL,
      status: "error",
      request_payload: requestPayload,
      response_text: null,
      response_json: null,
      error_message: "AI research returned an empty response"
    });

    const error = new Error("AI research returned an empty response");
    error.statusCode = 502;
    throw error;
  }

  try {
    const parsed = JSON.parse(text);
    const normalized = normalizeResearchResult(parsed, fallbackSources);

    await writeAiLog({
      site_id: null,
      provider: "openai",
      operation: "create_site_research",
      model: env.OPENAI_MODEL,
      status: "success",
      request_payload: requestPayload,
      response_text: text,
      response_json: normalized,
      error_message: null
    });

    return normalized;
  } catch (error) {
    await writeAiLog({
      site_id: null,
      provider: "openai",
      operation: "create_site_research",
      model: env.OPENAI_MODEL,
      status: "error",
      request_payload: requestPayload,
      response_text: text,
      response_json: null,
      error_message: "OpenAI returned invalid research JSON"
    });

    const parseError = new Error("OpenAI returned invalid research JSON");
    parseError.statusCode = 502;
    throw parseError;
  }
}

async function generateHomeContent({ siteId, input, schemaShape }) {
  const aiInput = {
    siteId,
    companyName: input.companyName,
    displayName: input.displayName,
    organizationNumber: input.organizationNumber,
    contactPerson: input.contactPerson,
    email: input.email,
    phone: input.phone,
    city: input.city,
    serviceArea: input.serviceArea,
    industry: input.industry,
    businessDescription: input.businessDescription,
    services: input.services,
    targetAudience: input.targetAudience,
    usp: input.usp,
    yearsInBusiness: input.yearsInBusiness,
    certifications: input.certifications,
    language: input.language,
    toneOfVoice: input.toneOfVoice,
    salesLevel: input.salesLevel,
    localFeel: input.localFeel,
    primaryCta: input.primaryCta,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    visualStyle: input.visualStyle,
    showTestimonials: input.showTestimonials,
    showFaq: input.showFaq,
    logoIncluded: Boolean(input.logo?.value),
    imageCount: Array.isArray(input.images) ? input.images.length : 0
  };

  const requestPayload = {
    siteId,
    input: aiInput,
    schemaShape
  };

  const prompt = [
    "You generate JSON content for a static one-page business website.",
    "Return valid JSON only. No markdown. No explanations.",
    "The JSON must match this root structure exactly:",
    schemaShape,
    "Use these exact field names and no others:",
    [
      "site: siteId, companyName, organizationNumber, displayName, language, primaryColor, secondaryColor",
      "seo: title, description, keywords",
      "hero: eyebrow, headline, subheadline, primaryCtaLabel, primaryCtaHref",
      "intro: heading, body",
      "services: heading, items[{ title, description }]",
      "about: heading, body",
      "usp: heading, items[string]",
      "testimonials: heading, enabled, items[{ name, quote }]",
      "faq: heading, enabled, items[{ question, answer }]",
      "contact: heading, body, email, phone, address",
      "footer: companyName, tagline, copyright, socialLinks",
      "media: logoUrl, heroImage{ url, alt }, aboutImage{ url, alt }, gallery[{ url, alt }]"
    ].join("\n"),
    "Contact details and social links are injected by the backend later, so do not invent specific email addresses, phone numbers, postal codes or social URLs.",
    "The backend will also attach uploaded logo and image assets after generation.",
    "Do not use alternative names like headline/text/ogTitle/primaryCtaText.",
    "Business input:",
    JSON.stringify(aiInput, null, 2)
  ].join("\n\n");

  let response;

  try {
    response = await openaiClient.responses.create({
      model: env.OPENAI_MODEL,
      input: prompt
    });
  } catch (error) {
    await writeAiLog({
      site_id: siteId,
      provider: "openai",
      operation: "create_site_home",
      model: env.OPENAI_MODEL,
      status: "error",
      request_payload: requestPayload,
      response_text: null,
      response_json: null,
      error_message: error.message || "Unknown OpenAI error"
    });

    if (error.status === 429) {
      const rateLimitError = new Error(
        "OpenAI rate limit reached. Forsok igen om en stund eller kontrollera konto/quota i OpenAI."
      );
      rateLimitError.statusCode = 429;
      throw rateLimitError;
    }

    throw error;
  }

  const text = response.output_text?.trim();

  if (!text) {
    await writeAiLog({
      site_id: siteId,
      provider: "openai",
      operation: "create_site_home",
      model: env.OPENAI_MODEL,
      status: "error",
      request_payload: requestPayload,
      response_text: null,
      response_json: null,
      error_message: "AI content generation returned an empty response"
    });

    const error = new Error("AI content generation returned an empty response");
    error.statusCode = 502;
    throw error;
  }

  try {
    const parsed = JSON.parse(text);

    await writeAiLog({
      site_id: siteId,
      provider: "openai",
      operation: "create_site_home",
      model: env.OPENAI_MODEL,
      status: "success",
      request_payload: requestPayload,
      response_text: text,
      response_json: parsed,
      error_message: null
    });

    return parsed;
  } catch (error) {
    await writeAiLog({
      site_id: siteId,
      provider: "openai",
      operation: "create_site_home",
      model: env.OPENAI_MODEL,
      status: "error",
      request_payload: requestPayload,
      response_text: text,
      response_json: null,
      error_message: "OpenAI returned invalid JSON"
    });

    const parseError = new Error("OpenAI returned invalid JSON");
    parseError.statusCode = 502;
    throw parseError;
  }
}

async function generateMarketingImages({ siteId, input }) {
  const slots = ["hero", "about"];
  const results = [];

  for (const slot of slots) {
    const prompt = buildImagePrompt({ input, slot });

    try {
      const response = await openaiClient.images.generate({
        model: env.OPENAI_IMAGE_MODEL,
        prompt,
        size: "1536x1024"
      });

      const imageBase64 = response.data?.[0]?.b64_json;

      if (!imageBase64) {
        throw new Error("OpenAI returned no image data");
      }

      const dataUrl = `data:image/png;base64,${imageBase64}`;

      await writeAiLog({
        site_id: siteId,
        provider: "openai",
        operation: `create_site_marketing_image_${slot}`,
        model: env.OPENAI_IMAGE_MODEL,
        status: "success",
        request_payload: { prompt, slot },
        response_text: response.data?.[0]?.revised_prompt || null,
        response_json: { slot },
        error_message: null
      });

      results.push({
        slot,
        type: "base64",
        value: dataUrl
      });
    } catch (error) {
      await writeAiLog({
        site_id: siteId,
        provider: "openai",
        operation: `create_site_marketing_image_${slot}`,
        model: env.OPENAI_IMAGE_MODEL,
        status: "error",
        request_payload: { prompt, slot },
        response_text: null,
        response_json: null,
        error_message: error.message || "Unknown OpenAI image error"
      });

      if (error.status === 429) {
        const rateLimitError = new Error(
          "OpenAI rate limit reached. Forsok igen om en stund eller kontrollera konto/quota i OpenAI."
        );
        rateLimitError.statusCode = 429;
        throw rateLimitError;
      }

      throw error;
    }
  }

  return results;
}

module.exports = {
  researchCompanyProfile,
  generateHomeContent,
  generateMarketingImages
};
