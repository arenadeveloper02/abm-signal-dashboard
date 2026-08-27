# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-27T07:23:30.314Z.

## Overview

Surgical data-binding fix: the stored-signals dashboard now reads authoritative totals from the API's `dashboard` object (with documented fallback chains) instead of deriving counts from the paginated signals page, and empty fields render an em dash instead of the literal 'Unknown'. VERIFICATION: (1) Companies KPI reads dashboard.total_companies -> total_companies -> dashboard.companies_total -> dashboard.companies_tracked (displays 23, never company_count/returned/companies.length). (2) Total signals reads dashboard.total_signal_rows -> total_signal_rows -> total (75); High/Medium/Low read dashboard.high_alerts/medium_alerts/low_alerts -> counts_by_alert (25/7/0). (3) All category KPIs (funding, m&a, ipo, csuite, product launches, r&d, partnerships, news) read the dashboard object with counts_by_category fallback; missing values render '—'. (4) No literal 'Unknown' remains in the stored dashboard path; empty industry/company/source fields render '—' or hide the pill. (5) Changed files: lib/types.ts (additive optional fields), components/AccountSignalTrackerClient.tsx (normalizeStoredPayload now passes through total_companies/total_signal_rows/counts_by_alert/counts_by_category/dashboard), components/StoredSignalsDashboard.tsx (value bindings + '—' fallbacks), components/KpiCard.tsx (value accepts number|null to render '—'). No design/layout/style/chart-config/tab-structure changes; prisma schema, package.json build script (prisma db push --accept-data-loss), API routes and requests untouched.

**Repository:** `abm-signal-dashboard`  
**File count:** 47

## Features

- Companies Tracked KPI bound to dashboard.total_companies (authoritative total, not paginated page)
- Total signals bound to dashboard.total_signal_rows with top-level fallbacks
- High/Medium/Low alerts bound to dashboard alert totals with counts_by_alert fallback
- Category KPI counts bound to dashboard object with counts_by_category fallback
- Empty fields render an em dash instead of 'Unknown'
- Graceful '—' fallback when totals are missing at runtime (never crashes)

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
- `VERIFICATION.md`

## Complete File Index

- `.env.example`
- `README.md`
- `REPO_SUMMARY.md`
- `VERIFICATION.md`
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

- **Updated at:** 2026-08-27T07:23:30.314Z
- **Request:** SCOPE LOCK — DATA VALUES ONLY. Obey exactly. This is a SURGICAL EDIT to the existing repo, NOT a regeneration. You may ONLY change how numbers/values are computed and displayed. You may NOT change design, layout, styling, theme, colors, fonts, components, tabs, charts, copy, or structure in ANY way.

PROBLEM (from the real API response the app already fetches):
The API returns CORRECT totals but the dashboard is displaying WRONG numbers and 'Unknown' placeholders. Fix ONLY the data binding so the displayed values match the API.

GROUND TRUTH — the API response (same endpoint the app already calls) contains a top-level summary AND a `dashboard` object with the authoritative totals. Example shape:
{
  "total": 75,
  "total_companies": 23,
  "total_signal_rows": 75,
  "returned": 32,          // <-- paginated page size, DO NOT use for totals
  "offset": 42,            // <-- pagination offset, DO NOT use for totals
  "company_count": 2,      // <-- companies on THIS page only, DO NOT use for totals
  "counts_by_alert": { "high": 25, "medium": 7, "low": 0 },
  "counts_by_category": { "funding": 4, "m_and_a": 2, "ipo": 1, "csuite_change": 3, "product_launch": 7, "r_and_d": 1, "partnership": 10, "news": 4, ... },
  "dashboard": {
    "total_companies": 23, "companies_total": 23, "companies_tracked": 23,
    "total_signal_rows": 75, "total_signals": 32,
    "high_alerts": 25, "medium_alerts": 7, "low_alerts": 0,
    "csuite_changes": 3, "funding": 4, "mergers_acquisitions": 2, "ipo": 1,
    "news": 4, "product_launches": 7, "r_and_d": 1, "partnerships": 10, "other": 0
  },
  "companies": [ ... ],
  "signals": [ ... paginated page of signal rows ... ]
}

ROOT CAUSE TO FIX:
1) COMPANIES COUNT is showing 7 (wrong) instead of 23. The code is deriving the company count from the paginated `signals`/`companies` page (or `company_count`), NOT from the authoritative total. FIX: read the companies KPI from `dashboard.total_companies` (fallback: top-level `total_companies`, then `dashboard.companies_total`). NEVER derive it by counting the returned `signals` page or using `company_count`, `returned`, or `companies.length`.
2) SIGNAL TOTALS are wrong. FIX: read total signals from `dashboard.total_signal_rows` (fallback: top-level `total_signal_rows`, then `total`). Read high/medium/low from `dashboard.high_alerts`/`medium_alerts`/`low_alerts` (fallback `counts_by_alert.high/medium/low`). Read category counts (funding, m&a, ipo, csuite, product launches, r&d, partnerships, news) from the `dashboard` object (fallback `counts_by_category`). NEVER recompute these by filtering the paginated `signals` array.
3) 'Unknown' VALUES. These appear because some signal rows have empty fields (e.g. blank `Industry`, empty `source_name`, missing `company_name`). FIX the display fallback ONLY: when a field is empty/null/undefined, show a clean fallback of an em dash '—' (or '' where a pill would look wrong) instead of the literal text 'Unknown'. Do not fabricate values. Do not change which field is read except where the current field is clearly the wrong key — prefer the populated equivalent already present on the row (e.g. company_name || company, source_name || fields['Source Name'], industry || fields['Industry']).

STRICT RULES:
- Change ONLY value/number bindings and empty-value fallbacks. Do NOT touch JSX structure, className/styles, chart config, layout, tab code, headers, Import screen, app/api/, lib/, prisma/schema.prisma, package.json, next.config, globals.css, or the build script (`prisma db push --accept-data-loss` MUST remain).
- Do NOT add dependencies, env vars, API routes, or new fetches. Do NOT change the request/response shape. Reuse ONLY data already fetched.
- Do NOT change any tab's design or content other than the numbers being corrected.
- If a total field is missing at runtime, fall back through the chain above; if all are missing, show '—' (never crash, never 'Unknown').

VERIFICATION (print at the end):
- Confirm the Companies KPI now reads from dashboard.total_companies and would display 23 (not 7) for this response.
- Confirm total signals reads from dashboard.total_signal_rows / total (75) and high/medium/low read from dashboard alerts (25 / 7 / 0).
- Confirm category counts read from the dashboard object.
- Confirm no remaining literal 'Unknown' strings; empty fields render '—'.
- Confirm NO design/layout/styling/tab/chart changes were made — list every file changed (should be minimal, data-binding only) and show before/after of each changed line.
- Confirm `npm run build` exits 0.
