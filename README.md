# abm-signal-dashboard

Edited abm-signal-dashboard. Changes: components/AccountSignalTrackerClient.tsx — in the Import section's 'Add a company manually' block, the second input (company website) placeholder was changed from 'position2.com' to 'website'. Placeholder string change only; no other logic, styling, state, or validation touched. prisma/schema.prisma is echoed verbatim (unchanged, per the database rule). app/not-found.tsx included per canonical requirement (unchanged content).

## Features

- Responsive UI with Tailwind CSS
- Next.js App Router pages and components
- CSV/XLSX company import with manual add
- Stored signals dashboard

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
