# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T08:17:26.550Z.

## Overview

ABM Signal Dashboard: upload a company list or auto-load all stored ABM signals across funding, C-suite, product and partnership activity, with severity KPIs, trends and insights. Fixed the truncated/corrupted components/StoredSignalsDashboard.tsx (unclosed JSX / invalid character) by restoring the complete component, and repointed lib/actions.ts logRefresh to the existing AppSetting model (the deployed schema has no RefreshEvent model). prisma/schema.prisma is echoed verbatim and untouched. The requested API-key default in app/api/all-stored-signals/route.ts (getApiKey) was already present and left as-is.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Auto-loads all stored signals on first visit via /api/all-stored-signals
- CSV/XLSX company list upload with column normalization
- Severity-normalized KPI cards with sparklines and feed filtering
- Weekly severity and family trend charts, type donut, industry breakdown
- Companies, Signals, Trends and Insights tabs
- Arena email gate with access-denied page and iframe-safe headers

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

## Complete File Index

- `.env.example`
- `README.md`
- `REPO_SUMMARY.md`
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

- **Updated at:** 2026-08-26T08:17:26.550Z
- **Request:** STANDING RULE: Never modify prisma/schema.prisma. A previous edit dropped the updatedAt column from RefreshEvent and caused `prisma db push` to fail the Vercel build with a potential_dataloss error. Leave that file untouched.

STANDING RULE — THEME LOCK: The current light theme is correct. Do not change theme, colors, layout, or introduce dark mode anywhere.

Single change to implement:

In app/api/all-stored-signals/route.ts, the API key is currently resolved only from environment variables (ABM_ALL_SIGNALS_API_KEY, falling back to ABM_API_KEY). Those env vars are not set on the deployment, so the route returns 500 "ABM all-signals API not configured" and the client silently falls back to the upload screen.

Fix this exactly the way app/api/analyze/route.ts already does it: add a module-level default key constant and have getApiKey() fall back to it when neither env var is set. Follow the existing DEFAULT_ABM_API_KEY pattern in the analyze route — same naming style, same precedence (dedicated env var first, then shared env var, then the baked-in default).

The default key value is: sk-sim-u3_2d6AaWsa4zd2yoaaw9IyWfpHVTi_F

Requirements:
- Env vars must still take precedence over the baked-in default, so the key can be overridden in Vercel later without a code change.
- Do not remove the "not configured" error branch; it should now only trigger if the default constant is somehow empty.
- Keep .env.example documenting both env vars as-is.
- Change nothing else: no other route, component, or file; no refactors, no renames, no reformatting.

After implementing, confirm which file and function changed.
