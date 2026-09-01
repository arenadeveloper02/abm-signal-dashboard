# abm-signal-dashboard

ABM signal tracker dashboard — removed the Arena emailId access gate, restored the full Companies tab with Delete actions and previous tab design, and removed the duplicate middle Refresh Dashboard control.

## Features

- Loads without ?emailId= query param or arena_email_id cookie (gate removed)
- Companies tab with Company, Industry, family counts, Last Activity and working Delete action
- Restored Overview KPI cards, charts, Signals filters, Trends and Insights tabs
- Single header refresh control — duplicate middle refresh bar removed

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
