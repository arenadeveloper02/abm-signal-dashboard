# Verification — Overview Restore Only

## Overview tab now shows all three restored charts
- **Weekly Signal Trend (click point to filter feed)** — BAR chart, 8 weekly buckets computed client-side from already-loaded `data.signals`; clicking a bar toggles a week filter on the Recent Signals feed (clicking again clears it).
- **Signal Type Breakdown (click to filter feed)** — PIE chart over `signal_type` counts; clicking a slice (or its legend entry) toggles a type filter on the feed.
- **Top Industries by Signal Count (click to filter table)** — horizontal BAR chart over derived industries; clicking a bar toggles an industry filter on the list.
- All three combine, dim unselected segments while a filter is active, expose a "Clear filters" chip, and render a "No data" empty state when there is nothing to chart — never crash.

## Previously existing Overview elements — all preserved (nothing removed)
1. KPI card grid (9 cards: Companies with Signals, Total Signals with H/M/L pills, High Alerts, C-Suite Changes, Funding [selected], Mergers & Acquisitions, IPO, Product Launches, Partnerships) — unchanged, still click-to-filter via `onSelectKpi`.
2. Signals by Family donut chart + legend — unchanged.
3. Top Signal Types horizontal bar chart — unchanged.
4. Recent Signals card — kept in place, row format upgraded (below), still `max-h-96 overflow-y-auto` internal scrolling.

## Overview Recent Signals row format (Overview ONLY)
- Top row: colored severity pill (HIGH red `#F31A1A` / MEDIUM orange `#FB8145` / LOW green `#3BC884`) + category pill (e.g. "C-Suite Change") + right-aligned date (e.g. "Aug 24, 2026").
- Company name as a bold blue link; bold signal headline; grey one/two-line description (`line-clamp-2`).
- Bottom row: industry tag pill (e.g. "Technology") + blue source link (e.g. "Reuters").
- Severity-colored left border (`border-l-4`, red for HIGH). Card scrolls internally.
- The Signals tab feed keeps its own existing row format — untouched.

## Unchanged (byte-for-byte)
- `components/SignalsTab.tsx`, `components/TrendsTab.tsx`, `components/CompaniesTab.tsx`, `components/InsightsTab.tsx` — NOT edited or re-emitted.
- Header buttons, Import screen (`AccountSignalTrackerClient`), `app/api/**`, `lib/**`, `next.config.ts`, `globals.css`, `package.json` — NOT edited; build script still `prisma generate && prisma db push --accept-data-loss && next build`.
- No new dependencies, env vars, API routes, or fetches; no request/response shape changes — charts reuse the already-fetched signals payload.

## Build
- No new imports beyond `recharts` (already a dependency) and React hooks; strict TypeScript with concrete types (`WeekBucket`, `TypeSlice`, `IndustryBar`, `Severity`) — `npm run build` exits 0.

## Files changed
- `components/OverviewTab.tsx` — the only app code change.
  - Before: `import KpiCard from '@/components/KpiCard'` / static Recent Signals list rows (`<span className="text-sm font-medium text-white">{s.company}</span>` ...).
  - After: adds `useMemo`/`useState` + `CartesianGrid` import, three chart sections, feed-filter state, and the severity-pill Recent Signals row format.
- `prisma/schema.prisma` — returned per the mandatory database rule (additive/echo only; `AppSetting` key/value model matching `lib/actions.ts` upsert; no columns dropped, renamed, or retyped; `updatedAt` retained with `@updatedAt @default(now())`).
