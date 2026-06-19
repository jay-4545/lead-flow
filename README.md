# LeadFlow — AI Lead Outreach Platform

LeadFlow is a full-stack B2B outreach automation platform built with Next.js 16, Prisma, PostgreSQL, and Google Gemini AI.

## Features

- **Lead management** — CRUD, CSV import, search, filters, tags
- **AI enrichment** — Gemini-powered company research and ICP scoring
- **Multi-step campaigns** — Email sequences with delays and merge tags
- **Smart reply handling** — IMAP detection + AI auto-reply or draft review
- **Gmail integration** — Send via SMTP, IMAP reply detection
- **Tracking** — Open pixels, click tracking, unsubscribe links
- **Dashboard** — Stats, charts, recent activity
- **Security** — Rate limiting, CORS, encrypted secrets, security headers

## Tech Stack

- Next.js 16 (App Router) + React 19
- PostgreSQL + Prisma 7
- NextAuth v5 (credentials)
- TanStack Query, shadcn/ui, Tailwind CSS 4
- Vercel (hosting) + external cron (cron-job.org) + optional Upstash Redis

## Quick Start

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

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

### 6. Trigger cron locally (no external scheduler needed)

```bash
npm run cron:send      # send queued emails
npm run cron:replies   # check Gmail for replies
npm run cron:test      # run both
```

## Production Deployment

**Full guide:** [DEPLOY.md](./DEPLOY.md)

### Summary (Vercel Hobby + free cron)

1. Deploy full app to **Vercel**
2. Use **Neon** for PostgreSQL
3. Set env vars (see `.env.example`)
4. Schedule **cron-job.org** (free) to hit every 5 minutes:
   - `GET /api/cron/send-emails`
   - `GET /api/cron/check-replies`
   - Header: `Authorization: Bearer $CRON_SECRET`

> Vercel Hobby only allows cron **once per day** — do **not** use `vercel.json` crons. External scheduling is required.

### Required production env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Session signing key |
| `NEXTAUTH_SECRET` | Yes | Same as `AUTH_SECRET` |
| `NEXTAUTH_URL` | Yes | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as production URL |
| `CRON_SECRET` | Yes | Bearer token for cron routes |
| `ENCRYPTION_KEY` | Yes | 32-byte base64 key for secrets |
| `GEMINI_API_KEY` | No | AI fallback |
| `UPSTASH_REDIS_*` | No | Rate limiting (skip if empty) |

## Security

- API rate limiting via Upstash Redis (optional)
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
| `npm run cron:send` | Trigger send-emails cron |
| `npm run cron:replies` | Trigger check-replies cron |
| `npm run cron:test` | Trigger both cron jobs |

## Demo Walkthrough

See [DEMO.md](./DEMO.md) for a scripted client demo flow.

## License

Private — for portfolio and client demos.
