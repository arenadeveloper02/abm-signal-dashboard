# abm-signal-dashboard

Removed the duplicate 'ABM Signal Tracker' heading (and its duplicated subtitle line) from the page body inside components/AccountSignalTrackerClient.tsx. The top sticky header title remains unchanged. prisma/schema.prisma is echoed verbatim with no modifications. Files changed: components/AccountSignalTrackerClient.tsx (removed the second in-body heading block only; all logic, state, handlers, import flow, and dashboard rendering preserved), prisma/schema.prisma (unchanged echo, required on every database-backed edit).

## Features

- Responsive UI with Tailwind CSS
- Next.js App Router pages and components
- CSV/XLSX company import with background signal analysis
- Stored signals dashboard with KPIs, charts and company details

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
