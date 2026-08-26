# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T04:16:01.363Z.

## Overview

Incremental data-and-values update to the stored-signals dashboard. Files changed: components/StoredSignalsDashboard.tsx (renders the five tabs — Overview, Companies, Signals, Trends, Insights — with the 11 Overview stat cards, 90-day Signal Feed with count badge, weekly severity-stacked trend with click-to-filter, signal-type donut with clickable legend/segments, and top-industries bar chart wired to the Signals tab); components/AccountSignalTrackerClient.tsx (completed the upload/list JSX and wired the stored-signals result into StoredSignalsDashboard — data flow only, no restyle); components/KpiCard.tsx (values now render with thousands separators only — no visual rework); lib/utils.ts (added derivation helpers: NO_SIGNIFICANT_SIGNAL exclusion constant, per-family severity normalization, display-type mapping incl. C-Suite Join/Exit from Action/Title fields, Supporting URLs / whitespace-split source-link extraction, announcement_date→last_seen_at date fallback, formatNumber); lib/types.ts (added NormalizedSeverity and SourceLink types); prisma/schema.prisma (returned unchanged per database rule — no columns edited or removed).

**Repository:** `abm-signal-dashboard`  
**File count:** 45

## Features

- Five dashboard tabs: Overview, Companies, Signals, Trends, Insights
- 11 Overview stat cards derived from the ABM Signal Read API (Companies Tracked, Total Signals with H/M/L chips, High Alerts, C-Suite Changes, Funding, M&A, IPO, News, Product Launches, Partnerships, Creative Hiring)
- Signal Feed limited to the last 90 days with count badge, type/severity chips, summaries and multi-source links
- Weekly severity-stacked bar chart with click-to-filter feed by week
- Signal type donut with clickable legend/segments filtering the feed
- Top industries horizontal bar chart filtering the Signals tab
- NO_SIGNIFICANT_SIGNAL rows excluded from every count, chart, table and feed
- Per-family severity normalization (funding/partnership/product/csuite rules) with LOW fallback
- Thousands separators on all card values with 0 rendered for empty counts

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

- **Updated at:** 2026-08-26T04:16:01.363Z
- **Request:** Incremental update to the existing dashboard. Everything already built is fine — do NOT restyle, re-theme, refactor, rename, or remove anything. Keep the current visual theme, components, and charting library exactly as they are. This request is about DATA and VALUES ONLY: which tabs exist, which metrics each card shows, and which charts render. Ignore appearance entirely.

=== 1. NAVIGATION / TABS ===

The dashboard must have exactly these five sections, in this order: Overview, Companies, Signals, Trends, Insights. Keep the existing navigation component and styling; only ensure these five exist with these labels. If a section already exists under a different label (e.g. "All Signals"), rename the label to "Signals" but keep its contents.

=== 2. OVERVIEW TAB — STAT CARDS ===

The Overview tab must show these 11 stat cards, each with a label and a large integer value, all derived from the ABM Signal Read API response already being fetched. Order:

1. COMPANIES TRACKED = requested_count
2. TOTAL SIGNALS = number of signals after filtering (see rules). Under the number, show three small inline chips with the severity split: H:<high count>, M:<medium count>, L:<low count>
3. HIGH ALERTS = count of normalized-HIGH signals
4. C-SUITE CHANGES = count of signals in the csuite family
5. FUNDING = count of funding-family signals whose type is a funding round / debt financing / earnings event (funding family excluding M&A and IPO, which have their own cards)
6. MERGERS & ACQUISITIONS = count of signals with signal_type "M_AND_A"
7. IPO = count of signals with signal_type "IPO_SIGNAL"
8. NEWS = count of signals whose display type is a news mention (unmapped / general news signal types)
9. PRODUCT LAUNCHES = count of product-family signals (e.g. "NEW_PRODUCT_LAUNCH")
10. PARTNERSHIPS = count of partnership-family signals
11. CREATIVE HIRING = count of signals whose type indicates a creative/marketing hiring signal; render 0 when none are present

Every card must render 0 rather than blank/undefined when the count is zero. Format values with thousands separators.

=== 3. OVERVIEW TAB — FEED AND CHARTS ===

Alongside the cards, the Overview tab must contain:

a) SIGNAL FEED — a scrollable list of individual signals, newest first, with a count badge showing the total number of signals in the feed. Each entry shows: company_name, the display type label (e.g. "C-Suite Join", "C-Suite Exit", "Funding Round", "Product Launch", "Partnership", "Acquisition / M&A", "News Mention"), the normalized severity (HIGH / MEDIUM / LOW), the summary text (truncated to one or two lines), and source links (open in a new tab). Show a note stating the feed is limited to the last 90 days, and filter the feed to signals whose announcement_date (fallback last_seen_at) falls within the last 90 days.

b) WEEKLY SIGNAL TREND — a bar chart of signal counts bucketed by week using announcement_date (fallback last_seen_at), stacked by normalized severity with a HIGH / MEDIUM / LOW legend. Clicking a bar filters the Signal Feed to that week.

c) SIGNAL TYPE BREAKDOWN — a donut chart of signal counts grouped by display type label, with a legend listing each type present: C-Suite Join, C-Suite Exit, Funding Round, Acquisition / M&A, Product Launch, Partnership, News Mention. Clicking a legend entry or segment filters the Signal Feed to that type.

d) TOP INDUSTRIES BY SIGNAL COUNT — a horizontal bar chart of signal counts grouped by the industry of the signal's company (from companies[].industry, joined on company_id / company_key), sorted descending, showing the top industries. Clicking a bar filters the signals table.

Distinguish C-Suite Join vs C-Suite Exit from the csuite row's Action / Title fields (an appointment/promotion/join → "C-Suite Join"; a departure/exit → "C-Suite Exit").

=== 4. DERIVATION RULES (unchanged — reuse the existing helpers) ===

- Exclude rows where signal_type === "NO_SIGNIFICANT_SIGNAL" from every count, chart, table, and feed.
- Severity normalization: funding → uppercase "HIGH"/"MEDIUM"; partnership → lowercase "high"; product → numeric confidence string, >= 8 HIGH, 5–7 MEDIUM, < 5 LOW; csuite → confidence empty, so fields["Validation Status"] === "Confirmed" ? HIGH : MEDIUM. Uppercase-compare all string values. Anything unresolvable → LOW.
- Prefer counts derived from the filtered signals array; counts_by_family may be used only as a fallback when the corresponding signals are absent.
- Source links: csuite rows have empty source_name/source_url — use fields["Supporting URLs"] (comma-separated; literal "N/A" means none). Some partnership rows carry multiple space-separated URLs in source_url — split on whitespace and render each separately.
- Show an empty state when no signals remain after filtering.

=== CONSTRAINTS ===

Only touch what points 1–3 require. No new UI or charting library. No theme, color, spacing, or layout rework beyond adding the cards/charts listed. Do not change unrelated variable names, code style, or structure. Do not add features that were not requested. After implementing, list exactly which files were changed and why.
