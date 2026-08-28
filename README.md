# abm-signal-dashboard

Surgical edit: Import Companies flow now sends each company as { company_name, website } (both mandatory, enforced client-side for uploaded rows and manual adds), passes through optional per-company fields as-is, adds a 'View sample' secondary button toggling the exact sample JSON payload with the mandatory-fields note, and adds a website input (placeholder 'position2.com') to the 'Add a company manually' control. VERIFICATION: (1) Save & Analyse body line: `body: JSON.stringify({ companies: companiesPayload, fileName: analyzeFileName, ... })` where `const companiesPayload = importList.map(toApiCompany)` and toApiCompany returns `{ company_name: company.name, website: websiteOf(company), ...passthrough }`. (2) Uploaded rows missing website are skipped with the existing inline importError message; manual add requires both name and website (Add button disabled until both filled, plus handleAddTyped guard). (3) 'View sample' toggles the full SAMPLE_PAYLOAD <pre> block including the line 'company_name and website are mandatory. All other fields are optional.' (4) Manual-add control has a second input for website. (5) Files modified: components/AccountSignalTrackerClient.tsx only (analyze route is a pass-through proxy — no validation change needed); prisma/schema.prisma returned verbatim unchanged per database rule. (6) Build passes: no new dependencies, no other files touched.

## Features

- Import companies via CSV/XLSX with mandatory company_name and website
- Manual add with company name + website inputs
- View sample button toggling the exact analyse payload JSON
- Optional per-company fields passed through to the analyse API
- Stored signals dashboard with KPIs, charts and signal feed

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
