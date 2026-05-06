# LinkGrowth AI SaaS

Production-ready LinkGrowth AI SaaS foundation with:
- Session auth (email/password)
- Multi-workspace persistence on Supabase
- Stripe subscriptions (Starter/Pro/Elite)
- LinkedIn OAuth + publishing
- Server-side Gemini generation (no client API key exposure)
- Vercel serverless API routes

## Architecture
- Frontend: React + Vite (`src/`)
- Backend API: Vercel functions (`api/`)
- Database: Supabase Postgres (`db/schema.sql`)

## 1) Database Setup (Supabase)
1. Create a Supabase project.
2. Open SQL editor and run [`db/schema.sql`](db/schema.sql).
3. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## 2) Environment Variables
Set all vars from [`.env.example`](.env.example) in Vercel project settings.

Required for core app:
- `APP_URL`
- `SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

Required for billing:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_ELITE`

Required for LinkedIn posting:
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

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
- AI: `/api/ai/research`, `/api/ai/post`, `/api/ai/voice`
- Billing: `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/status`, `/api/billing/webhook`
- LinkedIn: `/api/linkedin/auth-url`, `/api/linkedin/callback`, `/api/linkedin/status`, `/api/linkedin/disconnect`, `/api/linkedin/publish`
- Health: `/api/health`
