# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-27T07:02:01.329Z.

## Overview

ABM account signal tracker dashboard with Overview charts (weekly trend, type breakdown, top industries), click-to-filter Recent Signals feed, companies table, signals feed, trends and insights tabs.

**Repository:** `abm-signal-dashboard`  
**File count:** 47

## Features

- Overview KPI cards with sparklines
- Weekly Signal Trend bar chart (click to filter feed)
- Signal Type Breakdown pie chart (click to filter feed)
- Top Industries bar chart (click to filter table)
- Overview Recent Signals card with severity pills and internal scrolling
- Companies table with expandable signal history
- Signals feed with type/severity/family filters
- Trends and Insights tabs

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

- **Updated at:** 2026-08-27T07:02:01.329Z
- **Request:** SCOPE LOCK — OVERVIEW RESTORE ONLY. Obey exactly. This is a SURGICAL EDIT to the existing repo, NOT a regeneration.

BACKGROUND: A previous run removed three interactive charts from the OVERVIEW tab. This run must put them back and otherwise leave EVERYTHING as it currently is.

GOAL — OVERVIEW TAB ONLY:
Restore these THREE charts to the Overview tab exactly as they existed before (same positions, same styling, same interactivity), IN ADDITION to everything already on Overview (do not remove or move any existing Overview element — KPI cards, stat cards, Recent Signals card, etc. must all stay):
1) "Weekly Signal Trend (click point to filter feed)" — a BAR graph; clicking a bar/point filters the signal feed by that week.
2) "Signal Type Breakdown (click to filter feed)" — a PIE chart; clicking a slice filters the feed by that signal type.
3) "Top Industries by Signal Count (click to filter table)" — a BAR graph; clicking a bar filters the table by that industry.
All three are computed client-side from the already-loaded signals data. Keep the click-to-filter behavior working. Use recharts (already in the repo).

RECENT SIGNALS CARD (Overview ONLY — nowhere else):
The Overview "Recent Signals" card must render each signal row in THIS exact format (match the reference the user provided):
- Top row: a colored severity pill ("HIGH" red / "MEDIUM" orange / "LOW" green) next to a category pill (e.g. "C-Suite Change"), with the date right-aligned (e.g. "Aug 24, 2026").
- Company name as a bold blue link.
- Bold signal headline/title.
- One- or two-line description in grey.
- Bottom row: an industry tag pill (e.g. "Technology"), then location text, then the source as a blue link (e.g. "Google Blog", "CNBC", "Reuters").
- A colored left border on the card matching severity (red for HIGH).
- The card scrolls internally (fixed max-height + overflow-y-auto) so the page does not scroll.
Apply this row format ONLY in the Overview Recent Signals card. Do NOT change the row format anywhere else (Signals tab feed keeps its own current format).

STRICT DO-NOT-TOUCH (byte-for-byte unchanged):
- Do NOT change ANY tab other than Overview. The Signals tab, Trends tab, Companies tab, and Insights tab must stay EXACTLY as they currently are — do not edit, reformat, re-emit, or 'improve' them.
- Do NOT change header buttons, the Import screen, app/api/, lib/, prisma/schema.prisma, package.json, next.config, globals.css, or the build script (the `prisma db push --accept-data-loss` fix MUST remain).
- Do NOT add dependencies, env vars, new API routes, or new fetches. Do NOT change any request/response shape or parsing. Reuse ONLY data the app already fetches.
- Preserve the current theme, colors, fonts, and card styling.

EMPTY STATES: if a chart has no data, render an empty/'No data' state — never crash.

VERIFICATION (print all of this at the end):
- Confirm the Overview tab now shows all three charts: Weekly Signal Trend (bar, click-to-filter-feed), Signal Type Breakdown (pie, click-to-filter-feed), Top Industries by Signal Count (bar, click-to-filter-table) — in addition to all previously existing Overview elements (list them to prove nothing was removed).
- Confirm the Overview Recent Signals card uses the severity-pill + category-pill + date / blue company link / bold headline / grey description / industry tag + location + blue source format, scrolling inside its card.
- Confirm the Signals, Trends, Companies, and Insights tabs are UNCHANGED.
- Confirm header buttons, Import screen, app/api/, lib/, prisma/schema.prisma, package.json, and build script are UNCHANGED.
- Confirm `npm run build` exits 0.
- Print the list of files changed (should be only the Overview tab component) and the before/after of the key lines.
