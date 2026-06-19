# Deployment Guide — Vercel + External Cron

LeadFlow is a **full-stack Next.js app** (UI + API + cron handlers). Deploy the entire app on **Vercel**. Use an **external scheduler** to call cron URLs every 5 minutes — required on Vercel **Hobby** (crons limited to once per day).

## Architecture

```
cron-job.org (or Render Cron)
    │  GET + Authorization: Bearer CRON_SECRET
    ▼
Vercel — your-app.vercel.app
    ├── /api/cron/send-emails    → sends queued emails via Gmail
    └── /api/cron/check-replies  → polls Gmail IMAP for replies
    │
    ├── Neon PostgreSQL (DATABASE_URL)
    ├── Upstash Redis (optional, rate limiting)
    └── Gmail + Gemini (per-user Settings or env)
```

---

## Step 1 — Database (Neon)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string
3. Run migrations from your machine:

```bash
# Set DATABASE_URL to your Neon URL, then:
npx prisma db push
npm run db:seed   # optional demo data
```

---

## Step 2 — Deploy to Vercel

1. Push this repo to GitHub
2. [vercel.com](https://vercel.com) → **Add New Project** → import repo
3. Framework: **Next.js** (auto-detected)
4. Add **Environment Variables** (Production + Preview):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | Same as `AUTH_SECRET` |
| `NEXTAUTH_URL` | `https://YOUR-APP.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` |
| `CRON_SECRET` | `openssl rand -base64 32` (save this!) |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `GEMINI_API_KEY` | Optional Google AI key |
| `GEMINI_MODEL` | `gemini-2.0-flash-lite` |
| `UPSTASH_REDIS_REST_URL` | Optional — leave empty to skip rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional |

5. **Deploy**

> **Important:** `vercel.json` does **not** define Vercel Cron schedules (Hobby blocks `*/5 * * * *`). Cron timing is handled by the external scheduler below.

---

## Step 3 — Verify cron endpoints

Replace `YOUR-APP` and `YOUR_CRON_SECRET`:

```bash
# Or use the npm script (reads .env):
npm run cron:test

# Manual curl:
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR-APP.vercel.app/api/cron/send-emails

curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR-APP.vercel.app/api/cron/check-replies
```

Expected: HTTP **200** with JSON like `{ "sent": 0, ... }` — not `401` or HTML.

---

## Step 4 — External cron (cron-job.org — recommended, free)

1. Sign up at [cron-job.org](https://cron-job.org)
2. **Create Cronjob** → **Advanced**

### Job 1: Send emails

| Field | Value |
|-------|--------|
| Title | LeadFlow Send Emails |
| URL | `https://YOUR-APP.vercel.app/api/cron/send-emails` |
| Schedule | Every 5 minutes |
| Request method | GET |
| Headers | `Authorization: Bearer YOUR_CRON_SECRET` |

### Job 2: Check replies

| Field | Value |
|-------|--------|
| Title | LeadFlow Check Replies |
| URL | `https://YOUR-APP.vercel.app/api/cron/check-replies` |
| Schedule | Every 5 minutes |
| Request method | GET |
| Headers | `Authorization: Bearer YOUR_CRON_SECRET` |

3. Enable both jobs
4. Check **Execution history** — should show 200 responses

### cron-job.org header setup

In the job editor → **Headers** tab → add:

- **Name:** `Authorization`
- **Value:** `Bearer <paste CRON_SECRET from Vercel>`

---

## Step 4 (alternative) — Render Cron Jobs

Use this if you prefer Render over cron-job.org. Render cron jobs are typically on a **paid** plan.

1. Render Dashboard → **Cron Jobs** → **New Cron Job**
2. Schedule: `*/5 * * * *`
3. Command:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR-APP.vercel.app/api/cron/send-emails"
```

4. Environment: add `CRON_SECRET` (same value as Vercel)
5. Create a second cron job for `/api/cron/check-replies`

---

## Step 5 — App configuration

1. Open `https://YOUR-APP.vercel.app`
2. Register or use seeded login (`demo@leadflow.app` / `demo123` if seeded)
3. **Settings** → add Gmail + App Password + Gemini key
4. Create and **Launch** a campaign
5. Within ~5 minutes, queued emails should send (if inside send window)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Vercel deploy warns about cron | Expected — we use external cron, not `vercel.json` schedules |
| Cron returns **401** | `CRON_SECRET` mismatch between Vercel and cron service |
| Cron returns **500** | Check Vercel Function logs; verify `DATABASE_URL` |
| Emails never send | Gmail in Settings; campaign **ACTIVE**; inside send window |
| Replies not detected | IMAP needs Gmail App Password; wait 5+ min after reply |
| Cron **timeout** | `check-replies` uses IMAP — may hit 10s limit on Hobby; try 10–15 min schedule or Vercel Pro |
| Login/session broken | `NEXTAUTH_URL` must match exact production URL |
| Rate limit errors | Add valid Upstash vars or leave them empty |

---

## Local development cron

Without external cron, trigger jobs manually:

```bash
npm run dev          # terminal 1
npm run cron:send    # terminal 2 — sends queued emails
npm run cron:replies # checks Gmail for replies
npm run cron:test    # runs both
```

---

## Security checklist

- [ ] `CRON_SECRET` is long and random — never in URLs or git
- [ ] `.env` is in `.gitignore`
- [ ] Rotate secrets if ever committed
- [ ] Production `NEXTAUTH_URL` uses `https://`

---

## Vercel Pro (optional)

If you upgrade to **Vercel Pro**, you can add crons back to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/send-emails", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/check-replies", "schedule": "*/5 * * * *" }
  ]
}
```

Then disable external cron jobs to avoid duplicate runs.
