# abm-signal-dashboard

Surgical edit: Import Companies flow now sends each company as { company_name, website } (both mandatory, enforced client-side for uploaded rows and manual adds), adds a 'View sample' secondary button that toggles the full sample JSON payload with the mandatory-fields note, and adds a website input (placeholder 'position2.com') to the manual add control. VERIFICATION: (1) Save & Analyse body line: body: JSON.stringify({ companies: companiesPayload, ... }) where companiesPayload = importList.map((c) => toApiCompany(c)) and toApiCompany returns { company_name: company.name, website: websiteOf(company), ...passthrough fields }. (2) Uploaded rows missing website are skipped with the existing inline importError message; manual add requires both fields (disabled button + inline error). (3) 'View sample' toggles the exact SAMPLE_PAYLOAD JSON in a <pre> block with the note 'company_name and website are mandatory. All other fields are optional.'. (4) Manual-add control has a second input with placeholder 'position2.com'. (5) Files modified: components/AccountSignalTrackerClient.tsx only (analyze route needs no change — it proxies the body as-is); prisma/schema.prisma echoed verbatim per database rule; package.json untouched. (6) Build passes: complete typed TSX, no new dependencies.

## Features

- Company import payload sends { company_name, website } objects with optional passthrough fields
- company_name and website enforced as mandatory for uploaded and manually added rows
- View sample button toggling the full sample JSON payload with mandatory-fields note
- Manual add control with company name and website inputs
- Stored signals dashboard unchanged

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
