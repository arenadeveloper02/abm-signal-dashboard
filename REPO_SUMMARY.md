# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T18:13:51.849Z.

## Overview

ABM account signal tracker dashboard. Fixed the broken/truncated StoredSignalsDashboard.tsx (unclosed JSX tags and invalid character that failed next build) and restored the Recent Signals card's inner padding (p-5, matching sibling cards) while keeping the internal max-h-96 overflow-y-auto scroll region.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Overview tab with KPI cards, weekly severity chart, signal-type donut, and a padded Recent Signals card with internal scrolling
- Companies tab with expandable company detail rows
- Signals feed with type and week filters
- Trends tab with weekly severity volume chart
- Insights tab grouping high-severity signals by family

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

- **Updated at:** 2026-08-26T18:13:51.849Z
- **Request:** SCOPE LOCK — obey exactly:
- SURGICAL EDIT to an existing repo, NOT a regeneration. Preserve every existing file byte-for-byte except the single fix below.
- Do NOT change the theme, colors, fonts, layout, card borders, or any other component.
- Do NOT refactor, rename, reorder, reformat, or "clean up" anything.
- Do NOT add dependencies, env vars, config, or new API routes.
- Do NOT touch any file under app/api/ or lib/, the Companies tab, the Signals tab, the Trends tab, the Insights tab, the buttons, or the Import screen.
- Do NOT change any API endpoint, data-fetching, parsing, prisma/schema.prisma, package.json, or the build script (the prisma db push --accept-data-loss fix must stay).
- Touch ONLY the single client component that renders the Overview tab, specifically the "Recent Signals" card.

THE PROBLEM:
A previous edit that added an internal max-height + overflow-y-auto scroll region to the "Recent Signals" card REMOVED / lost the card's inner padding, so the content now touches the card edges.

THE ONE FIX (make exactly this, nothing more):
- Restore the "Recent Signals" card's inner padding to match the OTHER cards on the dashboard (use the exact same padding class the sibling cards use — e.g. p-6 / the value they use — do not invent a new value).
- Keep the internal scroll behavior working: the signal list must still have its fixed max-height and overflow-y-auto so it scrolls INSIDE the card and not the whole page.
- Make sure padding sits on the card container so the header/title AND the scrollable list are both inset, while the scroll region itself still scrolls correctly (do not let the scrollbar sit awkwardly outside the padding if the other cards don't).
- Do NOT change anything else about the card, the data, the list rows, or any other card.

AFTER IMPLEMENTING:
- Confirm the Recent Signals card padding now matches the other cards, and the internal scroll still works (page does not scroll).
- Confirm you edited exactly ONE file and only the Recent Signals card's padding/scroll wrapper.
- Confirm npm run build exits 0 and nothing else changed.
- Print the before/after of the changed lines and the file name.
