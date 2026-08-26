# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-26T03:30:06.037Z.

## Overview

ABM Account Signal Tracker: upload a company list (CSV/XLSX), analyze accounts via the ABM workflow API, fetch stored signals via the Signal Read API, and explore a full dashboard (Overview, Trends, All Signals, Companies). Changed files: components/AccountSignalTrackerClient.tsx (completed the toolbar with the secondary 'Fetch Stored Signals' button next to Analyze, wired disabled/loading states, error banners, upload dropzone, companies table, and rendering of the stored-signals dashboard), components/StoredSignalsDashboard.tsx (completed the full Account Signal Tracker dashboard UI: header with Import/Refresh, tabs, 8 stat cards, severity donut, signals-by-type bar chart, top companies, recent high-severity list, trends area chart, sortable/filterable signals table with expandable field details, companies tab, unmatched-inputs note, empty states), prisma/schema.prisma (echoed — RefreshEvent model unchanged, no columns modified).

**Repository:** `abm-signal-dashboard`  
**File count:** 45

## Features

- CSV/XLSX company list upload with drag-and-drop
- Analyze button calling the ABM workflow API
- Fetch Stored Signals button calling the ABM Signal Read API with { companies: [{ company_name }], limit: 1000 }
- Account Signal Tracker dashboard with Overview, Trends, All Signals and Companies tabs
- Severity normalization across funding/csuite/product/partnership families
- Signals-by-type display-label mapping and charts (recharts)
- Per-signal family-specific field details with irregular source-link handling
- Unmatched-inputs note and empty states

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

- **Updated at:** 2026-08-26T03:30:06.037Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

=== 1. NEW BUTTON ===

Add a second button next to the existing "Analyze" button, labelled "Fetch Stored Signals". It must sit in the same button row/toolbar, reuse the existing button component and styling (secondary/outline variant so Analyze stays primary), and be disabled while no companies have been added or while either request is in flight.

=== 2. API CALL ===

On click, call the ABM Signal Read API with the companies currently added in the UI.

Reference curl:

  curl -X POST \
    -H "X-API-Key: $SIM_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"companies":[{"company_name":"Acer Incorporated"}],"limit":1000}' \
    https://agent.thearena.ai/api/workflows/136226a3-03d4-439f-9e3d-a9fdcb47a3f7/execute

- Method: POST to https://agent.thearena.ai/api/workflows/136226a3-03d4-439f-9e3d-a9fdcb47a3f7/execute
- Headers: X-API-Key read from the SAME environment variable the existing Analyze call already uses (do not hardcode the key, do not introduce a new env var), and Content-Type: application/json.
- Body: ONLY these two fields — a "companies" array of objects each containing just "company_name", built from the companies added in the UI, and "limit": 1000. Do NOT send website, companyKeys, runId, signalFamily, offset, or any other field.

Example body with multiple companies:

  {
    "companies": [
      { "company_name": "Realme" },
      { "company_name": "VIT" },
      { "company_name": "Jazz Hipster Corp" },
      { "company_name": "Shenzhen Absen Optoelectronic Co.,Ltd." }
    ],
    "limit": 1000
  }

Mirror the Analyze button's existing loading/error pattern (same loading indicator treatment, same error toast/banner component) and unwrap the response envelope the same way the Analyze handler already does.

Response body shape: { total, returned, limit, offset, requested_count, matched_count, unmatched_count, counts_by_family: { funding, csuite, product, partnership }, matched_companies: [ { input, company_id, company_name, company_key, total, by_family } ], unmatched_inputs: [...], companies: [ { company_id, company_name, company_key, domain, website, industry, hq, total, by_family } ], signals: [ { id, company_id, company_name, company_key, signal_family, signal_key, signal_type, company, summary, source_name, source_url, confidence, announcement_date, run_id, run_date, first_seen_at, last_seen_at, seen_count, fields } ], signals_by_family: { funding: [...], csuite: [...], product: [...], partnership: [...] } }.

=== 3. RENDER A FULL "ACCOUNT SIGNAL TRACKER" DASHBOARD ===

Do NOT render a plain table. Build the following dashboard from the response.

LAYOUT

- Header: title "Account Signal Tracker"; subline "Last updated: <run_date of the newest signal, formatted like Aug 24, 2026, 04:25 PM> · Updated <Nd Nh> ago"; top-right buttons "Import Companies" and "Refresh Dashboard" (Refresh re-calls the Read API with the same body).
- Tabs: Overview | Trends | All Signals | Companies.
- Overview tab: 8 stat cards in two rows of 4, each with a coloured border/tint and a large number — Companies Tracked (blue), Total Signals (cyan), High Alerts (red), Signals (Last 7 Days) (orange), Companies With Signals (purple), C-Suite Changes (pink), Funding Events (green), Mergers & Acquisitions (amber).
- Then two side-by-side cards: "Severity Distribution" — donut chart with HIGH (red) / MEDIUM (orange) / LOW (green) legend; and "Signals by Type" — vertical bar chart, blue bars, rotated x labels, integer y ticks.
- Below those: "Top Companies by Signals" (horizontal bars / ranked list) and "Recent High Severity Signals" (list of cards each with a red left border, newest first).
- Trends tab: signals over time bucketed by announcement_date (line or area chart), optionally stacked by signal_family.
- All Signals tab: full sortable/filterable table with family + severity + company filters and a search box.
- Companies tab: one row/card per entry in companies[] showing company_name, domain/website, industry, hq, total, and the by_family breakdown.

DERIVATION RULES — code against the real payload. These facts were verified against an actual response for "Acer Incorporated" (total 29, counts_by_family { funding: 9, csuite: 3, partnership: 12, product: 5 }, one company: acer.com / "Technology Hardware" / "Taiwan").

- FIRST, filter out rows where signal_type === "NO_SIGNIFICANT_SIGNAL" (these are real rows, e.g. signal_key "|no_significant_signal|", with empty source and confidence). Exclude them from every count, chart, and table.
- Companies Tracked = requested_count. Companies With Signals = matched_count. Total Signals = length of the filtered signals array.
- Severity MUST be normalized, because confidence is inconsistent per family:
  * funding → "HIGH" / "MEDIUM" (uppercase strings)
  * partnership → "high" (lowercase)
  * product → numeric strings ("8", "9"): >= 8 → HIGH, 5–7 → MEDIUM, < 5 → LOW
  * csuite → confidence is "" (empty): fall back to fields["Validation Status"] === "Confirmed" ? HIGH : MEDIUM
  Uppercase-compare all string values. High Alerts = count of normalized HIGH.
- Signals (Last 7 Days) = signals whose announcement_date (fallback last_seen_at) is within 7 days of now.
- C-Suite Changes = counts_by_family.csuite. Funding Events = counts_by_family.funding. Mergers & Acquisitions = count of signals with signal_type "M_AND_A".
- "Signals by Type" chart: group by a DISPLAY LABEL derived from signal_type, since raw values mix slugs and free text. Mapping: csuite family → "C-Suite Change"; "M_AND_A" → "Mergers & Acquisitions"; "FUNDING_ROUND" / "DEBT_FINANCING" / "EARNINGS" → "Funding"; "IPO_SIGNAL" → "IPO"; partnership family → "Partnership"; product family ("NEW_PRODUCT_LAUNCH") → "Product Launch"; anything unmapped → "Other". Sort bars descending by count.
- Top Companies by Signals = companies[] sorted by total descending.
- Recent High Severity Signals = normalized-HIGH signals sorted by announcement_date descending (fallback last_seen_at), each showing company_name, display type label, summary, date, and source as a link.
- SOURCE LINKS are irregular:
  * csuite rows have EMPTY source_name and source_url — for those, take URLs from fields["Supporting URLs"] (comma-separated; the literal "N/A" means none) and label the link with fields["Document Type"] or "Source".
  * some partnership rows have MULTIPLE space-separated URLs inside source_url — split on whitespace and render each as its own link.
  * all links open in a new tab.
- Per-signal detail (row expand or drawer) should render the family-specific fields{} object. The four families use DISJOINT column vocabularies:
  * partnership: target_company, partner_company, partnership_type, announcement_date, source_name, source_url, agent_id, summary, confidence, language, first_seen, Signal Sub-Type, Source Category, Supporting URLs, Document Type, Validation Status, Why It Matters, Outreach Angle, Recommended Next Action
  * product: Run Date, Company, Industry, Signal Type, Headline, Summary, Key Details, Date Published, Days Ago, Source Name, Source URL, Confidence Score, Evidence 1, Evidence 2, Evidence 3, Priority, Notes
  * csuite: Company Name, Domain, Person Name, Title, Action, Start Date, LinkedIn URL, Notes, Signal Sub-Type, Source Category, Supporting URLs, Document Type, Validation Status, Why It Matters, Outreach Angle, Recommended Next Action
  * funding: Scan Date, Company Name, Signal Type, Funding Stage, Amount, Lead Investor, Co-Investors, Announcement Date, Source Name, Source URL, Source Tier, Confidence, Summary, Signal Sub-Type, Source Category, Supporting URLs, Document Type, Validation Status, Why It Matters, Outreach Angle, Recommended Next Action
  Render whichever keys are actually present on the row. SKIP these keys entirely: "Normalized Entity", "Sources Checked", "Research Gaps", "Reserved" (multi-KB prose or always empty).
- Show an empty state when no signals remain after filtering.
- When unmatched_inputs is non-empty, show a muted note listing those company names as "no stored signals found".

=== CONSTRAINTS ===

Only touch the files/functions directly related to the points above.
Reuse the existing components and the charting library already present in the repo — do not introduce a new UI or charting library.
Do not change variable names, code style, or structure outside the scope of these changes.
Do not add extra features, optimizations, or refactors that weren't requested.
If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
After implementing, list exactly which files and lines were changed, and why.
