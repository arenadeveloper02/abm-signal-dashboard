# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T10:27:31.217Z.

## Overview

ABM account signal tracker: upload a company list (CSV/XLSX) or view all stored companies, and explore funding, C-suite, product and partnership signals in a tabbed dashboard.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Landing loads the all-companies stored-signals dashboard automatically
- Upload a CSV/XLSX company list to scope the same dashboard to those companies
- Analyze Signals runs against the currently scoped company set
- Tabbed dashboard with KPI cards, severity, type, industry and trend charts
- Arena iframe email gating with access-denied page

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

- **Updated at:** 2026-08-26T10:27:31.217Z
- **Request:** SCOPE LOCK — obey exactly:
- SURGICAL EDIT to an existing repo, NOT a regeneration. Preserve every existing file byte-for-byte unless it is in the allowlist below.
- Do NOT modify prisma/schema.prisma under any circumstance.
- Do NOT change theme, colors, fonts, layout spacing, or add dark mode.
- Do NOT refactor, rename, reorder, reformat, or "clean up" any file not in the allowlist.
- Do NOT add dependencies, env vars, config, or API routes.
- Do NOT change any file under app/api/ — no changes to endpoints, upstream URLs, API keys/env var handling, or response parsing.
- Do NOT change the dashboard tabs/charts themselves (StoredSignalsDashboard.tsx internals) beyond passing it different data.
- Touch ONLY the file(s) in the allowlist.

FILES YOU MAY EDIT (allowlist — nothing else):
- components/AccountSignalTrackerClient.tsx
(If the company table, buttons, or upload flow genuinely live in a different file, STOP and report which file before editing — do not silently edit outside this list.)

THE CHANGES (make exactly these, nothing more):

1. LANDING = DASHBOARD FOR ALL COMPANIES, NO TABLE, EVER:
On initial page load, go straight to the dashboard populated with ALL companies' data. Never show the upload screen or an empty state first (an error fallback if the fetch genuinely fails is fine). This already calls fetch('/api/all-stored-signals', ...) on mount — do NOT change this endpoint or its call shape, only fix the render branching if needed so the dashboard reliably shows first.

The COMPANY / LOCATION / ACTION table with Remove buttons must be deleted entirely and must never render, in any state — not on landing, and not after uploading a file either. There is no scenario where this table should appear.

2. UPLOAD DIFFERENT FILE — SAME UI, DIFFERENT DATA SCOPE:
Clicking "Upload Different File" opens the existing drag-and-drop upload screen. Once the user uploads a valid company list, the app must show the SAME dashboard UI (same layout, same tabs, same charts, same components as the all-companies view) but scoped to ONLY the companies from that uploaded file. Do not show the company table for this case either — go straight from "file uploaded" to "dashboard filtered to those companies."

3. BUTTONS:
Keep "Upload Different File", "Analyze Signals", and "Load Stored Signals" together in the action row, exactly as positioned now. Do not remove, rename, or reposition any button.

4. ANALYZE SIGNALS — SCOPE FOLLOWS CURRENT CONTEXT:
"Analyze Signals" always analyzes whichever companies are currently in scope:
   - If the user has not uploaded a file (still on the default all-companies view), Analyze Signals analyzes ALL companies.
   - If the user has uploaded a file via "Upload Different File," Analyze Signals analyzes only the companies from that uploaded file.
There is no manual per-company checkbox/selection UI — "selected companies" means whichever set (all, or uploaded) is currently active. Do NOT change how the analyze API/fetch call itself is invoked, its endpoint, or what it returns — only change which companies are passed into it based on current scope.

DO NOT CHANGE:
- Any file under app/api/ or lib/ — API endpoints, fetch logic, response parsing, or upstream URLs/keys.
- The dashboard tabs, charts, metrics, or their internal rendering logic (StoredSignalsDashboard.tsx) — only the data/company scope passed into it should differ.
- The visual theme, colors, spacing, or component styling.

AFTER IMPLEMENTING:
- List every file you modified. If anything outside the allowlist appears, revert it.
- Confirm prisma/schema.prisma is byte-for-byte unchanged.
- Confirm no file under app/api/ was touched.
- Confirm: (a) app opens straight to the all-companies dashboard with no table, (b) uploading a file shows the same dashboard UI scoped to just those companies with no table, (c) Analyze Signals uses all companies by default or the uploaded set if a file was uploaded.
- Print the final contents of each file you changed.
