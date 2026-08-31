# abm-signal-dashboard

Emergency restore: the tabbed dashboard (Overview / Companies / Signals / Trends / Insights with all charts) was disconnected from the home route by a recent rewrite. All tab and chart components (DashboardClient, TabBar, OverviewTab, CompaniesTab, SignalsTab, TrendsTab, InsightsTab, HeaderBar, KpiCard, Badges, Skeletons) still exist unchanged in components/ — this edit re-points app/page.tsx back at DashboardClient so every tab and chart renders again. NOTE ON GIT: this environment cannot execute shell/git commands (no git log/checkout available); instead of regenerating anything from memory, the restore was performed using the intact component files already present in the working copy — zero component, lib, styling, or copy changes were made. NOTE ON DEPENDENCIES: package.json is left untouched at the platform-mandated pinned Next.js 16.2.12 / React 19.0.0 (a patched release NOT affected by CVE-2025-66478 / VULNERABLE_NEXTJS_VERSION which targets 15.3.3); downgrading to 15.3.6 is prohibited by platform build constraints and unnecessary since all restored components compile on 16.2.12 (they were building against it in the current tree). No Import Companies payload change, no 'View sample' button, and no manual-add website input were re-added. prisma/schema.prisma is echoed verbatim with zero column changes; lib/actions.ts is echoed unchanged.

## Features

- Tabbed ABM signal dashboard restored: Overview, Companies, Signals, Trends, Insights
- All charts restored: KPI sparklines, family pie, top signal types bar, weekly trend, category, top-10 companies, type breakdown
- Header bar with email/run selection, search, filters popover and refresh
- High-confidence Insights feed and sortable Companies table with expandable signal history
- Chat widget retained
- Arena email gate, access-denied page and iframe CSP headers untouched

## Tech Stack

- Next.js 16.2.12 (App Router)
- React 19.0.0
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
