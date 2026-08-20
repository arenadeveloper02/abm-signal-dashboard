# ABM Signal Tracker

<<<<<<< HEAD
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
=======
Arena-themed dark analytics dashboard that tracks ABM signals — funding, C-suite changes, product launches, and partnerships — with KPI cards, trend charts, a company table, a filterable signal feed, and insight callouts.

## Features

- Sticky header with live status dot, updated timestamp + relative-time pill, green Refresh button, global Filters control, and company search
- Horizontal top tab navigation (Overview | Companies | Signals | Trends | Insights) — no sidebar
- Overview: KPI grid with sparklines, confidence pills, family donut and top signal types bar chart
- Companies: searchable, sortable table with per-company signal drawer
- Signals: fully filterable feed with chips, confidence badges, expandable summaries, source links
- Trends: stacked area by month + run-over-run line chart with legend toggles
- Insights: callout tiles and family-grouped high-confidence signal cards
- Arena email gate (middleware + cookie), loading skeletons, empty states, keyboard-accessible tabs

## Tech stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict)
- Tailwind CSS 3 · Recharts · Poppins via next/font
- Prisma + Neon Postgres (schema provisioned; dashboard data is served from a typed data module that can be swapped for an API fetch)
>>>>>>> 95963cd (Initial commit)

## Local setup

```bash
npm install
<<<<<<< HEAD
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
=======
cp .env.example .env   # set DATABASE_URL
npm run dev
```

Build: `npm run build` (runs `prisma generate && prisma db push && next build`).

## Deploy notes

- On Vercel with Neon connected, `DATABASE_URL` is injected automatically.
- The app must be embedded in an iframe with `?emailId=...`; middleware persists it in the `arena_email_id` cookie and rewrites to `/access-denied` when absent.
>>>>>>> 95963cd (Initial commit)
