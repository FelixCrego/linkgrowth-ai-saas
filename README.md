# LinkGrowth AI SaaS

Production-ready LinkGrowth AI SaaS foundation with:
- Session auth (email/password)
- Multi-workspace persistence on Neon Postgres
- Stripe subscriptions (Starter/Pro/Elite)
- LinkedIn OAuth + publishing
- Server-side OpenAI generation (no client API key exposure)
- Vercel serverless API routes

## Architecture
- Frontend: React + Vite (`src/`)
- Backend API: Vercel functions (`api/`)
- Database: Neon Postgres (`db/schema.sql`)

## 1) Database Setup (Neon)
1. Create a Neon project/database.
2. Open Neon SQL editor and run [`db/schema.sql`](db/schema.sql).
3. Copy your connection string and set `DATABASE_URL` (include `sslmode=require`).

## 2) Environment Variables
Set all vars from [`.env.example`](.env.example) in Vercel project settings.

Required for core app:
- `APP_URL`
- `SESSION_SECRET`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
- `OPENAI_RESEARCH_MODEL` (optional, used for web-backed research; recommended `o4-mini-deep-research`)
- `OPENAI_IMAGE_MODEL` (optional, defaults to `gpt-image-1`)

Required for billing:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_ELITE`

Required for LinkedIn posting:
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- Optional: `LINKEDIN_REDIRECT_URI` (exact callback override if your LinkedIn app is locked to one callback URL)

## 3) Stripe Webhook
Create Stripe webhook endpoint:
- URL: `https://YOUR_DOMAIN/api/billing/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Use the webhook secret as `STRIPE_WEBHOOK_SECRET`.

## 4) LinkedIn OAuth App
In LinkedIn developer portal:
- Add redirect URL: `https://YOUR_DOMAIN/api/linkedin/callback`
- Enable scopes used by this app.

## Local Development
- Frontend only: `npm run dev`
- Full stack with Vercel functions: `npm run dev:full`

## Build
- `npm run build`
- `npm run lint`

## API Routes
- Auth: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- Onboarding: `/api/user/onboarding`
- AI: `/api/ai/research`, `/api/ai/post`, `/api/ai/image`, `/api/ai/voice`
- Billing: `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/status`, `/api/billing/webhook`
- LinkedIn: `/api/linkedin/auth-url`, `/api/linkedin/callback`, `/api/linkedin/status`, `/api/linkedin/disconnect`, `/api/linkedin/publish`
- Health: `/api/health`

