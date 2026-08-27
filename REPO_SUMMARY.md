# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-27T07:40:17.798Z.

## Overview

ABM Signal Tracker dashboard that imports company lists and tracks stored ABM account signals across funding, C-suite, product and partnership activity.

**Repository:** `abm-signal-dashboard`  
**File count:** 47

## Features

- Dashboard title reads ABM Signal Tracker
- Stored signals dashboard with Overview, Companies, Signals, Trends and Insights tabs
- CSV/XLSX company import with background analysis
- Interactive charts with click-to-filter signal feed
- Arena email gate with access-denied page

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Infrastructure

- **DATABASE_URL:** set on Vercel when Neon is connected — do not commit real credentials

## Routes & Pages

- `/` — `app/page.tsx`
- `/access-denied` — `app/access-denied/page.tsx`

## Database Models

- `AppSetting`

## File Inventory

### App pages

- `app/access-denied/page.tsx`
- `app/arena-ds-tokens.css`
- `app/error.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`

### API routes

- `app/api/all-stored-signals/route.ts`
- `app/api/analyze/route.ts`
- `app/api/signals/route.ts`
- `app/api/stored-signals/route.ts`

### Components

- `components/AccountSignalTrackerClient.tsx`
- `components/Badges.tsx`
- `components/CompaniesTab.tsx`
- `components/CompanyDrawer.tsx`
- `components/DashboardClient.tsx`
- `components/EmptyState.tsx`
- `components/FiltersPopover.tsx`
- `components/HeaderBar.tsx`
- `components/InsightsTab.tsx`
- `components/KpiCard.tsx`
- `components/OverviewTab.tsx`
- `components/SignalsTab.tsx`
- `components/Skeletons.tsx`
- `components/StoredSignalsDashboard.tsx`
- `components/TabBar.tsx`
- `components/TrendsTab.tsx`
- `components/arena-email-provider.tsx`

### Libraries

- `lib/actions.ts`
- `lib/arena-email-constants.ts`
- `lib/arena-email.ts`
- `lib/data.ts`
- `lib/prisma.ts`
- `lib/types.ts`
- `lib/utils.ts`
- `prisma/schema.prisma`

### Config

- `.env.example`
- `middleware.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `tsconfig.json`

### Other

- `README.md`
- `REPO_SUMMARY.md`
- `VERIFICATION.md`

## Complete File Index

- `.env.example`
- `README.md`
- `REPO_SUMMARY.md`
- `VERIFICATION.md`
- `app/access-denied/page.tsx`
- `app/api/all-stored-signals/route.ts`
- `app/api/analyze/route.ts`
- `app/api/signals/route.ts`
- `app/api/stored-signals/route.ts`
- `app/arena-ds-tokens.css`
- `app/error.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `components/AccountSignalTrackerClient.tsx`
- `components/Badges.tsx`
- `components/CompaniesTab.tsx`
- `components/CompanyDrawer.tsx`
- `components/DashboardClient.tsx`
- `components/EmptyState.tsx`
- `components/FiltersPopover.tsx`
- `components/HeaderBar.tsx`
- `components/InsightsTab.tsx`
- `components/KpiCard.tsx`
- `components/OverviewTab.tsx`
- `components/SignalsTab.tsx`
- `components/Skeletons.tsx`
- `components/StoredSignalsDashboard.tsx`
- `components/TabBar.tsx`
- `components/TrendsTab.tsx`
- `components/arena-email-provider.tsx`
- `lib/actions.ts`
- `lib/arena-email-constants.ts`
- `lib/arena-email.ts`
- `lib/data.ts`
- `lib/prisma.ts`
- `lib/types.ts`
- `lib/utils.ts`
- `middleware.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `postcss.config.mjs`
- `prisma/schema.prisma`
- `tailwind.config.ts`
- `tsconfig.json`

## Latest Change

- **Updated at:** 2026-08-27T07:40:17.798Z
- **Request:** SCOPE LOCK — SINGLE TEXT STRING CHANGE ONLY. Obey exactly. This is a SURGICAL EDIT to the existing repo, NOT a regeneration.

THE ONLY CHANGE: Rename the dashboard TITLE text from "Account Signal Tracker" to "ABM Signal Tracker".
- Find every occurrence of the visible title/header string "Account Signal Tracker" (e.g. the app header/title bar, the page <title>/metadata, and any place that literal string is rendered) and replace it with "ABM Signal Tracker".
- Change ONLY that literal display string. Do not change any surrounding markup, classes, styling, font size, layout, or position.

STRICT RULES (do NOT do anything else):
- Do NOT change design, layout, styling, theme, colors, fonts, components, tabs, charts, KPIs, data bindings, numbers, copy other than this title, or structure in ANY way.
- Do NOT touch app/api/, lib/, prisma/schema.prisma, package.json, next.config, globals.css, or the build script (`prisma db push --accept-data-loss` MUST remain).
- Do NOT add dependencies, env vars, API routes, or fetches.
- Do NOT regenerate any file beyond the minimal string replacement.

VERIFICATION (print at the end):
- Confirm the title now reads "ABM Signal Tracker" and no "Account Signal Tracker" string remains.
- List every file changed (should be only where the title string lives) with before/after of the changed line.
- Confirm NO other change was made (no design/layout/data/tab/chart changes).
- Confirm `npm run build` exits 0.
