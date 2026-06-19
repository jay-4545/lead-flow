# LeadFlow — AI Lead Outreach Platform

LeadFlow is a full-stack B2B outreach automation platform built with Next.js 16, Prisma, PostgreSQL, and Google Gemini AI.

## Features

- **Lead management** — CRUD, CSV import, search, filters, tags
- **AI enrichment** — Gemini-powered company research and ICP scoring
- **Multi-step campaigns** — Email sequences with delays and merge tags
- **Gmail integration** — Send via SMTP, IMAP reply detection
- **Tracking** — Open pixels, click tracking, unsubscribe links
- **Dashboard** — Stats, charts, recent activity
- **Security** — Rate limiting, CORS, encrypted secrets, security headers

## Tech Stack

- Next.js 16 (App Router) + React 19
- PostgreSQL + Prisma 7
- NextAuth v5 (credentials)
- TanStack Query, shadcn/ui, Tailwind CSS 4
- Vercel Cron + Upstash Redis

## Quick Start

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Generate secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET, CRON_SECRET, ENCRYPTION_KEY
```

### 3. Database setup

```bash
npx prisma db push
npm run db:seed
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo credentials** (after seeding): `demo@leadflow.app` / `demo123`

### 5. Configure integrations

In **Settings**:
- Add Gmail address + App Password ([Google App Passwords](https://myaccount.google.com/apppasswords))
- Add Gemini API key (or set `GEMINI_API_KEY` in env)

## Vercel Deployment

1. Push to GitHub and import to Vercel
2. Add a PostgreSQL database (Neon or Supabase)
3. Set all env vars from `.env.example` in Vercel dashboard
4. Create free [Upstash Redis](https://upstash.com) for rate limiting
5. Deploy — cron jobs run every 5 minutes via `vercel.json`

### Required Vercel env vars

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session signing key |
| `NEXTAUTH_URL` | Production URL |
| `NEXT_PUBLIC_APP_URL` | Same as production URL |
| `CRON_SECRET` | Bearer token for cron routes |
| `ENCRYPTION_KEY` | 32-byte base64 key for secrets |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `GEMINI_API_KEY` | Optional AI fallback |

> **Note:** Vercel Hobby plan may limit cron frequency. Use an external cron service (e.g. cron-job.org) hitting `/api/cron/send-emails` and `/api/cron/check-replies` with `Authorization: Bearer $CRON_SECRET` if needed.

## Security

- API rate limiting via Upstash Redis
- CORS policy (same-origin by default)
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- AES-256-GCM encryption for Gmail/Gemini keys at rest
- Timing-safe cron authentication
- Open redirect protection on click tracking
- Lead ownership validation on campaign create

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Demo Walkthrough

See [DEMO.md](./DEMO.md) for a scripted client demo flow.

## License

Private — for portfolio and client demos.
