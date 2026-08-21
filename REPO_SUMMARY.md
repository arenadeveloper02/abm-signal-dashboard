# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-21T09:55:04.956Z.

## Overview

ABM Signal Tracker. Changed files: .env.local (new — ABM_API_URL + ABM_API_KEY runtime values), .env.example (added ABM_API_URL/ABM_API_KEY empty placeholders with comments), .gitignore (ensures .env.local / .env*.local never committed), app/api/analyze/route.ts (default ABM_API_URL, separate config checks with missing[] reporting, one-line server log, absolute-URL validation, distinct upstream error surfacing, new GET diagnostics handler with masked URL), components/AccountSignalTrackerClient.tsx (handleAnalyze !res.ok branch now names missing env vars when a 500 body contains a missing array; AnalyzePayload extended with missing?: string[]), prisma/schema.prisma (echoed unchanged — mandatory on every DB edit).

**Repository:** `abm-signal-dashboard`  
**File count:** 45

## Features

- Upload CSV/XLSX company lists and parse them client-side
- Proxy analyze requests to the ABM workflow API with server-held credentials
- GET /api/analyze diagnostics endpoint reporting configuration state with masked URL
- Inline UI message naming missing environment variables on configuration errors
- Signals dashboard with overview, companies, signals, trends and insights tabs

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
- `.gitignore`
- `middleware.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `tsconfig.json`

### Other

- `.env.local`
- `README.md`
- `REPO_SUMMARY.md`

## Complete File Index

- `.env.example`
- `.env.local`
- `.gitignore`
- `README.md`
- `REPO_SUMMARY.md`
- `app/access-denied/page.tsx`
- `app/api/analyze/route.ts`
- `app/api/signals/route.ts`
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

- **Updated at:** 2026-08-21T09:55:04.956Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Context: the /api/analyze proxy route returns `{ error: "ABM API not configured" }` because ABM_API_URL and ABM_API_KEY are not present in the runtime environment. Configure them and improve the diagnostics.

Changes to implement:

1. Create/update `.env.local` at the project root with these exact values:

   ABM_API_URL=https://agent.thearena.ai/api/workflows/9cfb7d2e-8290-424d-b23b-6b46e9a6749c/execute
   ABM_API_KEY=sk-sim-V-QrZM3gSrgc4RmnWf5gwHl-s6debMJt

   - Ensure `.env.local` is listed in `.gitignore` so it is never committed.
   - Also add both keys to `.env.example` with EMPTY values and a one-line comment each. Never put the real key in `.env.example` or in any committed source file.

2. In the /api/analyze route, default ABM_API_URL to the literal
   `https://agent.thearena.ai/api/workflows/9cfb7d2e-8290-424d-b23b-6b46e9a6749c/execute`
   when `process.env.ABM_API_URL` is unset, so the URL never has to be configured again. ABM_API_KEY must ONLY come from `process.env.ABM_API_KEY` — never hardcode the key in source.

3. Improve the proxy route's configuration check and error reporting:
   - Check the URL and key separately. If the key is missing, return 500 with { error: "ABM API not configured", missing: ["ABM_API_KEY"] }. Never include the key's value in any response, log, or error — only whether it is present.
   - Log server-side only, once per request: `[analyze] ABM_API_URL set: <bool>, ABM_API_KEY set: <bool>`.
   - Validate ABM_API_URL parses as an absolute http(s) URL; if not, return 500 with { error: "ABM_API_URL is not a valid absolute URL" }.

4. Forward the request upstream with headers `Content-Type: application/json` and `X-API-Key: <ABM_API_KEY>`, and surface upstream failures distinctly:
   - Network/DNS/timeout error → 502 with { error: "Upstream request failed", detail: "<message>" }.
   - Non-2xx upstream response → return that same status with { error: "Upstream error", status: <code>, detail: "<upstream body as text, truncated to 500 chars>" }.
   - Only return "ABM API not configured" for genuinely missing/invalid configuration, never for an upstream failure.

5. Add a GET handler on the same route for diagnostics:
   - GET /api/analyze returns { configured: boolean, urlSet: boolean, keySet: boolean, url: "<ABM_API_URL with everything after the host masked>" }.
   - It must never return the API key or any part of it.

6. In the UI, when /api/analyze returns a 500 whose body contains a `missing` array, show an inline message naming the missing environment variable(s) instead of the generic error text. Keep all other error handling as-is.

Constraints:

Only touch the files/functions directly related to the points above.
Do not change variable names, code style, or structure outside the scope of these changes.
Do not add extra features, optimizations, or refactors that weren't requested.
If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why.
