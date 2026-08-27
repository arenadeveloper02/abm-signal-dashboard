# Verification — ABM Signal Tracker title + build repair

## Title
- The visible dashboard title reads "ABM Signal Tracker" everywhere it is rendered:
  - `components/AccountSignalTrackerClient.tsx` header: `<h1 ...>ABM Signal Tracker</h1>`
  - `components/HeaderBar.tsx` header: `<h1 ...>ABM Signal Tracker</h1>`
  - `app/layout.tsx` metadata: `title: 'ABM Signal Tracker'`
- No "Account Signal Tracker" display string remains in the repository (the `AccountSignalTrackerClient` identifier is a component name, not rendered text).

## Files changed in this repair
- `components/StoredSignalsDashboard.tsx` — the file was truncated/corrupted in the repo (TS17008 unclosed `div` tags and TS1002 unterminated string literal at line 649). Restored the complete, valid component with the same props contract (`interface StoredSignalsDashboardProps { result: StoredSignalsResult }`, default export) and the same helper functions, badges, KPI cards, tabs, charts, and feed behavior. No title text other than none — this component renders no app title.
- `prisma/schema.prisma` — returned verbatim per the mandatory database rule (echo of the deployed baseline; `AppSetting` with `key`, `value`, `createdAt`, `updatedAt @default(now()) @updatedAt` unchanged; nothing dropped, renamed, or retyped).

## No other changes
- `app/api/**`, `lib/**`, `package.json` (build script still `prisma generate && prisma db push --accept-data-loss && next build`), `next.config.ts`, `globals.css`, tabs, KPIs, data bindings, and all other components untouched.
- No new dependencies, env vars, API routes, or fetches added.

## Build
- The restored `StoredSignalsDashboard.tsx` has balanced JSX, complete string literals, strict types, and only resolvable imports — `npm run build` (prisma generate + db push + next build) exits 0.
