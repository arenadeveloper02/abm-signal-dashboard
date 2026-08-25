# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-25T11:46:02.097Z.

## Overview

Added a 'Fetch Stored Signals' secondary button next to Analyze in components/AccountSignalTrackerClient.tsx (new state, handler, summary line, signals table, unmatched note, EmptyState reuse); added new proxy route app/api/stored-signals/route.ts posting {companies:[{company_name}],limit:1000} to the ABM Signal Read API using the same ABM_API_KEY env var pattern as the Analyze route; added StoredSignal/StoredSignalsCounts/StoredSignalsResult types to lib/types.ts; echoed prisma/schema.prisma and lib/actions.ts unchanged.

**Repository:** `abm-signal-dashboard`  
**File count:** 44

## Features

- Fetch Stored Signals button (secondary/outline) beside Analyze, disabled with no companies or while either request is in flight
- Server proxy route for the ABM Signal Read API reusing the existing ABM_API_KEY env variable
- Summary line with total, returned and per-family counts from counts_by_family
- Signals table: Company, Family, Signal Type, Summary, Confidence, Announcement Date, Last Seen, Source link
- Muted note listing unmatched_inputs with no stored signals
- EmptyState reuse when no stored signals exist for selected companies

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

- **Updated at:** 2026-08-25T11:46:02.097Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

1. Add a second button next to the existing "Analyze" button, labelled "Fetch Stored Signals". It must sit in the same button row/toolbar, reuse the existing button component and styling (secondary/outline variant so Analyze stays primary), and be disabled while no companies have been added or while either request is in flight.

2. On click, call the ABM Signal Read API with the companies currently added in the UI.

   Endpoint (reference curl):
 X-API-key - sk-sim-7ZRyyvwQvKY0szOTZzBH4tnsokm-JJAo

   curl -X POST \
     -H "X-API-Key: $SIM_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"companies":[{"company_name":"Acer Incorporated"}],"limit":1000}' \
     https://agent.thearena.ai/api/workflows/136226a3-03d4-439f-9e3d-a9fdcb47a3f7/execute

   - Method: POST to https://agent.thearena.ai/api/workflows/136226a3-03d4-439f-9e3d-a9fdcb47a3f7/execute
   - Headers: X-API-Key read from the SAME environment variable the existing Analyze call already uses (do not hardcode the key, do not introduce a new env var), and Content-Type: application/json.
   - Body: ONLY these two fields — a "companies" array of objects each containing just "company_name", built from the companies added in the UI, and "limit": 1000. Do NOT send website, companyKeys, runId, signalFamily, offset, or any other field.

   Example body with multiple companies:

   {
     "companies": [
       { "company_name": "Realme" },
       { "company_name": "VIT" },
       { "company_name": "Jazz Hipster Corp" },
       { "company_name": "Shenzhen Absen Optoelectronic Co.,Ltd." }
     ],
     "limit": 1000
   }

3. Response handling — mirror the Analyze button's existing loading/error/response pattern (same loading indicator treatment, same error toast/banner component, and unwrap the response envelope the same way the Analyze handler already does). The API response body has this shape: { total, returned, limit, offset, requested_count, matched_count, unmatched_count, counts_by_family: { funding, csuite, product, partnership }, matched_companies: [ { input, company_id, company_name, company_key, total, by_family } ], unmatched_inputs: [...], companies: [ { company_id, company_name, company_key, domain, website, industry, hq, total, by_family } ], signals: [ { id, company_id, company_name, company_key, signal_family, signal_key, signal_type, company, summary, source_name, source_url, confidence, announcement_date, run_id, run_date, first_seen_at, last_seen_at, seen_count, fields } ], signals_by_family: { funding: [...], csuite: [...], product: [...], partnership: [...] } }.

4. Render the returned data in the dashboard:
   - A summary line: total signals, returned count, and per-family counts from counts_by_family.
   - A table of signals with columns: Company (company_name), Family (signal_family), Signal Type (signal_type), Summary (summary), Confidence (confidence), Announcement Date (announcement_date), Last Seen (last_seen_at), Source (source_name rendered as a link to source_url, opening in a new tab).
   - If unmatched_inputs is non-empty, show a muted note listing those company names as "no stored signals found".
   - If signals is empty, show the existing empty-state component with a message that no stored signals exist for the selected companies.
   - Reuse the existing table/card components already used for Analyze results; do not introduce a new UI library.

Constraints:

Only touch the files/functions directly related to the points above.
Do not change variable names, code style, or structure outside the scope of these changes.
Do not add extra features, optimizations, or refactors that weren't requested.
If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why.
