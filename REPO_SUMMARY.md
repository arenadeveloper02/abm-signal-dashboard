# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-21T07:06:12.345Z.

## Overview

ABM Signal Tracker — redesigned entry page 'Account Signal Tracker' with breadcrumb, header bar (Refresh Dashboard + company search), empty state, CSV/XLSX drag-and-drop upload zone, parsed company list with per-row Remove, and a light default theme. Files changed: app/page.tsx (renders new AccountSignalTrackerClient instead of old DashboardClient), components/AccountSignalTrackerClient.tsx (new — full entry page UI, file parsing via xlsx, column detection, location combining), lib/types.ts (added ParsedCompany type only; all existing types untouched), app/layout.tsx (removed dark body classes only), app/globals.css (removed dark-theme rules; light defaults from tokens), tailwind.config.ts (removed custom color extensions), package.json (added xlsx dependency), lib/actions.ts (unchanged echo), prisma/schema.prisma (unchanged — RefreshEvent model preserved, no columns edited).

**Repository:** `abm-signal-dashboard`  
**File count:** 42

## Features

- Breadcrumb: Agents > Account Signal Tracking
- Page header with title, 'No analysis loaded yet' subtitle, Refresh Dashboard action and company search
- Centered empty state when no companies are configured
- Dashed-border upload zone with drag-and-drop and click-to-browse for CSV and XLSX
- Company-name column detection (Company / Company_Name / Company Name) with automatic City/State/Country location combining
- Count line 'N companies ready to import · filename' with Analyze Companies button (disabled until a file is parsed)
- Bordered scrollable parsed-company list with index, name and Remove action
- Light default theme (dark styling removed)

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

- **Updated at:** 2026-08-21T07:06:12.345Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

Remove , what you have build earlier , we will start with new design 

1. Create the first page (entry page) — "Account Signal Tracker" — with this exact layout, top to bottom:

   a. Breadcrumb: `Agents > Account Signal Tracking`

   b. Page header bar:
      - Title: "Account Signal Tracker"
      - Subtitle below the title: "No analysis loaded yet" (replace with the loaded state once an analysis exists)
      - Right side of the header: a "Refresh Dashboard" action and a "Search companies..." input
      - A horizontal rule under the header bar

   c. Empty state (shown when no companies are loaded), centered:
      - Heading: "No companies are currently configured"
      - Body text: "Upload a company list (CSV or XLSX) to start tracking ABM signals. Columns such as Company Name, City, State and Country will be combined automatically."

   d. Upload zone — a large rectangle with a dashed border:
      - "Drag and drop your company file here"
      - Smaller line under it: "Supported formats: CSV, XLSX"
      - An "Upload Companies" button inside the zone
      - Accept both CSV and XLSX; support drag-and-drop and click-to-browse

   e. After a file is parsed, below the upload zone:
      - Left: a count line reading "{N} companies ready to import · {filename}" (e.g. "291 companies ready to import · csg_target_accounts.csv")
      - Right, on the same line: an "Analyze Companies" button
      - The Analyze Companies button is the only analysis trigger on the page, and is disabled until a file has been uploaded and parsed

   f. Below that, a bordered, scrollable list of the parsed companies — one row per company:
      - Left: the row index number
      - Middle: the company name
      - Right: a "Remove" action that deletes that company from the list before analysis (and decrements the count in (e))

2. Column handling on parse: detect the company-name column regardless of header variant (Company, Company_Name, Company Name). If City, State and Country columns are present, combine them into a single location value automatically. Keep all other columns from the uploaded file available on the parsed record.

3. Theme: switch the UI from the current dark theme to a light theme.
   - Remove the dark theme styling, variables, and classes.
   - Use the framework/library default styling everywhere — no custom colors, gradients, or custom palette.
   - Plain light background, default text colors, default borders. Keep all defaults as-is.

Constraints:

Only touch the files/functions directly related to the points above.
Do not change variable names, code style, or structure outside the scope of these changes.
Do not add extra features, optimizations, or refactors that weren't requested.
If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why.
