#!/usr/bin/env node
/**
 * Trigger cron endpoints locally or against production.
 *
 * Usage:
 *   node scripts/trigger-cron.mjs send-emails
 *   node scripts/trigger-cron.mjs check-replies
 *   node scripts/trigger-cron.mjs all
 *
 * Env: CRON_SECRET (required), APP_URL or NEXT_PUBLIC_APP_URL (default http://localhost:3000)
 */

import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env") })

const job = process.argv[2]
const baseUrl = (
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"
).replace(/\/$/, "")
const secret = process.env.CRON_SECRET

const jobs = {
  "send-emails": "/api/cron/send-emails",
  "check-replies": "/api/cron/check-replies",
}

if (!secret) {
  console.error("Error: CRON_SECRET is not set in .env")
  process.exit(1)
}

if (!job || (job !== "all" && !jobs[job])) {
  console.error("Usage: node scripts/trigger-cron.mjs <send-emails|check-replies|all>")
  process.exit(1)
}

const targets = job === "all" ? Object.entries(jobs) : [[job, jobs[job]]]

async function run(name, path) {
  const url = `${baseUrl}${path}`
  console.log(`→ ${name}: ${url}`)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  })

  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 200)
  }

  if (!res.ok) {
    console.error(`  ✗ ${res.status}`, body)
    return false
  }

  console.log(`  ✓ ${res.status}`, body)
  return true
}

let ok = true
for (const [name, path] of targets) {
  const success = await run(name, path)
  if (!success) ok = false
}

process.exit(ok ? 0 : 1)
