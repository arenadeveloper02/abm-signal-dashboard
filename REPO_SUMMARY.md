# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-09-01T11:58:26.733Z.

## Overview

ABM account signal tracking dashboard: import company lists (CSV/XLSX), analyze funding, C-suite, product and partnership signals, and explore stored signals with charts, company drill-downs and a data-aware chat assistant.

**Repository:** `abm-signal-dashboard`  
**File count:** 50

## Features

- Fixed broken app/api/chat/route.ts (TS1128/TS1127 syntax errors) with a complete, strictly-typed chat proxy route
- Removed the emailId access gate from middleware.ts — / loads the dashboard without a cookie or ?emailId=, CSP frame-ancestors * kept, arena_email_id cookie still set when ?emailId= is present, no rewrites to /access-denied
- useArenaEmailId() no longer throws — returns '' when the email id is missing
- Companies table Delete button and expanded Company info section preserved (StoredSignalsDashboard untouched)
- prisma/schema.prisma echoed unchanged (AppSetting model with updatedAt intact)

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

- **Updated at:** 2026-09-01T11:58:26.733Z
- **Request:** STANDING RULE: Never modify prisma/schema.prisma. A previous edit dropped the updatedAt column from RefreshEvent and caused `prisma db push` to fail the Vercel build with a potential_dataloss error. Leave the schema file untouched.

SURGICAL EDIT ONLY. Do NOT regenerate the app. Do NOT redesign unrelated UI. Do NOT remove the Companies Delete button. Do NOT add unrelated features.

REQUIRED ACCEPTANCE CHECKS (must all pass before/after deploy):
1) Opening `/` with no cookie and no `?emailId=` must load the dashboard, NOT “Do not have access”.
2) Companies table must have Delete in Actions.
3) Expanding a company row must show Company info again (description + facts).
4) Only ONE Refresh Dashboard button (top header). No middle duplicate.

Changes to implement:

1) `middleware.ts` — REMOVE the emailId gate completely.
   - Delete the rewrite to `/access-denied` when emailId query/cookie is missing.
   - Keep `Content-Security-Policy: frame-ancestors *`.
   - Optional: if `?emailId=` is present, set cookie `arena_email_id` (Secure, SameSite=None, HttpOnly, Path=/).
   - Never rewrite `/api/*` to access-denied HTML.

2) `components/arena-email-provider.tsx` — stop throwing on missing email.
   - `useArenaEmailId()` must return `''` when missing.
   - Do NOT throw “Do not have access”.

3) `components/StoredSignalsDashboard.tsx` — restore Company info on expanded company rows.
   - Keep Companies table columns:
     Company, Industry, Total, Funding, C-Suite, Product, Partnership, Last Activity, Actions
   - Keep working Delete button posting to `/api/delete-company`.
   - When a company row is expanded, restore the previous `CompanyInfoSection` UI showing:
     - title: “Company info”
     - short description (`short_description`), or a clear empty-state message if missing
     - facts: Domain, Industry, Website, LinkedIn, Employees, City/State/Country (or equivalent fields already on `StoredCompany` / extras)
   - Also restore tech stack / keywords chips under company info when available (`tech_stack`/`technologies`, `keywords`/`tags`).
   - Keep expandable recent signals under the company row.
   - Do NOT remove Delete while restoring company info.

4) Remove duplicate middle Refresh Dashboard bar if present.
   - Keep only the top header Refresh + Import Companies from `AccountSignalTrackerClient`.
   - No second “Signal Intelligence / Refresh Dashboard” strip above tabs.

Do not change:
- prisma/schema.prisma
- package.json dependency versions
- unrelated API routes except as needed for compile

After editing, build and deploy to Vercel.

Final report must include:
- exact files changed
- confirmation middleware no longer rewrites to access-denied
- confirmation Company info section is restored on expand
- deployment URL + deployment ID
- curl `/` without emailId result (must not be access-denied)
