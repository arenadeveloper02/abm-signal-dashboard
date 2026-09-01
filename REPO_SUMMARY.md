# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-09-01T11:38:35.183Z.

## Overview

ABM account signal tracking dashboard that imports company lists (CSV/XLSX), analyzes funding, C-suite, product and partnership signals via upstream workflows, and visualizes stored signal intelligence with KPIs, charts and a data-aware chat assistant.

**Repository:** `abm-signal-dashboard`  
**File count:** 50

## Features

- Company list import (CSV/XLSX) with background analysis
- Stored signal intelligence dashboard with Overview, Companies, Signals, Trends and Insights tabs
- Company delete action via /api/delete-company
- Signal-aware chat assistant backed by OpenAI
- Arena iframe embedding with CSP frame-ancestors *

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
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`

### API routes

- `app/api/all-stored-signals/route.ts`
- `app/api/analyze/route.ts`
- `app/api/chat/route.ts`
- `app/api/delete-company/route.ts`
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
- `lib/fetch-all-stored-signals.ts`
- `lib/prisma.ts`
- `lib/resolve-request-email.ts`
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
- `app/api/chat/route.ts`
- `app/api/delete-company/route.ts`
- `app/api/signals/route.ts`
- `app/api/stored-signals/route.ts`
- `app/arena-ds-tokens.css`
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
- `lib/fetch-all-stored-signals.ts`
- `lib/prisma.ts`
- `lib/resolve-request-email.ts`
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

- **Updated at:** 2026-09-01T11:38:35.183Z
- **Request:** STANDING RULE: Never modify prisma/schema.prisma. A previous edit dropped the updatedAt column from RefreshEvent and caused `prisma db push` to fail the Vercel build with a potential_dataloss error. Leave the schema file untouched.

SURGICAL EDIT ONLY — implement exactly the changes below. Do not regenerate the whole app. Do not invent extra features, refactors, cleanups, or redesigns.

Changes to implement:

1) Remove the Arena emailId access gate so the app loads without `?emailId=` in the URL and without the `arena_email_id` cookie.
   - In `middleware.ts`: remove the rewrite to `/access-denied` when emailId is missing. Keep `Content-Security-Policy: frame-ancestors *`. Optionally still set the `arena_email_id` cookie when `?emailId=` is present.
   - In `components/arena-email-provider.tsx`: `useArenaEmailId()` must NOT throw when email is missing; return `''` / null instead so the UI can load.
   - Keep `/access-denied` page file if it already exists, but do not force users there.
   - API routes must continue to work using `email` from the JSON request body (already sent by the client). Do not gate `/api/*` on emailId query/cookie.

2) Restore Companies tab Delete button and previous dashboard tab design.
   - In `components/StoredSignalsDashboard.tsx`, restore the full Companies table with columns:
     Company, Industry, Total, Funding, C-Suite, Product, Partnership, Last Activity, Actions
   - Actions column must include a working Delete button that POSTs to `/api/delete-company` with `{ email, company, companyId, confirm: true }` and then refreshes data.
   - Restore the previous Overview / Companies / Signals / Trends / Insights UI design that existed before the simplified domain-wise rewrite (KPI cards, charts, expandable company rows, filters). Do not leave the stripped-down 4-column companies table.

3) Remove the duplicate middle Refresh Dashboard control.
   - Keep ONLY the top header Refresh Dashboard + Import Companies buttons from `components/AccountSignalTrackerClient.tsx`.
   - Remove the middle “Signal Intelligence / Stored Signal Intelligence” bar and its second Refresh Dashboard button from `components/StoredSignalsDashboard.tsx`.
   - Result: one header row, then tabs, then content. No duplicate refresh button.

Constraints:
- Do not touch `prisma/schema.prisma`.
- Do not change package.json dependency versions unless required for a compile error you introduce.
- Do not rewrite unrelated files.
- After changes, build and deploy to Vercel.
- Report: files changed, deployment URL, deployment ID, build pass/fail.
