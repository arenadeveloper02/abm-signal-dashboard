# abm-signal-dashboard

ABM Signal Tracker — upload a company list (CSV or XLSX) and track ABM account signals across funding, C-suite, product and partnership activity.

## Features

- Upload company lists (CSV/XLSX) and analyze accounts for buying signals
- Overview, Companies, Signals, Trends and Insights tabs
- KPI cards, family/confidence breakdowns and trend charts (Recharts)
- Analyze API proxy to the ABM workflow endpoint with server-side API key

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Local Setup

1. `npm install`
2. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — Postgres connection string (Neon)
   - `ABM_API_URL` — optional, defaults to the built-in ABM workflow URL
   - `ABM_API_KEY` — ABM workflow API key (a working default is baked into the analyze route; the env var overrides it)
3. `npm run dev`

## Deploy Notes

- Vercel build runs `prisma generate && prisma db push && next build`
- `DATABASE_URL` is injected by the Vercel Neon integration
- Set `ABM_API_KEY` in Vercel project environment variables to override the built-in default key used by `app/api/analyze/route.ts`

## Changes in this edit

- `app/api/analyze/route.ts`: added `DEFAULT_ABM_API_KEY` constant and `getApiKey()` helper (falls back to the provided key when `ABM_API_KEY` env var is unset); `GET` and `POST` now resolve the key via `getApiKey()`, so the "ABM API not configured" error no longer occurs.
- `.env.example`: documented `ABM_API_URL` and `ABM_API_KEY` environment variables.
