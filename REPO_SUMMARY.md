# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T08:56:04.310Z.

## Overview

Fixed the Recent Signals (last 90 days) card in components/StoredSignalsDashboard.tsx so the signal list scrolls internally (max-h-[480px] + overflow-y-auto on the <ul> list container inside the card) while the card header (title, filter chips, count badge) stays fixed at the top of the card. Only the feed list container inside that one card gained the scroll classes; card padding/border/colors and all other sections (stat cards, Weekly Signal Trend, Signal Type Breakdown, Top Industries, tabs) are visually unchanged. prisma/schema.prisma was intentionally NOT returned: the baseline schema file was not provided in this edit context and the standing rule forbids modifying or regenerating it from memory — omitting it leaves the deployed schema byte-for-byte unchanged. Changed file: components/StoredSignalsDashboard.tsx — the Recent Signals section's list element now has className "mt-3 max-h-[480px] space-y-3 overflow-y-auto pr-1" (previously no max-height/overflow), and the header row is outside the scroll container so it never scrolls away.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Recent Signals (last 90 days) card now scrolls internally instead of stretching the page
- Fixed card header (title, count badge, active filter chips) stays visible while the feed scrolls
- Light theme preserved exactly — no styling changes beyond the internal scroll container
- All other overview charts, stat cards, tabs and page layout untouched

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

- **Updated at:** 2026-08-26T08:56:04.310Z
- **Request:** STANDING RULE: Never modify prisma/schema.prisma.

STANDING RULE — THEME LOCK: Keep the current light theme exactly as-is (white/light-gray backgrounds, dark text, light-tinted colored-border stat cards). Do not introduce dark mode or change any other styling.

Changes to implement:

1. === RECENT SIGNALS (LAST 90 DAYS) CARD — FIX SCROLL BEHAVIOR ===

In the Overview tab, the "Recent Signals (last 90 days)" card currently has no internal scroll — when the list of signals is long, the whole page scrolls to show them, instead of the list scrolling within the card's own boundary.

Fix this so that:
- The card itself has a fixed/max height (matching its current visual size — do not resize the card or change its width/padding/border/header styling).
- The signal list INSIDE the card becomes independently scrollable (vertical scroll, e.g. `overflow-y-auto` with a `max-height` on the list container) once it exceeds the card's visible area.
- The card's header (title, count badge, "last 90 days" note) stays fixed/visible at the top of the card and does not scroll away.
- The rest of the page (stat cards, other charts, page layout) is unaffected and does not need to scroll to see the whole feed — scrolling only happens inside this one card.

Only touch the specific component/section rendering this "Recent Signals" card and its list — do not change the stat cards, other charts (Weekly Signal Trend, Signal Type Breakdown, Top Industries), tabs, or any other part of the page.

Do not change the visual styling of the card (colors, borders, spacing, fonts) beyond adding the internal scroll container.
Do not change variable names, code style, or structure outside the scope of this change.
Do not add extra features, optimizations, or refactors that weren't requested.
Do not introduce dark mode anywhere in the codebase.
If this requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why.
