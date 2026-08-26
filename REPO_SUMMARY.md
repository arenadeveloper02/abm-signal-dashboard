# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T17:23:40.990Z.

## Overview

ABM account signal tracking dashboard with company import (CSV/XLSX), background analysis, and a stored-signals overview with KPI cards, charts, and a scrollable Recent Signals feed.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Import companies via CSV/XLSX or manual entry
- Background signal analysis via ABM workflow API
- Stored signals dashboard with KPI cards and sparklines
- Weekly severity and family trend charts
- Recent Signals card with internal scrolling
- Signals feed with type, week and industry filters
- Companies table with per-family counts
- High-severity insights view

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

- **Updated at:** 2026-08-26T17:23:40.990Z
- **Request:** SCOPE LOCK — obey exactly:
- SURGICAL EDIT to an existing repo, NOT a regeneration. Preserve every existing file byte-for-byte except the single edit described below.
- Do NOT change the theme, colors, fonts, spacing, card styling, layout, or any other component.
- Do NOT refactor, rename, reorder, reformat, or "clean up" anything.
- Do NOT add dependencies, env vars, config, or new API routes.
- Do NOT touch any API endpoint, data-fetching logic, response parsing, the other tabs, the buttons, the Import screen, or any file under app/api/ or lib/.
- Do NOT modify prisma/schema.prisma, package.json, or any config. Leave the build exactly as-is (the prisma db push --accept-data-loss build fix from before must stay untouched).
- Touch ONLY the single client component that renders the Overview tab's "Recent Signals" card.

THE ONE CHANGE (make exactly this, nothing more):
On the OVERVIEW tab, the "Recent Signals" card currently grows with its content, so scrolling the signal list scrolls the WHOLE PAGE. Change it so the signal list scrolls INSIDE the card only:
- Give the Recent Signals list container a fixed max height (e.g. max-h-96 / around 400px — pick a value that matches the existing card sizing and shows several rows) and make it vertically scrollable (overflow-y-auto), so its scrollbar is internal.
- The card itself, its header/title, its border, padding, and position must stay exactly as they are. Only the inner list region scrolls; the page and the card do not grow.
- Do NOT change the Recent Signals data, the row markup/content, or how signals are fetched or rendered — only the container's height/overflow.
- Apply this ONLY to the Recent Signals list on the Overview tab. Do not alter scrolling anywhere else (other tabs, other cards, the page).

AFTER IMPLEMENTING:
- Confirm you edited exactly ONE file and changed only the Recent Signals list container's max-height/overflow.
- Confirm the page no longer scrolls when scrolling the Recent Signals list — the scroll is contained inside the card.
- Confirm npm run build exits 0 and nothing else (styling, other tabs, buttons, Import screen, APIs, schema, build script) changed.
- Print the exact before/after of the lines you changed and the name of the file.
