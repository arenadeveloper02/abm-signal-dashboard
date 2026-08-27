# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-27T05:46:06.555Z.

## Overview

ABM account signal tracker dashboard with signals feed, severity/type charts and at-a-glance stats computed from already-loaded signal data.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Signals tab with severity mix pie chart
- Signals tab with horizontal signal-type bar chart
- At-a-glance stat card (total, last 7 days, distinct companies)
- Scrollable signal feed inside its own card
- Overview KPI cards with sparklines
- Companies table with expandable signal history

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

- **Updated at:** 2026-08-27T05:46:06.555Z
- **Request:** SCOPE LOCK — obey exactly:
- SURGICAL EDIT to an existing repo, NOT a regeneration. Preserve every existing file byte-for-byte except the change below.
- Do NOT change the theme, colors, fonts, card styling, or any other component.
- Do NOT refactor, rename, reorder, reformat, or "clean up" anything.
- Do NOT add new dependencies. Reuse the chart library the app already uses (recharts) for the charts. Do not add anything else.
- Do NOT add env vars, config, or new API routes.
- Do NOT change any API endpoint, request/response shape, data-fetching logic, or response parsing. Reuse ONLY data the app already fetches (the stored-signals response: signals with company, category/family, alert level/severity, and date fields).
- Do NOT touch any file under app/api/ or lib/, the Overview tab, the Companies tab, the Trends tab, the Insights tab, the header buttons, or the Import screen.
- Do NOT modify prisma/schema.prisma, package.json, or the build script (the prisma db push --accept-data-loss build fix must stay).
- Touch ONLY the single client component that renders the SIGNALS tab.

THE ONE CHANGE (make exactly this, nothing more):
Restructure the SIGNALS tab to add a top section with THREE cards, then the existing signal list BELOW it. Everything computed client-side from the signals the app already has (no new fetches). Match existing card styling/padding.

TOP SECTION — a responsive row of 3 cards (stack on mobile):

1) "⚡ Severity mix" — PIE chart
 - Slices = distribution of signals by severity/alert level (high / medium / low).
 - Use the existing severity colors if defined (high=red, medium=orange/yellow, low=green); otherwise neutral defaults.
 - Legend with level name + count.

2) "📊 Signal types" — HORIZONTAL BAR chart
 - One bar per signal type/category/family (partnership, funding, csuite, product, etc. — use whatever category field the signals already have).
 - Bar length = count per type; label each bar with the type name + count. Sort descending.

3) "📡 At a glance" — a stat card with THREE big numbers, each with a small caption below:
 - Big number = total number of signals (all loaded signals) — caption "total signals"
 - Big number = count of signals dated within the LAST 7 DAYS (bucket by each signal's date field) — caption "in the last 7 days"
 - Big number = number of DISTINCT companies that have at least one signal — caption "companies with signals"
 - Do not hardcode these numbers; compute them from the loaded signals array.

BELOW THE TOP SECTION:
- Keep the existing signals list/feed exactly as it already works (same rows, same filters).
- Make the signal list SCROLL INSIDE ITS OWN CARD (fixed max-height + overflow-y-auto), the SAME way the Overview tab's "Recent Signals" card scrolls — so the list scrolls internally and the whole page does not scroll. Match the Overview card's max-height/scroll approach and padding.

Requirements:
- All values/charts derive from the SAME already-loaded signals array. No new API routes, no new fetches, no schema changes.
- If a chart/stat has no data, render the card with an empty/"No data" or 0 state — do not crash.
- Keep it responsive and match existing card padding/spacing.

AFTER IMPLEMENTING:
- Confirm the Signals tab now shows: Severity mix (pie), Signal types (horizontal bar), At a glance (3 stats), then the scrollable signal list below.
- Confirm the signal list scrolls inside its card like the Overview page (page does not scroll).
- Confirm the three "At a glance" numbers are computed from loaded signal data, not hardcoded.
- Confirm you edited only the Signals tab component. Confirm npm run build exits 0.
- Print the file changed and the before/after of the key lines (the 3 top cards + the scroll wrapper on the list).
