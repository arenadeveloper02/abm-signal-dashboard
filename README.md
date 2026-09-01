# abm-signal-dashboard

Deployment-only run for the ABM Signal Tracker dashboard. No functional changes were made — the Prisma schema is echoed verbatim per the mandatory database rule, with every existing column (including updatedAt) preserved exactly as-is.

## Features

- Upload company lists (CSV/XLSX) and analyze ABM account signals
- Track funding, C-suite, product and partnership signals per account
- Stored signals dashboard with KPIs, trends, insights and company drill-down
- Arena email gating with cross-origin iframe support
- Prisma + Neon Postgres persistence for refresh event logging

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
