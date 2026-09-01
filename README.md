# abm-signal-dashboard

Removed the duplicated in-body dashboard header (title, 'companies tracked · significant signals' subtitle, and duplicate Refresh Dashboard button) from the stored-signals dashboard card above the tab bar. The top header bar and all tabs, cards, charts and filters are preserved. prisma/schema.prisma is returned verbatim and unchanged (add-only policy; no columns touched).

## Features

- Responsive UI with Tailwind CSS
- Next.js App Router pages and components
- ABM stored-signals dashboard with Overview / Companies / Signals / Trends / Insights tabs

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
