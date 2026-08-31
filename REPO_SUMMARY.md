# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-28T08:09:53.189Z.

## Overview

ABM Signal Tracker dashboard — upload a company list (CSV/XLSX) and track account signals across funding, C-suite, product and partnership activity. Fix: added the missing tailwind.config.ts required by structure validation.

**Repository:** `abm-signal-dashboard`  
**File count:** 49

## Features

- Import companies via CSV/XLSX upload with company_name + website mandatory validation
- Add a company manually with name and website inputs
- Save & Analyse sends { company_name, website, ...passthrough } payloads to the analyse API
- View sample button toggling a preformatted sample JSON payload
- Stored signals dashboard with KPIs, company table and signal feed
- Signal chat assistant grounded on stored signal data

## Tech Stack

- Next.js ^15.3.3 (App Router)
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

- **Updated at:** 2026-08-28T08:09:53.189Z
- **Request:** SCOPE LOCK — SURGICAL EDIT ONLY. Obey exactly. This is a small, targeted edit to the existing repo, NOT a regeneration. Do NOT modify, restyle, reformat, refactor, or 'improve' anything that already exists. NO design changes of any kind. Only make the three changes described below, and nothing else.

GOAL: On the Import Companies screen (the import/upload flow with the 'Save & Analyse' action) and the 'Add a company manually' input, support a company WEBSITE alongside the company name, and add a button that reveals a sample file.

CHANGE 1 — Payload shape (Import Companies + Save & Analyse):
- Today each company is sent to the analyse API with a name only. Change it so each company object in the payload is { "company_name": "...", "website": "..." }.
- Example minimal payload:
{
  "companies": [
    { "company_name": "Position2", "website": "position2.com" }
  ]
}
- BOTH company_name and website are MANDATORY. A company row missing either one must be rejected client-side with the existing inline error/toast mechanism already used in that screen (do NOT introduce a new error UI style). Do not submit rows that are missing either field.
- Any additional supported per-company fields present in the uploaded file (industry, company_city, company_state, company_country, employees, company_linkedin_url, account_owner, account_stage) must be passed through as-is in the same company object. Top-level fields already supported (signalTypes, lookbackDays, batchSize, fileName, skipIfRunToday) keep working exactly as today.
- Parsing of uploaded files must accept company_name and website keys. Keep backward compatibility where trivial (e.g. still accept an existing 'name' key by mapping it to company_name) but do NOT restructure the parser.

CHANGE 2 — Sample file button (Import Companies area only):
- Add ONE small button in the Import Companies area labelled 'View sample' (or 'Sample file'). Use the EXACT same button component/variant/classes already used for secondary buttons on that screen — no new styling, no new component library, no new dependency, no layout change beyond placing this one button inline near the existing upload control.
- Clicking it toggles visibility of a read-only preformatted JSON block (use existing <pre>/code styling if present, otherwise the plainest possible markup with existing utility classes) showing this exact sample:
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
- Directly above or below the sample, add one short line of plain text stating: 'company_name and website are mandatory. All other fields are optional.'
- No modal library, no animation, no new icons required — a simple show/hide is sufficient.

CHANGE 3 — Add a company manually:
- The 'Add a company manually' input currently takes a company name only. Add a second text input for the website, placed immediately next to/below the existing name input, reusing the EXACT same input component/classes and the same add button. Placeholder: 'position2.com'.
- Both fields are required before the company can be added; reuse the existing validation/disabled-button behaviour already on that control. The added company is stored and submitted as { company_name, website }.

STRICT RULES:
- Do NOT change any other tab, page, component, chart, KPI, header, styling, globals.css, theme, next.config, prisma/schema.prisma, or package.json (the build script `prisma db push --accept-data-loss` MUST remain).
- Do NOT add npm dependencies.
- Do NOT change any API route's behaviour other than accepting the enriched company objects; if the analyse route validates the incoming company shape, update that validation ONLY to require company_name + website and allow the optional passthrough fields.
- Do NOT redesign, re-space, or re-order anything on the Import screen beyond adding the one button, the toggled sample block, and the one website input.
- Do NOT break the build.

VERIFICATION (print at the end):
- Confirm the Save & Analyse request body sends companies as objects with company_name and website (show the exact code line).
- Confirm both fields are enforced as mandatory for uploaded rows and manually added rows.
- Confirm the sample button toggles the full sample JSON above, including the mandatory-fields note.
- Confirm the manual-add control now has a website input.
- List EVERY file modified and every file added — the modified list must be limited to the import screen component, the manual-add control, and (if required) the analyse route validation.
- Confirm `npm run build` exits 0.
