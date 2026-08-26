# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T11:31:02.738Z.

## Overview

ABM account signal tracker dashboard: loads all companies' stored signals on launch, supports company import (typed + CSV/XLSX upload) with background analysis, and visualizes signals across overview, companies, signals, trends, and insights tabs.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- All-companies dashboard on load
- Import Companies screen with typed entries and drag-and-drop CSV/XLSX upload
- Background Save & Analyze with toast notification
- Refresh Dashboard reloading all-company stored signals
- Overview KPI cards with sparklines and severity pills
- Weekly severity and family trend charts
- Signal type donut with click-to-filter feed
- Companies, Signals, Trends and Insights tabs

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

- **Updated at:** 2026-08-26T11:31:02.738Z
- **Request:** SCOPE LOCK — obey exactly:
- SURGICAL EDIT to an existing repo, NOT a regeneration. Preserve every existing file byte-for-byte unless it is in the allowlist below.
- Do NOT modify prisma/schema.prisma under any circumstance. It must stay a no-op for `prisma db push`. If you think it needs changing, STOP and leave it untouched.
- Do NOT change the theme, colors, fonts, layout spacing, or add dark mode. Match the existing visual style.
- Do NOT refactor, rename, reorder, reformat, or "clean up" any file not in the allowlist.
- Do NOT add dependencies, env vars, config, or new API routes.
- Do NOT change the API endpoints, request/response shapes, data-fetching logic, response parsing, or the dashboard tabs/charts themselves. Reuse the EXISTING all-companies fetch and the EXISTING analyze call as they are.
- Touch ONLY the file(s) in the allowlist.

FILES YOU MAY EDIT (allowlist — nothing else):
- the single client component that renders the landing/dashboard view, the action buttons, the upload/import screen, and the dashboard tabs (identify it yourself; do not touch any other file). If the import/upload screen genuinely lives in a separate component, you may edit that ONE component too — but STOP and report it first if it is outside this file.


THE CHANGES (make exactly these, nothing more):

1. LANDING = ALL-COMPANIES DASHBOARD, ALWAYS:
On first load, immediately show the dashboard populated with ALL companies' data. Never show the upload screen or an empty state first (an error fallback if the fetch genuinely fails is fine). Reuse the EXISTING all-companies stored-signals fetch and trigger it automatically on mount. The dashboard must ALWAYS display data for all companies.


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
- Confirm prisma/schema.prisma is byte-for-byte unchanged and no file under app/api/ was touched.
- Confirm: (a) app opens straight to the all-companies dashboard with the old company table gone, (b) dashboard has exactly two buttons — "Import Company" and "Refresh Dashboard", (c) Refresh Dashboard always loads all companies, (d) Import Company opens the Import screen with add-company input + file upload + company list + "Save & Analyze", (e) Save & Analyze fires the analyze call in the background, shows the dashboard for all companies, and displays the background-analysis popup.
- Print the final contents of each file you changed.
