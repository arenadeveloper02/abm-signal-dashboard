# Repository Summary: ABM Signal Tracker

> Auto-maintained by Sim Development. Last updated: 2026-08-20T11:04:36.165Z.

## Overview

Arena-themed dark analytics dashboard tracking ABM signals — funding, C-suite changes, product launches and partnerships — with KPI cards, searchable company tables, a filterable signal feed, trend charts and ranked insights.

**Repository:** `abm-signal-dashboard`  
**File count:** 38

## Features

- Sticky header with status dot, updated timestamp + relative-time pill, Refresh Dashboard button, global Filters control and company search
- Horizontal top tab bar (Overview | Companies | Signals | Trends | Insights) with green active underline and keyboard-accessible tabs
- Overview KPI grid with sparklines, confidence pills, selected-card state and click-to-filter into the Signals tab
- Donut of signals by family and horizontal bar of top signal types
- Searchable, sortable Companies table with sticky header, hover rows and a per-company side drawer of signals
- Filterable Signals feed with family/type chips, confidence badges, two-line summaries with expand, source links and empty states
- Trends tab with stacked area by month, run-over-run bar chart, per-family legend toggles and a summary strip
- Insights tab with callout tiles and family-grouped rich insight cards
- Refresh shimmer skeletons, Arena dark theme, fully responsive, Recharts throughout
- Arena email gate via middleware, access-denied page and server-logged refresh events in Postgres via Prisma

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Infrastructure

- **Neon project ID:** `calm-thunder-53828063` — managed by Sim Development; do not delete or replace
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
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`

### Components

- `components/Badges.tsx`
- `components/CompaniesTab.tsx`
- `components/CompanyDrawer.tsx`
- `components/DashboardClient.tsx`
- `components/EmptyState.tsx`
- `components/HeaderBar.tsx`
- `components/InsightsTab.tsx`
- `components/KpiCard.tsx`
- `components/OverviewTab.tsx`
- `components/SignalsTab.tsx`
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

- `README.md`
- `REPO_SUMMARY.md`

## Complete File Index

- `.env.example`
- `.gitignore`
- `README.md`
- `REPO_SUMMARY.md`
- `app/access-denied/page.tsx`
- `app/arena-ds-tokens.css`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `components/Badges.tsx`
- `components/CompaniesTab.tsx`
- `components/CompanyDrawer.tsx`
- `components/DashboardClient.tsx`
- `components/EmptyState.tsx`
- `components/HeaderBar.tsx`
- `components/InsightsTab.tsx`
- `components/KpiCard.tsx`
- `components/OverviewTab.tsx`
- `components/SignalsTab.tsx`
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

- **Updated at:** 2026-08-20T11:04:36.165Z
- **Request:** Build a , Arena-themed analytics dashboard app called "ABM Signal Tracker".

== DATA ==
The app is driven by this JSON payload (real data, produced upstream by the workflow). Model all types, components and charts on this exact shape:

{"meta":{"email":"sakshi.mishra@position2.com","runId":"20260820-101524-u6vvc8","generatedAt":"2026-08-20T10:49:28.593Z","rowsInRun":1,"rowsAllRuns":9,"families":["funding","csuite","product","partnership"]},"kpis":{"companiesTracked":1,"totalSignals":1,"highAlerts":0,"csuiteChanges":1,"funding":0,"mergersAcquisitions":0,"ipo":0,"grants":0,"debtFinancing":0,"productLaunches":0,"partnerships":0},"byFamily":{"funding":0,"csuite":1,"product":0,"partnership":0},"byType":{"Departed":1},"byConfidence":{"HIGH":0,"MEDIUM":1,"LOW":0,"UNKNOWN":0},"companies":[{"company":"Realme","total":1,"funding":0,"csuite":1,"product":0,"partnership":0,"high":0,"latestDate":"2026-06-23"}],"signals":[{"company":"Realme","family":"csuite","signal_type":"Departed","date":"2026-06-23","source":"Storyboard18","url":"https://www.storyboard18.com/brand-makers/realme-india-ceo-michael-guo-exits-amid-oppo-oneplus-restructuring-102128.htm","summary":"Michael Guo — Chief Executive Officer — Departed | Source: Storyboard18, https://www.storyboard18.com/brand-makers/realme-india-ceo-michael-guo-exits-amid-oppo-oneplus-restructuring-102128.htm ; Confidence: Medium ; Michael Guo exited as Realme India CEO amid Oppo/OnePlus restructuring, with reports saying Chase Xu would temporarily oversee India operations.","confidence":"MEDIUM","run_id":"20260820-101524-u6vvc8","run_date":"2026-08-20"}],"insights":[],"trends":{"byRunDate":[{"date":"2026-08-20","total":9,"funding":4,"csuite":4,"product":1,"partnership":0}],"byMonth":[{"month":"2026-06","total":1,"funding":0,"csuite":1,"product":0,"partnership":0}]}}

Payload shape reference:
- meta: { email, runId, generatedAt, rowsInRun, rowsAllRuns, families[] }
- kpis: { companiesTracked, totalSignals, highAlerts, csuiteChanges, funding, mergersAcquisitions, ipo, grants, debtFinancing, productLaunches, partnerships }
- byFamily: { funding, csuite, product, partnership }  // signal counts per family
- byType: { FUNDING_ROUND, IPO_SIGNAL, M_AND_A, GRANT, DEBT_FINANCING, PUBLIC_OFFERING, ...product types, ...partnership types, ...csuite actions }
- byConfidence: { HIGH, MEDIUM, LOW, UNKNOWN }
- companies: [ { company, total, funding, csuite, product, partnership, high, latestDate } ]
- signals: [ { company, family, signal_type, date, source, url, summary, confidence, run_id, run_date } ]  // sorted newest first
- insights: [ ...same shape as signals, HIGH confidence only, max 25 ]
- trends: { byRunDate: [ { date, total, funding, csuite, product, partnership } ], byMonth: [ { month, total, funding, csuite, product, partnership } ] }

Seed the app with this payload as typed static/mock data in a single data module so every tab renders immediately with real values. Keep the module boundary clean so it can later be swapped for an API fetch. Never invent metrics that are not derivable from the payload; if a value is absent, render an em dash or a zero state rather than fabricating a number.

== THEME ==
Arena dark theme throughout — deep near-black page background (#0A0C10 to #0D1117), slightly lighter elevated card surfaces (#12161D) with a subtle 1px border (rgba(255,255,255,0.06)) and soft rounded corners (12-14px). Arena accent palette: electric green (#22C55E) for primary actions and positive states, violet/indigo (#6366F1) for signal volume, red (#EF4444) for high alerts, amber (#F59E0B) for medium, slate grey (#64748B) for low. Typography: clean geometric sans (Inter), large tabular-number KPI figures with tight tracking, and small uppercase wide-tracked labels in muted grey (#8B94A7). Generous spacing, no heavy drop shadows, subtle hover elevation and 150ms transitions.

== LAYOUT ==
CRITICAL: navigation tabs sit HORIZONTALLY ACROSS THE TOP — there must be NO left sidebar anywhere in the app.

Header bar (sticky, full width): a small status dot + the app name "ABM Signal Tracker" on the left, then "Updated <meta.generatedAt formatted as DD-MM-YYYY HH:mm>" with a subtle relative-time pill next to it. On the right: a green "Refresh Dashboard" primary button, a "Filters" control (family, confidence, date range, signal type), and a "Search companies..." input.

Directly beneath the header, a horizontal tab bar with these five tabs, the active one marked by a green underline and brighter text: Overview | Companies | Signals | Trends | Insights.

== OVERVIEW TAB ==
A responsive grid of KPI stat cards (4 per row on desktop, 2 on tablet, 1 on mobile). Each card: an emoji/icon top-left, a very large number, an uppercase muted label beneath it, and a small sparkline / area trend line pinned to the bottom of the card tinted to that card's accent colour. Cards, in order:
1. Companies Tracked (kpis.companiesTracked)
2. Total Signals (kpis.totalSignals) — plus three small pills underneath showing H / M / L counts from byConfidence, coloured red / amber / slate
3. High Alerts (kpis.highAlerts) — red accent
4. C-Suite Changes (kpis.csuiteChanges) — violet accent
5. Funding (kpis.funding) — green accent, and give this card a visible selected/active state with a green border to show card selection is supported
6. Mergers & Acquisitions (kpis.mergersAcquisitions)
7. IPO (kpis.ipo)
8. Product Launches (kpis.productLaunches)
9. Partnerships (kpis.partnerships)
Sparklines derive from trends.byMonth for the matching family/type; when there is only one data point, render a flat baseline instead of an empty chart. Clicking a KPI card filters the Signals tab to that family/type.
Below the KPI grid, add a two-column row: a stacked bar or donut of byFamily, and a horizontal bar of the top signal types from byType.

== COMPANIES TAB ==
A searchable, sortable table of companies from the companies array: Company, Total Signals, Funding, C-Suite, Product, Partnership, High-Confidence count, Latest Signal Date. Sort by any column, search by company name, sticky header, zebra-free rows with hover highlight. Clicking a row opens a side drawer listing that company's individual signals with links.

== SIGNALS TAB ==
A filterable feed/table of every entry in signals: company, a family chip and a signal_type chip (colour-coded per family), the date, a confidence badge (HIGH red / MEDIUM amber / LOW slate), the summary truncated to two lines with expand-on-click, and the source rendered as an external link to url with the source name as label. Filters across the top for family, signal type, confidence and date range, plus free-text search over company and summary. Show a clear empty state when filters match nothing.

== TRENDS TAB ==
Signal volume over time. A multi-series line or stacked area chart of trends.byMonth (x = month, one series per family, using the family accent colours), a second chart of trends.byRunDate showing run-over-run totals, and a small legend with per-family toggles. Include a summary strip above the charts with total signals, most active family and most active month.

== INSIGHTS TAB ==
Highest-priority signals and notable movements. A ranked list of the insights array as rich cards: company, signal type, confidence badge, date, full summary, and the source link. Above it, callout tiles for: the company with the most signals, the company with the most high-confidence signals, the most common signal type, and the most recent signal. Group or section the cards by family.

== BEHAVIOUR ==
Next.js App Router with TypeScript and Tailwind. Recharts for all charts. Fully responsive down to mobile. Header search and the Filters control apply globally across Companies, Signals and Insights. The Refresh Dashboard button re-reads the data module and shows a brief loading shimmer. Include tasteful loading skeletons and empty states everywhere. Accessible: keyboard-navigable tabs, proper aria labels on tabs, charts and buttons, and AA contrast on all text.

CRITICAL: tabs across the TOP, never a left sidebar. Dark Arena palette only — no light mode.
