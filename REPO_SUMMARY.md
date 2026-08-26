# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T12:09:49.585Z.

## Overview

ABM account signal tracker dashboard: landing shows all-companies stored signals, with an Import Companies screen (typed entries + CSV/XLSX upload) and background Save & Analyze.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- All-companies dashboard on first load
- Import Company / Refresh Dashboard actions
- Import Companies screen with typed add + drag-and-drop upload + removable list
- Save & Analyze runs analysis in the background with a toast
- Overview, Companies, Signals, Trends and Insights tabs with recharts visualizations

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

- **Updated at:** 2026-08-26T12:09:49.585Z
- **Request:** SCOPE LOCK — obey exactly:
- SURGICAL EDIT to an existing repo, NOT a regeneration. Preserve every existing file byte-for-byte unless it is in the allowlist below.
- Do NOT change the theme, colors, fonts, layout spacing, or add dark mode. Match the existing visual style.
- Do NOT refactor, rename, reorder, reformat, or "clean up" any file not in the allowlist.
- Do NOT add dependencies, env vars, config, or new API routes.
- Do NOT change the API endpoints, request/response shapes, data-fetching logic, response parsing, or the dashboard tabs/charts themselves. Reuse the EXISTING all-companies fetch and the EXISTING analyze call as they are.
- Touch ONLY the file(s) in the allowlist.

BUILD FIX (REQUIRED — this is the ONLY reason prior deploys failed):
The Vercel build runs `prisma db push` which fails with: "You are about to drop the `RefreshEvent` table, which is not empty (3 rows). Use --accept-data-loss". We WANT to drop RefreshEvent (it is a disposable 3-row refresh log). Do EXACTLY ONE of the following, whichever is cleaner in this repo, and NOTHING else schema/build related:
 - Preferred: update the build script in package.json so the prisma db push step passes `--accept-data-loss` (e.g. `prisma db push --accept-data-loss`). Do not change any other script.
 - OR, if the RefreshEvent model still exists in prisma/schema.prisma, remove ONLY that model block so schema matches the intended DB, AND ensure the build's `prisma db push` can drop the table (add `--accept-data-loss` if needed).
Do not otherwise modify prisma/schema.prisma, package.json, or any config. Confirm the build's db push now succeeds and drops RefreshEvent.

FILES YOU MAY EDIT (allowlist):
- the single client component that renders the landing/dashboard view, the action buttons, the upload/import screen, and the dashboard tabs (identify it yourself). If the import/upload screen lives in a separate component, you may edit that ONE component too — but STOP and report it first if it is outside this file.
- package.json (ONLY the build script db-push flag) and/or prisma/schema.prisma (ONLY to remove the RefreshEvent model), strictly for the BUILD FIX above.

THE UI CHANGES (make exactly these, nothing more):

1. LANDING = ALL-COMPANIES DASHBOARD, ALWAYS:
On first load, immediately show the dashboard populated with ALL companies' data. Never show the upload screen or an empty state first (an error fallback if the fetch genuinely fails is fine). Reuse the EXISTING all-companies stored-signals fetch and trigger it automatically on mount. The dashboard must ALWAYS display data for all companies.

2. REMOVE THE OLD COMPANY TABLE FROM THE DASHBOARD:
The COMPANY / LOCATION / ACTION table with Remove buttons must NOT render on the dashboard in any state. (A company list still appears inside the Import screen per point 4 — but never on the dashboard itself.)

3. EXACTLY TWO BUTTONS ON THE DASHBOARD:
Replace the current dashboard button set with only these two, side by side:
 a) "Import Company" — opens the Import screen described in point 4.
 b) "Refresh Dashboard" — re-runs the EXISTING all-companies stored-signals fetch (the same all-company data API used on initial load) and repopulates the dashboard. It ALWAYS loads all companies, regardless of any prior import.
Remove any other dashboard buttons ("Analyze Signals", "Load Stored Signals", "Upload Different File", etc.). Do not keep old labels.

4. "IMPORT COMPANY" SCREEN (match the provided reference layout):
Clicking "Import Company" opens an Import screen titled "Import Companies" with a short helper line. It must include:
 - A text input to type a company (placeholder like "Add a company (e.g. Acme Inc,San Francisco,CA,USA)") plus an "Add Company" button that adds the typed company to a list.
 - The EXISTING drag-and-drop file upload so the user can also select a file of companies. Both paths (typed entries and uploaded file) feed the same in-memory company list.
 - A visible company list ("N of M companies in the list") with a Remove action per row, exactly like the reference image. This list/table belongs ONLY to this Import screen, not the dashboard.
 - A "Save & Analyze" button.

5. "SAVE & ANALYZE" BEHAVIOR:
When the user clicks "Save & Analyze":
 - Call the EXISTING analyze-signals call with the companies currently in the Import list (typed + uploaded). Do NOT change the analyze endpoint, its payload shape, or its response handling — only pass in this company set.
 - Kick the analysis off in the BACKGROUND (do not block the UI waiting for it to finish).
 - Immediately navigate to / show the dashboard, which must display ALL companies' data (reuse the all-companies fetch).
 - Show a popup/toast/modal on the dashboard that says analysis is running in the background and will take some time (e.g. "Analysis is running in the background. This may take a few minutes."). The user can keep using the dashboard while it runs.

DO NOT CHANGE:
- The all-companies stored-signals API call/endpoint/response parsing.
- The analyze-signals call/endpoint/payload/response parsing.
- The dashboard tabs, charts, metrics, or their data.
- Files under app/api/ or lib/.

AFTER IMPLEMENTING:
- List every file you modified. If anything outside the allowlist appears, revert it.
- Confirm the build's `prisma db push` now succeeds (RefreshEvent dropped) and `npm run build` exits 0.
- Confirm: (a) app opens straight to the all-companies dashboard with the old company table gone, (b) dashboard has exactly two buttons — "Import Company" and "Refresh Dashboard", (c) Refresh Dashboard always loads all companies, (d) Import Company opens the Import screen with add-company input + file upload + company list + "Save & Analyze", (e) Save & Analyze fires the analyze call in the background, shows the dashboard for all companies, and displays the background-analysis popup.
- Print the final contents of each file you changed.
