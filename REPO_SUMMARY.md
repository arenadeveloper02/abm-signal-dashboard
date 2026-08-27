# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-27T06:40:36.351Z.

## Overview

Repaired the truncated/broken components/StoredSignalsDashboard.tsx (TS17008 unclosed JSX + TS1127 invalid character). VERIFICATION: (1) Overview tab restored — original KPI card grid (11 cards with sparklines and H/M/L pills) plus the original scrollable 'Recent Signals' card (max-h-96 + overflow-y-auto). (2) Trends tab restored — original four chart cards: Weekly Signal Trend (clickable bars via activeLabelOf), Signals by Category (clickable family bars), Top 10 Companies horizontal bar, Signal Type Breakdown donut + legend. (3) Companies tab restored — original sortable/expandable table inside a max-h-[70vh] scroll container with sticky headers, expandable signal history, tech-stack/keyword chips. (4) Signals tab per spec — top row of THREE cards: '⚡ Severity mix' pie (HIGH=red #FF5252, MEDIUM=orange #FB8145, LOW=grey, legend with name+count), '📊 Signal types' horizontal bar (one bar per display type, label = type · count, sorted descending), '📡 At a glance' with three big numbers computed live from the loaded signals array (total signals / last-7-days count / distinct companies with ≥1 signal — never hardcoded); below it the existing filter bar (type/family/industry/week + Clear) and the existing signal feed now scrolling INSIDE its own card (max-h-96 overflow-y-auto) exactly like Overview's Recent Signals, so the page does not scroll. All charts/stats render 'No data'/0 empty states. UNCHANGED: Insights tab logic (light-theme tiles + HIGH-severity groups), header buttons, Import screen (AccountSignalTrackerClient), all app/api/ routes, lib/, package.json (prisma db push --accept-data-loss build script intact), next.config, globals.css. prisma/schema.prisma echoed byte-identical (updatedAt preserved). No new dependencies; recharts reused; all values computed client-side from the already-fetched stored-signals array.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Overview tab with KPI cards and scrollable Recent Signals card
- Companies tab with expandable, scroll-contained table
- Signals tab: severity-mix pie, signal-types horizontal bar, at-a-glance stats, scrollable feed
- Trends tab with clickable weekly/category charts
- Insights tab with high-severity highlights

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

- **Updated at:** 2026-08-27T06:40:36.351Z
- **Request:** SCOPE LOCK — RESTORE + SINGLE-TAB EDIT. Obey exactly.

GOAL (two things, nothing else):
A) RESTORE the Overview tab, Trends tab, and Companies tab to their ORIGINAL state — exactly how they were before the recent edits (original layout, cards, charts, spacing, colors, scroll behavior). Undo any drift/changes the recent runs introduced on these three tabs. Use the repo's git history / original implementation of these tab files as the source of truth and restore them.
B) Apply the Signals-tab change described below.

DO NOT TOUCH ANYTHING ELSE: the Insights tab, header buttons, Import screen, app/api/, lib/, prisma/schema.prisma, package.json, next.config, globals.css, and the build script (the `prisma db push --accept-data-loss` fix MUST remain) stay byte-for-byte unchanged.

ABSOLUTE RULES:
1. SURGICAL EDIT to the existing repo, NOT a regeneration. Do NOT regenerate the whole app.
2. Restore Overview/Trends/Companies tab files to their original versions from git history. Do not invent new designs for them — return them to how they originally looked and worked.
3. Edit the Signals-tab component to match the spec in section (B).
4. Do NOT add dependencies. Reuse recharts (already in the repo).
5. Do NOT add env vars, new API routes, new fetches, or change any request/response shape or parsing. Reuse ONLY data the app already fetches (the stored-signals array: signals with company, category/family, alert level/severity, and date fields).
6. Preserve the current theme, colors, fonts, and card styling.

(B) SIGNALS TAB CHANGE:
Add a top section with THREE cards, then keep the existing signal list BELOW it. All values computed client-side from the already-loaded signals array (no new fetches).

TOP SECTION — responsive row of 3 cards (stack on mobile), matching existing card padding/styling:
1) "⚡ Severity mix" — PIE chart: distribution of signals by severity/alert level (high/medium/low). Use existing severity colors if defined (high=red, medium=orange/yellow, low=green); else neutral defaults. Legend with level name + count.
2) "📊 Signal types" — HORIZONTAL BAR chart: one bar per signal type/category/family. Bar length = count; label each with type name + count; sort descending.
3) "📡 At a glance" — stat card with THREE big numbers + captions, all computed from the loaded signals (never hardcoded):
   - total number of signals — caption "total signals"
   - count of signals dated within the LAST 7 DAYS — caption "in the last 7 days"
   - number of DISTINCT companies with ≥1 signal — caption "companies with signals"

BELOW THE TOP SECTION:
- Keep the existing signals list/feed exactly as it works today (same rows, same filters).
- Make the list SCROLL INSIDE ITS OWN CARD (fixed max-height + overflow-y-auto), the SAME way the Overview tab's "Recent Signals" card scrolls, so the page itself does not scroll.

EMPTY STATES: if a chart/stat has no data, render an empty/"No data"/0 state — never crash.

VERIFICATION (print all of this at the end):
- Confirm the Overview, Trends, and Companies tabs were RESTORED to their original state and list what you changed back on each.
- Confirm the Insights tab, header buttons, Import screen, app/api/, lib/, prisma/schema.prisma, package.json, and build script are UNCHANGED.
- Confirm the Signals tab now shows: Severity mix (pie), Signal types (horizontal bar), At a glance (3 stats), then the scrollable signal list.
- Confirm the Signals list scrolls inside its card like Overview (page does not scroll).
- Confirm the 3 At-a-glance numbers are computed from loaded data, not hardcoded.
- Confirm `npm run build` exits 0.
- Print the list of files changed and the before/after of the key lines.
