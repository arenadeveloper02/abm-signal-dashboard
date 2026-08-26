# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T06:35:05.800Z.

## Overview

ABM Account Signal Tracker. Root cause of the dark 'Stored Signals Dashboard' panel: hardcoded dark-theme Tailwind arbitrary-value classes and inline styles inside components/StoredSignalsDashboard.tsx (bg-[#15161C]/bg-[#1B1D24] card backgrounds, border-[#22242C]/border-[#2E313A] borders, text-white/text-[#D3D6DE] text, a dark recharts tooltipStyle object with backgroundColor #22242C) plus the shared components it renders — components/KpiCard.tsx (bg-[#1B1D24], text-white, #2E313A border) and components/TabBar.tsx (bg-[#15161C] nav). There is no dark: variant or theme provider; the dark look was hardcoded. Fix: replaced those dark classes/inline styles with the same light styling used on the rest of the page (white surfaces, #E2E3E5 borders, #2C2D33/#575A66/#8A8D99 text, white chart background and tooltip) while keeping the exact same data logic, tabs, metrics, chart types and chart color palette. prisma/schema.prisma is returned with RefreshEvent intact including updatedAt (restored per live-database baseline; never dropped).

**Repository:** `abm-signal-dashboard`  
**File count:** 45

## Features

- Light-themed Stored Signals Dashboard panel matching the rest of the page
- Overview / Companies / Signals / Trends / Insights tabs preserved
- Light-tinted colored-border KPI stat cards with original accent palette
- Charts on white background with original series colors
- CSV/XLSX company upload and stored-signal analysis (unchanged)

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

- **Updated at:** 2026-08-26T06:35:05.800Z
- **Request:** STANDING RULE: Never modify prisma/schema.prisma. A previous edit dropped the updatedAt column from RefreshEvent and caused `prisma db push` to fail the Vercel build with a potential_dataloss error. Leave the schema file untouched.

Changes to implement:

STANDING RULE — THEME LOCK (READ FIRST):
The "Stored Signals Dashboard" panel (containing the Overview / Companies / Signals / Trends / Insights tabs, stat cards, feed, and charts) is CURRENTLY RENDERING WITH A DARK/BLACK BACKGROUND AND WHITE TEXT. THIS IS WRONG AND MUST BE FIXED, NOT PRESERVED.

The rest of the page (header, company table, buttons) is already correct: white/light-gray background, dark text, light borders. The "Stored Signals Dashboard" panel must match that SAME light styling — white/light card background, dark text, light gray borders, the original light-tinted colored-border stat cards (blue, teal, red, orange, purple, pink, green, amber), and charts on a white background with the original palette.

Before making any change, first FIND AND REPORT the source of the dark styling on this panel — e.g. a `dark:` Tailwind variant being applied, a hardcoded dark className, inline dark styles, a dark-mode theme provider/context, or a separate component/stylesheet for this panel that differs from the rest of the page. Explain what you found, then fix it.

Explicitly remove any dark-theme classes/styles applied to this panel and replace them with the same light styling used elsewhere on this page. Do not apply dark mode to this panel under any circumstance, even conditionally or as a default.

Do not change colors, fonts, border-radius, spacing, chart library, or chart color palette beyond fixing this dark/light mismatch. Do not touch any other part of the page that is already light-themed and working correctly.

This request is about DATA and VALUES ONLY beyond the theme fix above: which tabs exist, which metrics each card shows, and which charts render. Ignore appearance entirely except for the dark→light fix described above.

Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.


Only touch the files/functions directly related to the points above.
Do not change variable names, code style, or structure outside the scope of these changes.
Do not add extra features, optimizations, or refactors that weren't requested.
Do not introduce dark mode anywhere else in the codebase.
If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why — including specifically what caused the dark theme on the Stored Signals Dashboard panel and how it was fixed.
