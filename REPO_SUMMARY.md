# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-27T08:25:09.348Z.

## Overview

ABM Signal Tracker dashboard with stored-signal analytics tabs and a floating AI chat assistant grounded in the full signal dataset.

**Repository:** `abm-signal-dashboard`  
**File count:** 49

## Features

- Stored signals dashboard with Overview, Companies, Signals, Trends and Insights tabs
- KPI cards, weekly trend, severity mix, type breakdown and industry charts
- Company table with expandable signal history
- Floating chat assistant grounded in all signal data via /api/chat
- CSV/XLSX company import with background analysis

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
- `app/api/chat/route.ts`
- `app/api/signals/route.ts`
- `app/api/stored-signals/route.ts`

### Components

- `components/AccountSignalTrackerClient.tsx`
- `components/Badges.tsx`
- `components/ChatWidget.tsx`
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
- `VERIFICATION.md`

## Complete File Index

- `.env.example`
- `README.md`
- `REPO_SUMMARY.md`
- `VERIFICATION.md`
- `app/access-denied/page.tsx`
- `app/api/all-stored-signals/route.ts`
- `app/api/analyze/route.ts`
- `app/api/chat/route.ts`
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
- `components/ChatWidget.tsx`
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

- **Updated at:** 2026-08-27T08:25:09.348Z
- **Request:** SCOPE LOCK — ADDITIVE FEATURE ONLY. Obey exactly. This is a SURGICAL, PURELY ADDITIVE EDIT to the existing repo, NOT a regeneration. Do NOT modify, restyle, reformat, or 'improve' anything that already exists. Only ADD the new files/wiring described below.

GOAL: Add a small floating CHAT button (bottom-right, a circular blue button with a chat/message icon — match the mock the user provided) that opens a chat window. In that chat, the user can ask questions about ALL the signal data. The chat must have the FULL data as context: it calls the same all-signals data API the dashboard already uses (fetch ALL rows, not just the current paginated page) and grounds its answers in that data.

IMPLEMENTATION (add only, do not touch existing components/tabs/pages except to MOUNT the button once):
1) Floating button:
   - A fixed-position circular button, bottom-right (e.g. bottom-6 right-6, z-50), blue background, white chat/message icon (reuse lucide-react MessageSquare/MessageCircle which is already available; if not present, use an inline SVG — do NOT add a new dependency).
   - Small footprint. Does not overlap or alter any existing content. Clicking it toggles the chat window open/closed.
2) Chat window/panel:
   - Opens as a floating panel anchored above the button (e.g. fixed bottom-right card, ~380px wide, ~520px tall, rounded, shadow, scrollable message list, input box + send button, and a close 'X'). Keep styling consistent with the existing dashboard theme, but this is a NEW self-contained component — do not restyle anything else.
   - On first open, load the FULL dataset as context: call the SAME data source the dashboard already uses for stored signals (the all-stored-signals data API / route already in the app). Fetch ALL signals (loop pagination or request the full set) so the assistant has complete context. Show a small 'Loading data…' state while fetching. Cache it so it is not re-fetched on every message.
   - Chat behavior: user types a question; send the question PLUS the loaded signal data as context to an LLM chat endpoint and stream/return the answer into the message list. 
3) Chat backend route (ADD a NEW API route only — do not modify existing routes):
   - Add a new route (e.g. app/api/chat/route.ts) that accepts { messages, context } (or fetches the signal data server-side) and calls an LLM. Use an OpenAI-compatible call reading the API key from an environment variable (e.g. process.env.OPENAI_API_KEY) — DO NOT hardcode any key. If the env key is missing, return a graceful message like 'Chat is not configured (missing API key).' instead of crashing.
   - The system prompt should instruct the model: you are an assistant for the ABM Signal Tracker; answer ONLY using the provided signal data context; if the answer is not in the data, say so; be concise. Include the signal data (companies, signals, categories, alerts, totals) in the context.
   - Do NOT change the existing all-signals/stored-signals route or its response shape — the chat route may CALL it or reuse its data-fetching helper, but must not alter it.
4) Mounting: mount the floating chat button component ONCE at the top level of the dashboard page/layout so it appears on every tab, WITHOUT changing any tab's content or layout. This should be a single added <ChatWidget /> line — nothing else in that file changes.

STRICT RULES:
- Do NOT change any existing tab (Overview, Signals, Trends, Companies, Insights), any existing component's markup/styling, KPI values, charts, the Recent Signals card, headers, the Import screen, lib/ existing files, prisma/schema.prisma, package.json build script (`prisma db push --accept-data-loss` MUST remain), next.config, or globals.css. The ONLY allowed edit to an existing file is adding the single <ChatWidget /> mount line.
- Do NOT add npm dependencies. Use fetch + built-in APIs + existing lucide-react icons only. If an OpenAI SDK is not already installed, call the OpenAI REST endpoint with fetch instead of adding a package.
- Do NOT modify existing API routes or the data model. New route file(s) and new component file(s) only.
- Do NOT break the build. Handle missing API key and empty data gracefully.
- The chat is READ-ONLY over the data (answers questions); it must NOT write to the database or mutate any data.

VERIFICATION (print at the end):
- Confirm a NEW floating chat button renders bottom-right on every tab and opens/closes a chat window.
- Confirm the chat, on open, fetches the FULL signal dataset (all rows, all companies) from the existing data API and uses it as context.
- Confirm a NEW app/api/chat route was added that calls an LLM using an ENV var key (no hardcoded key) and grounds answers in the signal data, with graceful handling when the key is missing.
- Confirm NO existing tab/component/style/KPI/chart/route/schema was changed except the single <ChatWidget /> mount line — list every file ADDED and every file MODIFIED (modified list should be exactly the one mount file).
- Confirm `npm run build` exits 0.
