# abm-signal-dashboard

Revert of commit 48cb3ac: removed the { company_name, website } analyze payload shape (restored the previous company-keyed payload), removed the 'View sample' button and sample-JSON panel, and removed the website input from 'Add a company manually'. All other files, routes, styles, API handlers, and the Prisma schema are untouched. package.json is kept on the patched, deploy-safe pinned versions (next 16.2.12, react 19.0.0) so the deploy is not blocked by the Next.js CVE; no lockfile is emitted (regenerated on install). Note: this environment has no git access, so exact commit SHAs cannot be reported — the effective diff from the pre-48cb3ac state is package.json/lockfile versions only.

## Features

- Stored signals dashboard with background refresh
- CSV/XLSX company list import with drag-and-drop
- Manual single-company add (company name only)
- Background analyze runs via /api/analyze proxy
- Arena email gating and design-system styling

## Tech Stack

- Next.js 16.2.12 (App Router)
- React 19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Routes

- `/`
- `/access-denied`

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

1. Copy `.env.example` to `.env` for local development
2. Set `DATABASE_URL` to your Postgres connection string
3. Run `npx prisma db push` before `npm run dev` if tables are missing

On Vercel, `DATABASE_URL` is injected when Neon is connected to the project.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build (runs Prisma generate/push when configured)
- `npm run start` — run the production server locally

## Deploy

This project is intended for deployment on [Vercel](https://vercel.com). Connect the GitHub repository and deploy the `main` branch.
