# abm-signal-dashboard

Surgical data-binding fix: the stored-signals dashboard now reads authoritative totals from the API's `dashboard` object (with documented fallback chains) instead of deriving counts from the paginated signals page, and empty fields render an em dash instead of the literal 'Unknown'. VERIFICATION: (1) Companies KPI reads dashboard.total_companies -> total_companies -> dashboard.companies_total -> dashboard.companies_tracked (displays 23, never company_count/returned/companies.length). (2) Total signals reads dashboard.total_signal_rows -> total_signal_rows -> total (75); High/Medium/Low read dashboard.high_alerts/medium_alerts/low_alerts -> counts_by_alert (25/7/0). (3) All category KPIs (funding, m&a, ipo, csuite, product launches, r&d, partnerships, news) read the dashboard object with counts_by_category fallback; missing values render '—'. (4) No literal 'Unknown' remains in the stored dashboard path; empty industry/company/source fields render '—' or hide the pill. (5) Changed files: lib/types.ts (additive optional fields), components/AccountSignalTrackerClient.tsx (normalizeStoredPayload now passes through total_companies/total_signal_rows/counts_by_alert/counts_by_category/dashboard), components/StoredSignalsDashboard.tsx (value bindings + '—' fallbacks), components/KpiCard.tsx (value accepts number|null to render '—'). No design/layout/style/chart-config/tab-structure changes; prisma schema, package.json build script (prisma db push --accept-data-loss), API routes and requests untouched.

## Features

- Companies Tracked KPI bound to dashboard.total_companies (authoritative total, not paginated page)
- Total signals bound to dashboard.total_signal_rows with top-level fallbacks
- High/Medium/Low alerts bound to dashboard alert totals with counts_by_alert fallback
- Category KPI counts bound to dashboard object with counts_by_category fallback
- Empty fields render an em dash instead of 'Unknown'
- Graceful '—' fallback when totals are missing at runtime (never crashes)

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Routes

- `/`
- `/access-denied`

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

1. Copy `.env.example` to `.env` for local development
2. Set `DATABASE_URL` to your Postgres connection string
3. Run `npx prisma db push` before `npm run dev` if tables are missing

On Vercel, `DATABASE_URL` is injected when Neon is connected to the project.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build (runs Prisma generate/push when configured)
- `npm run start` — run the production server locally

## Deploy

This project is intended for deployment on [Vercel](https://vercel.com). Connect the GitHub repository and deploy the `main` branch.
