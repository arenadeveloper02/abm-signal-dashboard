# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-27T05:24:46.964Z.

## Overview

ABM account signal tracking dashboard with company import, stored signal analytics, and a Trends tab featuring weekly, category, company, and type breakdown charts.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Stored signal dashboard with Overview, Companies, Signals, Trends and Insights tabs
- Trends tab with 8-week trend, category, top-10 company and type breakdown charts
- Click-to-filter signal feed by category
- CSV/XLSX company import with background analysis

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

- **Updated at:** 2026-08-27T05:24:46.964Z
- **Request:** SCOPE LOCK — obey exactly:
- SURGICAL EDIT to an existing repo, NOT a regeneration. Preserve every existing file byte-for-byte except the change below.
- Do NOT change the theme, colors, fonts, card styling, or any other component.
- Do NOT refactor, rename, reorder, reformat, or "clean up" anything.
- Do NOT add new dependencies EXCEPT: if the project already uses a chart library (e.g. recharts/chart.js), reuse it. Only if NO chart library exists may you add ONE (recharts) — otherwise reuse what's there. Do not add anything else.
- Do NOT add env vars, config, or new API routes.
- Do NOT change any API endpoint, request/response shape, data-fetching logic, or response parsing. Reuse ONLY data the app already fetches (the stored-signals response: signals with company, category/family, alert level, and date fields).
- Do NOT touch any file under app/api/ or lib/, the Overview tab, the Companies tab, the Signals tab, the Insights tab, the header buttons, or the Import screen.
- Do NOT modify prisma/schema.prisma, package.json (except the single chart lib add if truly required), or the build script (the prisma db push --accept-data-loss build fix must stay).
- Touch ONLY the single client component that renders the TRENDS tab (plus package.json ONLY if a chart lib must be added).

THE ONE CHANGE (make exactly this, nothing more):
Replace/populate the TRENDS tab to contain exactly these FOUR charts, computed client-side from the signals the app already has (do NOT add new fetches). Lay them out in a responsive 2-column grid (stack on mobile), each in a card matching the existing card styling.

1) "Weekly Signal Trend (8 Weeks)" — BAR chart
 - X axis: the last 8 weeks (bucket signals by their date into week buckets, oldest→newest).
 - Y axis: count of signals in each week.
 - Label each bar with the week (e.g. "Aug 4", "Aug 11" or "W1..W8").

2) "Signals by Category" — BAR chart (click bar to filter feed)
 - X axis: signal categories/families (partnership, funding, csuite, product, etc. — use whatever category field the signals already have).
 - Y axis: count per category.
 - CLICK behavior: clicking a bar filters the signal feed by that category. Reuse the EXISTING category-filter mechanism/state the app already uses (e.g. the Signals tab filter or a shared filter state) — do NOT invent a new API call. If a shared filter setter exists, call it with the clicked category and switch to the feed/Signals view; if none exists, at minimum highlight the selected category and show a filtered list inline. Do not break if a category has zero signals.

3) "Top 10 Companies by Signal Count" — horizontal BAR chart
 - Aggregate signals by company name, take the top 10 by count, sort descending.
 - Show company name + count per bar.

4) "Signal Type Breakdown" — PIE chart
 - Slices = signal type/category distribution (percentage of total).
 - Show a legend with type name + count/percentage.

Requirements:
- All four charts derive from the SAME already-loaded signals array. No new API routes, no new fetches, no schema changes.
- If a chart has no data, render the card with an empty/"No data" state — do not crash.
- Use the existing severity/category colors if the app already defines them; otherwise use neutral defaults consistent with the theme. Do not introduce a new color theme.
- Keep it responsive and match existing card padding/spacing.

AFTER IMPLEMENTING:
- Confirm the Trends tab now shows exactly these four charts and nothing else was changed.
- Confirm charts are computed from already-loaded signal data (no new API/endpoint/fetch/parse/schema changes).
- Confirm clicking a bar in "Signals by Category" filters the feed via the existing filter mechanism.
- Confirm you edited only the Trends tab component (and package.json only if a chart lib had to be added).
- Confirm npm run build exits 0.
- Print the file(s) changed and the before/after of the key lines (the four chart blocks + the category-click handler).
