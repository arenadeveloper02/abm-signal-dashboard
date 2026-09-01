# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-09-01T07:03:48.679Z.

## Overview

Fixed the failing build: completed the truncated app/api/delete-company/route.ts POST handler (TS1127/TS1005) and rebuilt the broken JSX tail of components/StoredSignalsDashboard.tsx (TS17008/TS1005), implementing the requested change so the Overview 'Total Companies' card navigates to the Companies tab instead of the Signals tab. prisma/schema.prisma echoed unchanged.

**Repository:** `abm-signal-dashboard`  
**File count:** 49

## Features

- Overview 'Total Companies' card now navigates to the Companies tab
- Complete delete-company API proxy route
- Stored signals dashboard with Overview, Companies, Signals, Trends and Insights tabs

## Tech Stack

- Next.js 16.2.12 (App Router)
- React 19.0.0
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

## Prisma Schema — STRICT: NEVER DROP OR DELETE COLUMNS

This section is binding on every edit. Vercel deploy runs `prisma db push` with **NO** `--accept-data-loss`. Dropping or altering a live column **fails the deploy**.

**FORBIDDEN (non-negotiable):**
- Do **not** delete, drop, omit, rename, or retype ANY existing column in `prisma/schema.prisma`
- Do **not** drop models or tables
- Do **not** "clean up", "simplify", or regenerate the schema from memory or from this summary
- Do **not** remove `createdAt` / `updatedAt` (or any other listed field) even if the UI no longer uses it

**ALLOWED:**
- ADD new models, columns, relations, or enums only
- New columns on existing models MUST be optional (`?`) or have `@default(...)`
- If the UI no longer needs a field, stop reading it in code — leave the column in the schema unchanged

**Immutable columns (must remain identical — same name, same type):**

- `AppSetting`: `key String`, `value String`, `createdAt DateTime`, `updatedAt DateTime`

## File Inventory

### App pages

- `app/access-denied/page.tsx`
- `app/arena-ds-tokens.css`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`

### API routes

- `app/api/all-stored-signals/route.ts`
- `app/api/analyze/route.ts`
- `app/api/delete-company/route.ts`
- `app/api/signals/route.ts`
- `app/api/stored-signals/route.ts`

### Components

- `components/AccountSignalTrackerClient.tsx`
- `components/Badges.tsx`
- `components/ChatWidget.tsx`
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
- `lib/fetch-all-stored-signals.ts`
- `lib/prisma.ts`
- `lib/resolve-request-email.ts`
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
- `app/api/delete-company/route.ts`
- `app/api/signals/route.ts`
- `app/api/stored-signals/route.ts`
- `app/arena-ds-tokens.css`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `components/AccountSignalTrackerClient.tsx`
- `components/Badges.tsx`
- `components/ChatWidget.tsx`
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
- `lib/fetch-all-stored-signals.ts`
- `lib/prisma.ts`
- `lib/resolve-request-email.ts`
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

- **Updated at:** 2026-09-01T07:03:48.679Z
- **Request:** STANDING RULE: Never modify prisma/schema.prisma. A previous edit dropped the updatedAt column from RefreshEvent and caused `prisma db push` to fail the Vercel build with a potential_dataloss error. Leave the schema file untouched.

Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

1. Overview tab — fix the navigation target of the "Total Companies" card.
   - In the Overview tab there is a stat card/block labelled "Total Companies". Clicking it currently navigates to the Signals tab.
   - Change it so clicking it navigates to the Companies tab instead.
   - This is a one-line change to the tab target of that card's existing click handler only. Do not change the card's label, value, icon, styling, layout, position, or the click handler's structure. Do not touch any other stat card on the Overview tab — their navigation targets must stay exactly as they are. Do not change the tab switching mechanism, the TabBar, or any tab component.

Only touch the files/functions directly related to the points above.
Do not change variable names, code style, or structure outside the scope of these changes.
Do not add extra features, optimizations, or refactors that weren't requested.
If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why.
