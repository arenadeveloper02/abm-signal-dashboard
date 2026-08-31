# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-31T07:04:18.365Z.

## Overview

ABM Signal Tracker dashboard for uploading company lists and tracking funding, C-suite, product and partnership signals.

**Repository:** `abm-signal-dashboard`  
**File count:** 49

## Features

- Stored signals dashboard with KPI cards, charts and filterable feed
- Import companies via CSV/XLSX with company_name + website payload
- View sample payload button on the import screen
- Manual company add with name and website inputs
- Floating signal data chat assistant

## Tech Stack

- Next.js 16.2.12 (App Router)
- React 19.0.0
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

## Prisma Schema — STRICT: NEVER DROP OR DELETE COLUMNS

This section is binding on every edit. Vercel deploy runs `prisma db push` with **NO** `--accept-data-loss`. Dropping or altering a live column **fails the deploy**.

**FORBIDDEN (non-negotiable):**
- Do **not** delete, drop, omit, rename, or retype ANY existing column in `prisma/schema.prisma`
- Do **not** drop models or tables
- Do **not** "clean up", "simplify", or regenerate the schema from memory or from this summary
- Do **not** remove `createdAt` / `updatedAt` (or any other listed field) even if the UI no longer uses it

**ALLOWED:**
- ADD new models, columns, relations, or enums only
- New columns on existing models MUST be optional (`?`) or have `@default(...)`
- If the UI no longer needs a field, stop reading it in code — leave the column in the schema unchanged

**Immutable columns (must remain identical — same name, same type):**

- `AppSetting`: `key String`, `value String`, `createdAt DateTime`, `updatedAt DateTime`

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
- `app/api/chat/route.ts`
- `app/api/signals/route.ts`
- `app/api/stored-signals/route.ts`

### Components

- `components/AccountSignalTrackerClient.tsx`
- `components/Badges.tsx`
- `components/ChatWidget.tsx`
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
- `app/api/chat/route.ts`
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
- `components/ChatWidget.tsx`
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

- **Updated at:** 2026-08-31T07:04:18.365Z
- **Request:** STANDING RULE: Never modify prisma/schema.prisma. A previous edit dropped the updatedAt column from RefreshEvent and caused `prisma db push` to fail the Vercel build with a potential_dataloss error. Leave the schema file untouched.

Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

1. Import Companies — "Save & Analyse" API payload must include the company website.
   Today each company is sent with a name only. Change it so every company object in the request body is sent as:
   {
     "companies": [
       { "company_name": "Position2", "website": "position2.com" }
     ]
   }
   - company_name and website are BOTH MANDATORY. A company row missing either field must be rejected before the request is sent, using the existing inline error/toast mechanism already present on that screen. Do not introduce a new error UI style.
   - Any additional supported per-company fields present in the uploaded file must be passed through unchanged in the same company object: industry, company_city, company_state, company_country, employees, company_linkedin_url, account_owner, account_stage.
   - Existing top-level fields must keep working exactly as they do today: signalTypes, lookbackDays, batchSize, fileName, skipIfRunToday.
   - File parsing (CSV/XLSX) must accept the company_name and website columns. Where an existing 'name' key is already handled, keep accepting it by mapping it to company_name. Do not restructure the parser.

2. Import Companies — add a button that shows the sample file format.
   - Add ONE button in the Import Companies area, labelled "View sample". Reuse the exact button component and styling already used in that area — no new styles, no new component library, no modal library.
   - Clicking it toggles a read-only block showing this exact sample payload:
   {
     "companies": [
       {
         "company_name": "Position2",
         "website": "position2.com",
         "industry": "Marketing Services",
         "company_city": "Santa Clara",
         "company_state": "CA",
         "company_country": "United States",
         "employees": "250",
         "company_linkedin_url": "https://www.linkedin.com/company/position2",
         "account_owner": "Sakshi Mishra",
         "account_stage": "Customer"
       }
     ],
     "signalTypes": "funding,csuite,product,partnership",
     "lookbackDays": 90,
     "batchSize": 10,
     "fileName": "my-batch-label",
     "skipIfRunToday": false
   }
   - Below the sample, show this line: "company_name and website are mandatory. All other fields are optional."

3. "Add a company manually" — add a website input.
   - Alongside the existing company name input, add a second text input for the company website (placeholder: position2.com). Reuse the same input component and the same add button already present.
   - Both name and website are required to add a row; the added row must carry { company_name, website } so it submits correctly with the payload in change 1.

Only touch the files/functions directly related to the points above.
Do not change variable names, code style, or structure outside the scope of these changes.
Do not add extra features, optimizations, or refactors that weren't requested.
If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why.
