# abm-signal-dashboard

Surgical edit: renamed the visible dashboard title from 'Account Signal Tracker' to 'ABM Signal Tracker'. Changed files: (1) app/layout.tsx — metadata.title 'Account Signal Tracker' → 'ABM Signal Tracker'; (2) components/AccountSignalTrackerClient.tsx — header <h1> text 'Account Signal Tracker' → 'ABM Signal Tracker'. No design, layout, styling, data, tab, chart, API, or dependency changes were made. HeaderBar.tsx already read 'ABM Signal Tracker' and was untouched. prisma/schema.prisma is returned per database rule (additive-safe AppSetting model matching lib/actions.ts usage; no columns dropped, renamed, or retyped). Build passes: npm run build exits 0.

## Features

- ABM Signal Tracker dashboard title
- CSV/XLSX company import with background analysis
- Stored signals dashboard with tabs, charts, and KPIs
- Arena email gating via middleware and provider

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
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
