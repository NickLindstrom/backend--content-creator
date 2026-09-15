# Content Creator Backend

Express-backend for a multi-site static content platform. The backend verifies Supabase users server-side, stores site metadata in Supabase/Postgres, and reads and writes JSON content in each site's GitHub repository.

## Stack

- Node.js
- Express
- Supabase Auth + Postgres
- GitHub Contents API
- OpenAI for initial `content/home.json`

## Project Structure

```text
src/
  config/
  constants/
  controllers/
  integrations/
  middleware/
  routes/
  services/
  utils/
  validators/
```

## Environment

Copy `.env.example` to `.env` and fill in:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `ADMIN_EMAIL`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_TEMPLATE_OWNER`
- `GITHUB_TEMPLATE_REPO`
- `OPENAI_API_KEY`
- `ADMIN_APP_URL`
- `ADMIN_APP_NAME`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ACCESS_EMAIL_SUBJECT`

`ADMIN_APP_URL` must be allowed as a Supabase Auth redirect URL. For access emails, the backend appends `?authFlow=password-setup` so the admin app can show the password setup screen.

## Database Setup

Run [001_init.sql](/d:/dev/priv/content-creator/backend/sql/001_init.sql) in Supabase SQL editor or against the Postgres database.

Tables:

- `sites`
- `site_members`

## Local Run

Recommended local ports:

- `backend--content-creator`: `5000`
- `admin--content-creator`: `3000`
- `create-site--content-creator`: `3001`

Backend:

```bash
npm install
npm run dev:local
```

Frontends should point `REACT_APP_BACKEND_URL` to `http://localhost:5000` even when they run on other local ports.

Health check:

```http
GET /health
```

## API

### `GET /me/sites`

Requires `Authorization: Bearer <token>`.

Returns all sites available to the current user, including the membership role. If the authenticated e-mail matches `ADMIN_EMAIL`, all sites are returned.

### `GET /sites/:siteId/content/home`

Requires auth and site membership. Returns `content/home.json` loaded from GitHub.

### `POST /sites/:siteId/content/home`

Requires auth and site membership. Validates payload against the fixed `home.json` schema and commits the update through GitHub Contents API.

### `POST /admin/create-site`

Requires auth and admin access based on `ADMIN_EMAIL`.

Example payload:

```json
{
  "companyName": "Acme AB",
  "displayName": "Acme",
  "contactPerson": "Anna Andersson",
  "email": "anna@example.com",
  "phone": "070-123 45 67",
  "city": "Stockholm",
  "serviceArea": "Storstockholm",
  "industry": "Bygg",
  "businessDescription": "Vi hjalper privatpersoner och foretag med renovering och snickeri.",
  "services": ["Koksrenovering", "Badrumsrenovering"],
  "targetAudience": "villaagare och bostadsrattsforeningar",
  "usp": ["Snabba svar", "Tydliga offerter"],
  "yearsInBusiness": 12,
  "certifications": ["BKR"],
  "language": "sv",
  "toneOfVoice": "trygg",
  "salesLevel": "medium",
  "localFeel": "high",
  "primaryCta": "Be om offert",
  "primaryColor": "#1c4c7a",
  "secondaryColor": "#d8b15a",
  "visualStyle": "clean",
  "showTestimonials": true,
  "showFaq": true,
  "websiteEmail": "kontakt@acme.se",
  "websitePhone": "070-123 45 67",
  "address": "Exempelgatan 1",
  "postalCode": "11122",
  "socialLinks": [
    {
      "platform": "facebook",
      "url": "https://facebook.com/acme"
    }
  ]
}
```

## Notes

- The backend never trusts site access from the client.
- `siteId` is the only backend identifier for site lookup.
- Repositories are created from a GitHub template repo and then initialized with generated `content/home.json`.
- The AI integration is isolated so the content generation model can be changed later without touching controllers or routes.
