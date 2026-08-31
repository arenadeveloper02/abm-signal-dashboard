# Repository Summary: abm-signal-dashboard

> Auto-maintained by Sim Development. Last updated: 2026-08-31T05:39:41.280Z.

## Overview

HARD STOP — GIT IS NOT AVAILABLE IN THIS ENVIRONMENT. I cannot run git log, git reset, git revert, git diff, or git push. Per the task's explicit HARD STOP CONDITION, I am reporting this and changing NOTHING: zero application files (pages, components, routes, styles, config) have been rewritten, regenerated, or restored from memory. No UI code has been authored. The only file returned is prisma/schema.prisma, echoed byte-for-byte verbatim from the live-database baseline because the platform mandates it be included in every database-backed edit response — it is an unchanged echo, not an edit. REPORT: (1) git log output: UNAVAILABLE — I have no shell or git tooling; I can only emit JSON file contents. (2) <good-sha>: NOT DETERMINED — cannot inspect history. (3) SHAs reverted/discarded: NONE — nothing was reverted or force-pushed. (4) git diff --stat output: UNAVAILABLE. NEXT STEP FOR A HUMAN OR GIT-CAPABLE AGENT: run `git log --oneline -20 main`, identify the last commit dated before 2026-08-28 (the parent of 48cb3ac), then `git reset --hard <good-sha> && git push --force-with-lease origin main`, and verify with `git diff --stat <good-sha> main` (must be empty). The working dashboard code (tabs + charts) exists in git history and must be restored via git only — per this task, recreating it by hand is forbidden and I have complied.

**Repository:** `abm-signal-dashboard`  
**File count:** 49

## Features

- GIT UNAVAILABLE: reported explicitly per HARD STOP CONDITION — this is the designated successful outcome
- No application files rewritten, regenerated, or restored from memory — zero UI/route/component/style/config changes
- No pushes, resets, reverts, or force-pushes performed
- prisma/schema.prisma echoed verbatim (unchanged) solely to satisfy the mandatory database-file rule — all columns (key, value, createdAt, updatedAt) intact
- Human/git-capable follow-up documented: reset main to the last pre-2026-08-28 commit (parent of 48cb3ac) and force-push with lease

## Tech Stack

- Next.js 16.2.12 (App Router)
- React 19.0.0
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

## Prisma Schema — STRICT: NEVER DROP OR DELETE COLUMNS

This section is binding on every edit. Vercel deploy runs `prisma db push` with **NO** `--accept-data-loss`. Dropping or altering a live column **fails the deploy**.

**FORBIDDEN (non-negotiable):**
- Do **not** delete, drop, omit, rename, or retype ANY existing column in `prisma/schema.prisma`
- Do **not** drop models or tables
- Do **not** "clean up", "simplify", or regenerate the schema from memory or from this summary
- Do **not** remove `createdAt` / `updatedAt` (or any other listed field) even if the UI no longer uses it

**ALLOWED:**
- ADD new models, columns, relations, or enums only
- New columns on existing models MUST be optional (`?`) or have `@default(...)`
- If the UI no longer needs a field, stop reading it in code — leave the column in the schema unchanged

**Immutable columns (must remain identical — same name, same type):**

- `AppSetting`: `key String`, `value String`, `createdAt DateTime`, `updatedAt DateTime`

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

- **Updated at:** 2026-08-31T05:39:41.280Z
- **Request:** GIT-LEVEL REVERT ONLY. READ THIS ENTIRE INSTRUCTION BEFORE DOING ANYTHING.

ABSOLUTE PROHIBITION: DO NOT rewrite, regenerate, recreate, hand-edit, or author ANY application file. Do not write a single line of UI, component, page, route, or style code. Do not 'restore' anything from memory or by reasoning about what the app used to look like. The ONLY tool you may use to change this repository is git, operating on existing commit history.

WHY: The last two runs of this task destroyed the production dashboard. Instead of restoring git history, they regenerated the application from scratch. The result: all dashboard TABS are gone and all CHARTS are gone. The user's live app is broken. The previous working code still exists in git history. It must be restored from history, not rebuilt.

YOU HAVE PUSH ACCESS. You pushed commit 48cb3ac to arenadeveloper02/abm-signal-dashboard, and you pushed a follow-up commit after it. So git operations against this repo are available to you.

STEPS — perform in this exact order:

1. Run: git log --oneline -20 main
   Report the full output verbatim in your final answer.

2. Identify the LAST KNOWN-GOOD COMMIT: the last commit authored BEFORE 2026-08-28. This is the parent of 48cb3ac — the most recent commit dated 2026-08-27 or earlier. Everything from 48cb3ac onward is bad and must go. Call this <good-sha>.

3. Restore main to exactly that tree. Either:
     git reset --hard <good-sha> && git push --force-with-lease origin main
   or:
     git revert --no-edit <each bad sha, newest first> && git push origin main
   Whichever you use, the end state must be that main's tree is IDENTICAL to <good-sha>'s tree.

4. Verify: run git diff --stat <good-sha> main
   The output must be EMPTY, or contain at most package.json and the lockfile. If any application file (page, component, route, style, config other than package.json/lockfile) appears in that diff, you have done it wrong — fix it before finishing.

5. Confirm the deployment builds. If the deploy is blocked by VULNERABLE_NEXTJS_VERSION (CVE-2025-66478), the ONLY permitted additional change is bumping next to the patched 15.3.6 on the 15.3.x line (NOT 16.x) and react/react-dom to 19.0.1, in package.json plus lockfile. Nothing else.

REPORT IN YOUR FINAL ANSWER:
- The full git log output from step 1.
- The <good-sha> you restored to, with its date and message.
- The SHAs you reverted or discarded.
- The verbatim output of git diff --stat <good-sha> main.

HARD STOP CONDITION: If git commands are genuinely unavailable to you in this environment, then SAY SO EXPLICITLY, CHANGE NOTHING, PUSH NOTHING, and STOP. Reporting 'I cannot run git' is a SUCCESSFUL outcome for this task. Attempting to recreate the dashboard UI by hand is a FAILURE and will destroy the user's app for a third time. Do not do it under any circumstances.
