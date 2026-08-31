# abm-signal-dashboard

Surgical edit: Import Companies flow now requires company_name + website per company. VERIFICATION — (1) Save & Analyse payload line: `const result: Record<string, string> = { company_name: company.name, website: websiteOf(company) }` inside toApiCompany, sent via `body: JSON.stringify({ companies: companiesPayload, ... })`. (2) Mandatory enforcement: uploaded rows missing website are skipped with the existing inline importError message; handleSaveAnalyze re-validates every row (`c.name.trim() === '' || websiteOf(c) === ''`) and blocks submission; manual add button is disabled until both name and website are non-empty. (3) 'View sample' secondary button toggles a <pre> block with the exact sample JSON plus the note 'company_name and website are mandatory. All other fields are optional.' (4) Manual-add control now has a second input with placeholder 'position2.com'. (5) Files modified: components/AccountSignalTrackerClient.tsx only (prisma/schema.prisma echoed verbatim per DB rule; analyse route performs no shape validation so it was untouched). (6) Build passes: no new deps, no schema change, strict TypeScript maintained.

## Features

- Import Companies payload sends { company_name, website } per company with optional passthrough fields
- company_name and website enforced as mandatory for uploaded rows and manual adds
- View sample button toggling the full sample analyse payload JSON
- Manual add control with separate company name and website inputs
- Existing stored-signals dashboard, tabs, and styling untouched

## Tech Stack

- Next.js ^15.3.3 (App Router)
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
