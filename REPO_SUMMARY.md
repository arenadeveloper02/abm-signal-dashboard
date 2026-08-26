# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T07:40:51.889Z.

## Overview

Fixed build errors: components/AccountSignalTrackerClient.tsx had a literal \n escape inside the subtitle ternary (TS1127/TS1005) and components/StoredSignalsDashboard.tsx had unclosed JSX (TS17008). Both files were completed with valid JSX preserving the requested behavior: auto-load stored signals on first load via /api/all-stored-signals (API key from ABM_ALL_SIGNALS_API_KEY/ABM_API_KEY env vars, no cookies), loading state while in flight, upload screen as fallback and via the 'Upload Different File' button, no company table on the default auto-loaded view (Remove company lives in the post-upload table only). prisma/schema.prisma is echoed unchanged.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Auto-load stored signals on initial page load (offset 0) via /api/all-stored-signals proxy using X-API-Key from env only
- Loading state while initial fetch is in flight; upload screen fallback on failure/empty data
- Upload Different File button re-opens the drag-and-drop upload screen
- Default view goes straight to the Stored Signals Dashboard (Overview/Companies/Signals/Trends/Insights) with no standalone company table
- Remove company functionality preserved in the post-upload company table
- Light theme preserved throughout (white surfaces, light borders, dark text)

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

- **Updated at:** 2026-08-26T07:40:51.889Z
- **Request:** STANDING RULE: Never modify prisma/schema.prisma. A previous edit dropped the updatedAt column from RefreshEvent and caused `prisma db push` to fail the Vercel build with a potential_dataloss error. Leave the schema file untouched.

STANDING RULE — THEME LOCK: The current light theme (white/light-gray backgrounds, dark text, light-tinted colored-border stat cards, charts on white background) is correct and must not change. Do not introduce dark mode anywhere, on this page or elsewhere, as part of these changes.

Changes to implement:

1. === INITIAL PAGE LOAD ===

Currently, on first load, the page shows an "Upload your company list" drag-and-drop screen when no data is present.

Change this: on initial page load, instead of showing the upload screen, automatically call the following API to fetch existing stored company/signal data:

curl -  curl --location 'https://agent.thearena.ai/api/workflows/8983ed27-5c88-4505-9847-ad4ed0deaf65/execute' \
--header 'X-API-Key: sk-sim-u3_2d6AaWsa4zd2yoaaw9IyWfpHVTi_F' \
--header 'Content-Type: application/json' \
--header 'Cookie: AWSALB=/AcIW9qrLA+5V38qQIL9WNX/o13EoptpTvsqLUqr1ee1jNw7UGDu8VYwXwj+tGLGEKbE6wAipubttw7HY8ALGqUa1UZesEaph1d5zV7xSr8PZfJ6qL1OcLNXnP4x; AWSALBCORS=/AcIW9qrLA+5V38qQIL9WNX/o13EoptpTvsqLUqr1ee1jNw7UGDu8VYwXwj+tGLGEKbE6wAipubttw7HY8ALGqUa1UZesEaph1d5zV7xSr8PZfJ6qL1OcLNXnP4x' \
--data '{"limit":42,"offset":42,"includeSignals":true}'

Notes on this call:
- Use offset: 0 on initial load so it returns the full/first set of existing companies, not a skipped page. Do not copy any specific offset value verbatim — start from 0.
- Choose a reasonable default "limit" (e.g. matching whatever the app currently uses elsewhere for a "load all" call, or a high enough value to get the full existing dataset in one call). If the API is paginated and there's already pagination-handling logic elsewhere in the codebase, reuse that pattern rather than inventing a new one.
- Store the API key as an environment variable if it isn't already; do not commit it in source. Flag if a suitable env var doesn't already exist so it can be added to the deployment config.
- Cookies (AWSALB/AWSALBCORS) shown in the example curl are session-specific artifacts from testing and should NOT be copied into the code — the request should rely only on the X-API-Key header for auth.

The response from this call should be used to populate the dashboard exactly as "Load Stored Signals" currently does — i.e. this replaces the need for the user to click that button on first load; reuse that existing loading/rendering logic rather than writing new logic.

While this initial call is in flight, show the existing loading state (or a minimal equivalent) rather than the upload screen.

If the API call fails or returns no companies, fall back to showing the current "Upload your company list" screen (so the upload flow still works as a fallback).

2. === "UPLOAD DIFFERENT FILE" BUTTON ===

Keep the "Upload Different File" button's current behavior unchanged: clicking it should show the same "Upload your company list" drag-and-drop screen that currently appears on first load (see image 2 in the reference screenshots). Do not change this screen's design, copy, or logic — only ensure it's reachable via this button instead of being the default first-load view.

3. === REMOVE COMPANY TABLE FROM DEFAULT VIEW ===

Currently, above the "Stored Signals Dashboard" panel, there is a company table (columns: Company, Location, Action) listing the loaded companies with "Remove" links.

Remove this table from the default/initial view. After the automatic API call in point 1 succeeds, the page should go straight to showing the "Stored Signals Dashboard" panel (Overview/Companies/Signals/Trends/Insights tabs etc.) — do not show the standalone company table above it.

Do not delete the underlying company-list data/state itself if it's used elsewhere (e.g. by the "Companies" tab inside the dashboard, or by "Remove" functionality) — only remove this specific table from being rendered on the default view. If "Remove company" functionality currently only exists in this table and nowhere else, flag this instead of silently dropping that functionality, so we can decide where it should live (e.g. inside the Companies tab).

Only touch the files/functions directly related to the points above.
Do not change variable names, code style, or structure outside the scope of these changes.
Do not add extra features, optimizations, or refactors that weren't requested.
Do not introduce dark mode anywhere in the codebase.
Do not hardcode the API key or session cookies into any source file — use environment variables and flag if one needs to be added.
If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why — including where the API key env var was added/expected, and where "Remove company" functionality now lives if it was affected by removing the table.
