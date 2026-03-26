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

async function generateHomeContent({ siteId, input, schemaShape }) {
  const aiInput = {
    siteId,
    companyName: input.companyName,
    displayName: input.displayName,
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
      "site: siteId, companyName, displayName, language, primaryColor, secondaryColor",
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
  generateHomeContent,
  generateMarketingImages
};
