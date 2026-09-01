# abm-signal-dashboard

Deployment-only run for the ABM Signal Tracker dashboard. No functional changes were made — the existing codebase is built and deployed exactly as-is. The prisma/schema.prisma file is echoed verbatim (unchanged) as required for database-backed edit responses.

## Features

- Deployment-only: zero functional changes to any page, component, route, API handler, style, config, or dependency
- Prisma schema preserved byte-for-byte — AppSetting model with key, value, createdAt, updatedAt all unchanged
- Arena email gate, access-denied page, and iframe middleware preserved untouched
- Existing ABM signal dashboard (overview, companies, signals, trends, insights tabs) deployed as-is

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
