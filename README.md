# abm-signal-dashboard

Fixed Overview tab navigation: clicking the companies KPI card ('Companies with Signals' / Total Companies) now opens the Companies tab instead of the Signals tab. Files changed: components/OverviewTab.tsx (added optional target to the KPI card definition and onSelectKpi call for the companies card only), components/DashboardClient.tsx (handleSelectKpi accepts an optional target tab defaulting to 'signals' so all other cards keep their existing behavior). prisma/schema.prisma echoed verbatim — untouched per standing rule.

## Features

- Responsive UI with Tailwind CSS
- Next.js App Router pages and components
- ABM signal tracking dashboard with KPI cards, charts, and filterable feed
- Companies KPI card navigates to the Companies tab

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
