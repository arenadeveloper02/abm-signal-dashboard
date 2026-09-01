# abm-signal-dashboard

ABM Signal Tracker dashboard — surgical edit: removed the middleware emailId gate (dashboard loads without ?emailId while keeping frame-ancestors CSP and optional cookie persistence), made useArenaEmailId return '' instead of throwing, restored the Company info section (description, facts, tech/keyword chips) on expanded company rows while keeping the Delete action, and ensured only the top header Refresh bar remains. prisma/schema.prisma is returned verbatim and untouched.

## Features

- Dashboard loads at / without emailId query or cookie (no access-denied rewrite)
- Companies table with Company, Industry, Total, Funding, C-Suite, Product, Partnership, Last Activity, Actions columns
- Delete button per company posting to /api/delete-company
- Restored Company info section on row expand: short description, Domain/Industry/Website/LinkedIn/Employees/Location facts, tech stack and keyword chips
- Expandable recent signals under each company row
- Single Refresh Dashboard control (top header only, from AccountSignalTrackerClient)
- Overview KPIs and recharts visualizations (family pie, weekly volume, top companies, top types)

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
