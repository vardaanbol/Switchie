# Job Finder Agent

AI-powered job discovery for India: daily digests, match scores, and public referral contacts. Salaries in INR (₹).

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Auth.js (Google OAuth)
- MongoDB + Mongoose
- Gemini (`@google/genai`) with Google Search grounding
- Adzuna job API
- Resend + React Email
- Vercel Cron + Vercel Blob

## Setup

1. Copy env file and fill values:

```bash
cp .env.example .env.local
```

2. Install & run:

```bash
npm install
npm run dev
```

3. Google OAuth: create credentials and set authorized redirect URI to  
   `http://localhost:3000/api/auth/callback/google`

4. Manual cron test (after deploy or locally with secret):

```bash
curl -X POST http://localhost:3000/api/cron/daily-digest \
  -H "Authorization: Bearer $CRON_SECRET"
```

Cron schedule in `vercel.json`: `30 0 * * *` UTC (= 6:00 AM IST).

The morning cron **always refreshes the job feed** for every user with a
complete profile. Email digests stay off unless `DIGEST_EMAILS_ENABLED=true`.

### Email digests (Resend) — optional / B-phase

1. Set `DIGEST_EMAILS_ENABLED=true` on Vercel
2. Add + verify a domain at [resend.com/domains](https://resend.com/domains)
3. Set `RESEND_FROM_EMAIL` to an address on that domain, e.g. `Y.A.W.N <digest@yourdomain.com>`
4. Redeploy, then optionally re-run:

```bash
curl -X GET https://YOUR_HOST/api/cron/daily-digest \
  -H "Authorization: Bearer $CRON_SECRET"
```

Check outcomes in MongoDB `digestlogs` (`emailStatus`: `sent` / `failed` / `skipped`).

## Main routes

| Path | Purpose |
|---|---|
| `/` | Sign in |
| `/onboarding` | First-time profile |
| `/dashboard` | Jobs + refresh |
| `/settings` | Edit profile |
| `POST /api/jobs/refresh` | On-demand agent (1/hour) |
| `POST /api/cron/daily-digest` | Daily agent + email |
