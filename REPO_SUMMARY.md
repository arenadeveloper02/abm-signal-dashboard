# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T09:33:17.678Z.

## Overview

ABM Account Signal Tracker: upload a company list (CSV/XLSX) and track funding, C-suite, product and partnership signals with dashboards, trends and insights. This fix restores prisma/schema.prisma to the exact live baseline (RefreshEvent only, no AppSetting) and repairs the truncated/broken JSX in components/StoredSignalsDashboard.tsx that failed next build.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- CSV/XLSX company list upload and parsing
- Live signal analysis via ABM workflow APIs
- Stored signals dashboard with KPI cards, severity charts and feed
- Companies, Signals, Trends and Insights tabs
- Refresh event logging via Prisma (RefreshEvent)
- Arena iframe email gating

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

- `RefreshEvent`

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

- **Updated at:** 2026-08-26T09:33:17.678Z
- **Request:** CRITICAL — BUILD FIX, DO THIS FIRST AND ONLY THIS.

The Vercel build is failing with a Prisma potential_dataloss error: `prisma db push` wants to DROP the `RefreshEvent` table (3 live rows). Cause: a previous edit wrongly replaced prisma/schema.prisma — it deleted the `RefreshEvent` model and invented an `AppSetting` model that the live database does not have. The app has only ever had the `RefreshEvent` model.

FIX: Overwrite prisma/schema.prisma so its ENTIRE contents are EXACTLY the following bytes, nothing more, nothing less. Remove the `AppSetting` model completely. Restore `RefreshEvent` exactly as below. Do not add, reorder, rename, or reformat anything:

// **NOTE: dont remove updatedAt in any tables **
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model RefreshEvent {
  id        String   @id @default(cuid())
  emailId   String
  runId     String
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt
}

RULES:
- After this fix, prisma/schema.prisma must match the block above byte-for-byte so that `prisma db push` is a no-op against the existing database and reports NO data loss.
- If any code currently imports or references a Prisma `AppSetting` model or an `appSetting` client accessor, that code was added in the same bad change — remove or revert those references so the build compiles against the restored schema. Do NOT keep AppSetting alive by re-adding it to the schema.
- Do NOT touch anything else: leave app/api/all-stored-signals/route.ts (with its baked-in DEFAULT key), the components, the theme, and all other files exactly as they are on main.
- Do NOT add features, refactors, or reformatting.

After implementing, print the full final contents of prisma/schema.prisma and list every other file you had to touch (there should be none, unless a stray AppSetting reference forced a revert) and why.
