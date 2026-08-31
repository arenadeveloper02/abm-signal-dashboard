# abm-signal-dashboard

Added a client-side search input to the Signals tab filter bar. Files changed: components/SignalsTab.tsx — (1) added local searchQuery useState alongside the existing expanded state; (2) added a visible useMemo that further narrows the already-filtered signals with a case-insensitive substring match on company, signal_type, and summary (AND logic on top of existing filters, restores filter-only set when cleared); (3) added one text input with placeholder 'Search signals' in the existing filter bar, reusing the exact selectCls styling; (4) swapped the list rendering, empty-state check, and result count from `filtered` to `visible`. prisma/schema.prisma is returned verbatim and unchanged per the database rule — no schema, API, or backend changes were made.

## Features

- Client-side signal search in the Signals tab filter bar
- Search combines with existing filters using AND logic
- Case-insensitive substring matching on company, signal type, and summary
- Responsive UI with Tailwind CSS
- Next.js App Router pages and components

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
