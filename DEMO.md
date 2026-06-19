# LeadFlow — Client Demo Script

Use this 10-minute walkthrough for Upwork client demos.

## Before the demo

1. Deploy to Vercel — follow [DEPLOY.md](./DEPLOY.md)
2. Set up **cron-job.org** (2 jobs, every 5 min) — see DEPLOY.md Step 4
3. Run `npm run db:seed` against production DB or register a fresh account
4. Configure Gmail + Gemini in Settings
5. Import `public/sample-leads.csv` or use seeded data
6. Verify cron: `npm run cron:test` with `APP_URL=https://your-app.vercel.app`

**Demo login:** `demo@leadflow.app` / `demo123`

### Pre-demo checklist

- [ ] App loads at production HTTPS URL
- [ ] Login works (`NEXTAUTH_URL` matches URL)
- [ ] cron-job.org shows **200** for both jobs
- [ ] Gmail + Gemini configured in Settings
- [ ] At least one enriched lead exists

---

## Demo flow (10 min)

### 1. Dashboard (1 min)

- Show total leads, active campaigns, emails sent, open rate
- Point out charts: emails sent vs opened, lead status breakdown
- Highlight recent activity feed

### 2. Leads (2 min)

- Open **Leads** → show list with search and status filter
- Click a lead → show detail form, AI enrichment panel, **Conversation** thread
- Click **Enrich This Lead** → show company description, pain points, ICP score
- Mention tags, LinkedIn, location fields

### 3. Import leads (1 min)

- Click **Import** → upload `sample-leads.csv`
- Show duplicate handling (same email skipped)

### 4. Create campaign (3 min)

- **Campaigns** → **New Campaign**
- Step 1: Name, description, send window, timezone, **Reply handling** (Auto / Review / Stop)
- Step 2: Email sequence with merge tags (`{{firstName}}`, `{{company}}`)
- Use **Generate with AI** for one step
- Step 3: Select enriched leads → **Create Campaign**

### 5. Launch & track (2 min)

- Open campaign detail → **Launch**
- Explain: emails queue; **cron-job.org** triggers send every 5 min within send window
- Show stats: sent, open rate, click rate, reply rate
- Tabs: Leads progress, Sequence, Settings
- **Replies** page for AI draft review (if campaign uses Review mode)

### 6. Security & compliance (1 min)

- Unsubscribe link in every email
- Rate limiting on API and auth
- Encrypted Gmail/Gemini credentials
- Sign-out confirmation modal

---

## Talking points for clients

- "Merge tags personalize each email automatically"
- "Send windows respect business hours in any timezone"
- "Reply detection via IMAP — AI can auto-respond or draft for your review"
- "Production-ready security: rate limits, CORS, encrypted secrets"
- "Hosted on Vercel with external cron — no Pro plan required for scheduling"

## Troubleshooting live demo

| Issue | Fix |
|-------|-----|
| Emails not sending | Gmail app password in Settings; cron-job.org running; campaign ACTIVE |
| Cron 401 | `CRON_SECRET` must match Vercel + cron-job.org header |
| AI enrichment fails | Add Gemini key in Settings or env |
| Rate limit error | Add Upstash vars or leave empty to disable |
| Tracking links broken | Set `NEXT_PUBLIC_APP_URL` to production URL |
| Replies not showing | Wait 5+ min; check cron-job.org history for check-replies |

See [DEPLOY.md](./DEPLOY.md) for full deployment troubleshooting.
