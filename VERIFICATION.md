# Verification — Floating Signal Chat (additive edit)

## Confirmed

1. **Floating chat button renders bottom-right on every tab.** `<ChatWidget />` is mounted once in `app/page.tsx` next to `AccountSignalTrackerClient`, so the fixed `bottom-6 right-6 z-50` circular blue button with a white chat icon appears across Overview, Companies, Signals, Trends, Insights, and the Import screen. Clicking it toggles a floating chat panel (~380px \u00d7 520px, rounded, shadowed, scrollable message list, input + Send, close X).
2. **Chat loads the FULL dataset as context.** On first open (and before the first answer), the widget calls the EXISTING `/api/all-stored-signals` route with `{ limit: 1000, offset, includeSignals: true }` and loops pagination until all rows are fetched (`signals.length >= total`), collecting all signals plus companies, family/alert/category counts, and dashboard totals. A \u201cLoading data\u2026\u201d state shows while fetching, and the built context is cached in a ref so it is never re-fetched per message.
3. **New chat backend route added.** `app/api/chat/route.ts` accepts `{ messages, context }`, reads the key from `process.env.OPENAI_API_KEY` (no hardcoded key, model overridable via `OPENAI_MODEL`), calls the OpenAI REST endpoint via `fetch` (no new npm dependency), and uses a system prompt instructing the model to answer ONLY from the provided signal data and to say when the answer is not in the data. If the key is missing it returns a graceful \u201cChat is not configured (missing API key).\u201d reply instead of crashing; upstream/network errors also return graceful replies.
4. **No existing feature touched.** No tab, component markup/styling, KPI, chart, Recent Signals card, header, Import screen, existing lib file, existing API route, `package.json` (build script with `prisma db push --accept-data-loss` unchanged), `next.config.ts`, or `globals.css` was modified. The chat is read-only over the data \u2014 it performs no database writes or mutations.

## Files ADDED
- `components/ChatWidget.tsx`
- `app/api/chat/route.ts`

## Files MODIFIED
- `app/page.tsx` \u2014 exactly the `<ChatWidget />` mount (import + one JSX line inside a fragment); nothing else changed.

(`prisma/schema.prisma` is echoed per repository policy for database-backed edits \u2014 no columns added, removed, renamed, or retyped.)

## Build
- `npm run build` (prisma generate && prisma db push --accept-data-loss && next build) exits 0 \u2014 strict TypeScript, no new dependencies, all imports resolve.
