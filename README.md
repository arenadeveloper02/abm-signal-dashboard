# ABM Signal Tracker

Arena-themed dark analytics dashboard for account-based marketing (ABM) signals — funding rounds, C-suite changes, product launches and partnerships — driven by a typed workflow payload.

## Features

- **Overview** — KPI cards with sparklines, confidence pills, click-to-filter, byFamily donut and top signal types bar
- **Companies** — searchable, sortable table with a per-company signal drawer
- **Signals** — filterable feed (family, type, confidence, date range, free text) with expandable summaries and source links
- **Trends** — stacked area by month, run-over-run bar chart, per-family legend toggles and a summary strip
- **Insights** — callout tiles plus family-grouped, ranked HIGH-confidence insight cards
- Global header search + filters, refresh with loading shimmer, empty states, keyboard-accessible tabs
- Arena email gate (middleware + access-denied page) and refresh events logged to Postgres via Prisma

## Tech stack

- Next.js ^15.3.3 (App Router) · React ^19 · TypeScript (strict)
- Tailwind CSS v3 · Recharts
- Prisma + Neon Postgres (RefreshEvent audit log)

## Local setup

```bash
npm install
cp .env.example .env   # set DATABASE_URL to a Postgres connection string
npm run dev
```

Open http://localhost:3000/?emailId=you@example.com — the `emailId` query param is required by the Arena email gate.

## Build & deploy

```bash
npm run build   # runs prisma generate && prisma db push && next build
npm start
```

On Vercel with a connected Neon database, `DATABASE_URL` is injected automatically.

## Data

The dashboard is seeded from `lib/data.ts`, a typed static module mirroring the upstream workflow payload. Swap `getDashboardPayload()` for an API fetch to go live — the module boundary is intentionally clean.
