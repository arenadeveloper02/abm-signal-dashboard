# abm-signal-dashboard

ABM Signal Tracker with an added floating chat assistant that answers questions grounded in the full stored-signal dataset via an OpenAI-compatible chat API route.

## Features

- Floating bottom-right chat button that toggles a self-contained chat panel on every tab
- Chat loads the FULL stored-signals dataset (paginated fetch of all rows) from the existing /api/all-stored-signals route and caches it as context
- New /api/chat route calls an OpenAI-compatible LLM with the signal data as grounding context, reading the key from OPENAI_API_KEY (no hardcoded key)
- Graceful handling when the API key is missing or the data fetch fails
- Read-only chat — no database writes or data mutations
- All existing tabs, components, routes, styles, and schema untouched

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
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
