# abm-signal-dashboard

Edited abm-signal-dashboard. Changed files: components/AccountSignalTrackerClient.tsx — (1) toApiCompany now emits { company_name, website, ...optional fields } with column aliases mapping city/state/country/linkedin variants to company_city/company_state/company_country/company_linkedin_url plus industry/employees/account_owner/account_stage pass-through; parser additionally accepts 'name' and 'company_name' columns and reads location from company_city/company_state/company_country aliases; handleSaveAnalyze rejects rows missing company_name or website via the existing importError inline mechanism before sending. (2) Added a 'View sample' toggle button (same button styling as the import area) revealing a read-only sample payload block with the mandatory-fields note. (3) 'Add a company manually' gained a required website input (placeholder position2.com) using the same input styling; manual rows now carry Company + Website in raw so they submit as { company_name, website }. prisma/schema.prisma — returned verbatim, untouched (no columns added, edited, or dropped).

## Features

- Save & Analyse payload sends company_name and website (both mandatory) per company
- Optional per-company fields passed through: industry, company_city, company_state, company_country, employees, company_linkedin_url, account_owner, account_stage
- CSV/XLSX parser accepts company_name, Company, Company Name, Name and website columns
- View sample button toggles the exact sample request payload with mandatory-fields note
- Manual company entry requires both name and website inputs
- Inline validation error shown before the analyze request is sent

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
