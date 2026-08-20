# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-20T11:38:52.587Z.

## Overview

Arena-themed ABM Signal Tracker dashboard that fetches live signal data from a Sim workflow API via a server-side proxy route.

**Repository:** `abm-signal-dashboard`  
**File count:** 41

## Features

- Live data fetching from /api/signals server proxy (Sim workflow endpoint)
- Overview, Companies, Signals, Trends and Insights tabs
- Run selector and client email input in the header
- Loading skeletons, error state with Retry, and inline API error banners
- Refresh Dashboard button with refresh event logging via Prisma

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

- `app/api/signals/route.ts`

### Components

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
- `app/api/signals/route.ts`
- `app/arena-ds-tokens.css`
- `app/error.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
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

- **Updated at:** 2026-08-20T11:38:52.587Z
- **Request:** Update the existing ABM Signal Tracker dashboard app so it fetches its data from a live API instead of a static data module. Do not redesign the UI — keep the existing Arena dark theme, the top horizontal tab bar (Overview | Companies | Signals | Trends | Insights) and all existing components. Only change the data layer, plus the small additions listed at the end.

== API ==
Endpoint (POST):
https://sim.ai/api/workflows/5ecfc0da-795c-430d-be4e-48888ee6217a/execute

Headers:
  Content-Type: application/json
  X-API-Key: <sk-sim--yjpBU3_XaUJUQ5EOIb6xdthczVfR00J>

Body:
{
  "email": sakshi.mishra@position2.com,
  "runId": "",      // blank = all runs for that email
  "family": ""      // blank = all families; else one of funding | csuite | product | partnership
}

The endpoint requires a secret API key, so DO NOT call it directly from the browser. Create a Next.js server-side route handler at /api/signals that reads the key from a server environment variable, forwards the POST to the Sim endpoint, and returns the JSON to the client. The client components fetch /api/signals only. Add .env.example documenting ABM_API_KEY and NEXT_PUBLIC_DEFAULT_EMAIL.

== RESPONSE SHAPE ==
The API returns the workflow execution result; the dashboard payload is the response body (unwrap output/result if the executor nests it). Payload:
- meta: { email, runId, family, generatedAt, rowsReturned, rowsAllRuns, families[], availableRuns: [ { run_id, run_date, rows, families[] } ] }
- kpis: { companiesWithSignals, totalSignals, highAlerts, confidenceHigh, confidenceMedium, confidenceLow, csuiteChanges, funding, mergersAcquisitions, ipo, grants, debtFinancing, productLaunches, partnerships }
- byFamily: { funding, csuite, product, partnership }
- byType: { FUNDING_ROUND, IPO_SIGNAL, M_AND_A, GRANT, DEBT_FINANCING, PUBLIC_OFFERING, ... }
- byConfidence: { HIGH, MEDIUM, LOW, UNKNOWN }
- companies: [ { company, total, funding, csuite, product, partnership, high, latestDate } ]
- signals: [ { company, family, signal_type, date, source_name, source_url, summary, confidence, run_id, run_date } ]  // newest first
- insights: [ ...same shape as signals, HIGH confidence only, max 25 ]
- trends: { byRunDate: [ { date, total, funding, csuite, product, partnership } ], byMonth: [ { month, total, funding, csuite, product, partnership } ] }

Note: the KPI card previously bound to kpis.companiesTracked must now bind to kpis.companiesWithSignals, and its label should read COMPANIES WITH SIGNALS. Signal source fields renamed: signals[].source -> signals[].source_name and signals[].url -> signals[].source_url.

== BEHAVIOUR CHANGES ==
1. Fetch on mount and render loading skeletons while in flight. Show a clear error state with a Retry button if the request fails or returns a non-200.
2. The existing Refresh Dashboard button re-fetches from the API and shows the loading shimmer. Update the "Updated <timestamp>" in the header from meta.generatedAt on every successful fetch.
3. Add a run selector in the header, populated from meta.availableRuns, showing each run's date, row count and families. Selecting one re-fetches with that runId; an "All runs" option sends a blank runId and is the default.
4. Add an email/client input (or selector) in the header, defaulting to NEXT_PUBLIC_DEFAULT_EMAIL. Changing it re-fetches.
5. If the payload contains an error field (e.g. "email is required"), render that message as an inline banner instead of empty charts.
6. Handle the empty/zero-data case gracefully on every tab — zero states and flat baselines, never fabricated numbers.

CRITICAL: do not change the visual design, the Arena dark palette, or the top-tab layout. No left sidebar. Only the data layer and the additions above.
