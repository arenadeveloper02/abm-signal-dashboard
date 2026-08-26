# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T17:50:02.845Z.

## Overview

ABM account signal tracker dashboard with company import, stored signal analytics, and expandable company rows showing signal history, tech stack, and keywords.

**Repository:** `abm-signal-dashboard`  
**File count:** 46

## Features

- Import companies via CSV/XLSX or manual entry
- Stored signal analytics with KPI cards and charts
- Companies tab with expandable inline detail rows (Signal History, Tech Stack, Keywords)
- Signal feed with type and week filters
- Weekly trends by signal family
- Insights summary tiles

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

- **Updated at:** 2026-08-26T17:50:02.845Z
- **Request:** SCOPE LOCK — obey exactly:
- SURGICAL EDIT to an existing repo, NOT a regeneration. Preserve every existing file byte-for-byte except the change described below.
- Do NOT change the theme, colors, fonts, spacing, card styling, layout, or any other component.
- Do NOT refactor, rename, reorder, reformat, or "clean up" anything.
- Do NOT add dependencies, env vars, config, or new API routes.
- Do NOT change any API endpoint, request/response shape, data-fetching logic, or response parsing. Reuse ONLY data the app already fetches/has for each company.
- Do NOT touch any file under app/api/ or lib/, the Overview tab, the Signals tab, the Trends tab, the Insights tab, the dashboard buttons, or the Import screen.
- Do NOT modify prisma/schema.prisma, package.json, or any config. Leave the build exactly as-is (the prisma db push --accept-data-loss build fix must stay untouched).
- Touch ONLY the single client component that renders the COMPANIES tab table.

THE ONE CHANGE (make exactly this, nothing more):
On the COMPANIES tab, make each company ROW expandable so clicking it drags down an inline detail panel for THAT company, directly beneath its row. Match the reference screenshot.

Behavior:
- Clicking a company row toggles an expanded detail section immediately below that row (accordion-style). Clicking it again collapses it. Only one row expands/collapses independently — do not navigate away or open a modal; the detail must expand INLINE within the table/list, pushing the rows below it down.
- Keep the existing row exactly as-is (#, COMPANY, INDUSTRY, LOCATION, EMPLOYEES, REVENUE, FUNDING STAGE, LAST SIGNAL, SIGNALS, ACTIONS). Do not change the columns, the Website/Search action buttons, or the signals count badge. The Website/Search buttons must still work and must NOT toggle the expansion (stop click propagation on them).
- Add a subtle affordance that the row is expandable (e.g. a chevron that rotates on expand) using the existing styling — no new color theme.

The expanded detail panel must show, using data the app ALREADY has for that company (do NOT add new fetches):
- "Signal History": a vertical list of that company's signals. Each item shows a severity badge (LOW / MEDIUM / HIGH) styled by severity, the signal type (e.g. News Mention, Partnership, C-Suite Change), the signal title/description, a relative time (e.g. "2mo ago"), and a "Source" link if a source URL exists. Match the two-column reference layout: Signal History on the left.
- "Tech Stack": on the right, the company's tech stack rendered as small pill/tag chips (e.g. Azure, Snowflake). Only render if data exists.
- "Keywords": below Tech Stack on the right, the company's keywords as pill/tag chips (e.g. enterprise AI, partner network...). Only render if data exists.
- If a section has no data, hide that section gracefully (no empty headers, no crash).

Constraints:
- Reuse existing severity-badge and tag/pill styles if the component already has them; do not invent a new visual language.
- Do NOT change how companies or signals are fetched or parsed — only render already-available fields in the expanded panel. If the company object doesn't already include signals/techStack/keywords, use whatever equivalent fields already exist on it; STOP and report if none exist rather than adding a fetch.
- Apply this ONLY to the Companies tab. Do not change scrolling or expansion anywhere else.

AFTER IMPLEMENTING:
- Confirm you edited exactly ONE file (the Companies tab component).
- Confirm clicking a company row expands an inline panel with Signal History + Tech Stack + Keywords, and clicking again collapses it; Website/Search buttons still work without toggling.
- Confirm no API/endpoint/parsing/schema/build/other-tab changes were made.
- Confirm npm run build exits 0.
- Print the name of the file changed and the before/after of the key lines (row click handler + the new expanded panel JSX).
