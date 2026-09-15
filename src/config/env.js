const { config } = require("dotenv");
const { z } = require("zod");

config({ override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_TEMPLATE_OWNER: z.string().min(1),
  GITHUB_TEMPLATE_REPO: z.string().min(1),
  TEMPLATE_REPO_OWNER: z.string().min(1).optional(),
  TEMPLATE_REPO_NAME: z.string().min(1).optional(),
  TEMPLATE_REPO_BRANCH: z.string().min(1).optional(),
  TEMPLATE_CACHE_TTL_MS: z.coerce.number().int().positive().default(120000),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  OPENAI_IMAGE_MODEL: z.string().min(1).default("gpt-image-1"),
  DEFAULT_SITE_BRANCH: z.string().min(1).default("main"),
  ADMIN_APP_URL: z.string().url().default("https://admin-content-creator.onrender.com"),
  ADMIN_APP_NAME: z.string().min(1).default("Sajt24.se"),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  ACCESS_EMAIL_SUBJECT: z.string().min(1).default("Du har fått åtkomst")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const data = parsed.data;

module.exports = {
  ...data,
  TEMPLATE_REPO_OWNER: data.TEMPLATE_REPO_OWNER || data.GITHUB_TEMPLATE_OWNER,
  TEMPLATE_REPO_NAME: data.TEMPLATE_REPO_NAME || data.GITHUB_TEMPLATE_REPO,
  TEMPLATE_REPO_BRANCH: data.TEMPLATE_REPO_BRANCH || data.DEFAULT_SITE_BRANCH
};
