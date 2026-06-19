# LeadFlow — Client Demo Script

Use this 10-minute walkthrough for Upwork client demos.

## Before the demo

1. Deploy to Vercel with all env vars set
2. Run `npm run db:seed` or register a fresh account
3. Configure Gmail + Gemini in Settings
4. Import `public/sample-leads.csv` or use seeded data

**Demo login:** `demo@leadflow.app` / `demo123`

---

## Demo flow (10 min)

### 1. Dashboard (1 min)

- Show total leads, active campaigns, emails sent, open rate
- Point out charts: emails sent vs opened, lead status breakdown
- Highlight recent activity feed

### 2. Leads (2 min)

- Open **Leads** → show list with search and status filter
- Click a lead → show detail form, AI enrichment panel
- Click **Enrich This Lead** → show company description, pain points, ICP score
- Mention tags, LinkedIn, location fields

### 3. Import leads (1 min)

- Click **Import** → upload `sample-leads.csv`
- Show duplicate handling (same email skipped)

### 4. Create campaign (3 min)

- **Campaigns** → **New Campaign**
- Step 1: Name, description, send window, timezone
- Step 2: Email sequence with merge tags (`{{firstName}}`, `{{company}}`)
- Use **Generate with AI** for one step
- Step 3: Select enriched leads → **Create Campaign**

### 5. Launch & track (2 min)

- Open campaign detail → **Launch**
- Explain: emails queue, cron sends every 5 min within send window
- Show stats: sent, open rate, click rate, reply rate
- Tabs: Leads progress, Sequence, Settings

### 6. Security & compliance (1 min)

- Unsubscribe link in every email
- Rate limiting on API and auth
- Encrypted Gmail/Gemini credentials
- Sign-out confirmation modal

---

## Talking points for clients

- "Merge tags personalize each email automatically"
- "Send windows respect business hours in any timezone"
- "Reply detection via IMAP cancels follow-up emails"
- "Production-ready security: rate limits, CORS, encrypted secrets"
- "Built on modern stack: Next.js, PostgreSQL, Vercel"

## Troubleshooting live demo

| Issue | Fix |
|-------|-----|
| Emails not sending | Check Gmail app password in Settings; verify cron is running |
| AI enrichment fails | Add Gemini key in Settings or env |
| Rate limit error | Upstash Redis env vars missing |
| Tracking links broken | Set `NEXT_PUBLIC_APP_URL` to production URL |
