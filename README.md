# 💤 Y.A.W.N

### *Yearning Applications While Napping*

> **ISSUE #001** · A comic-book job agent for India · Salaries in ₹, naps in unlimited supply

**We fetch. You Y.A.W.N.**

---

## 📖 The Origin Story

Somewhere out there, a hero was refreshing job boards at 2 AM, copy-pasting the same resume into the same portals, whispering *"is this role even still open?"* into the void.

**Y.A.W.N** was built so that hero could go back to bed.

Sign in with Google. Tell it what you want (roles, ₹ range, remote/hybrid/on-site, cities). Upload your resume. Then nap. While you're out cold, an AI agent hunts live job postings across India, throws out the dead links, ranks everything 0–100 against *your* resume, and even finds real humans at those companies who could refer you. You wake up, sip chai, and flip through your fresh stack of **yawns**.

## 💥 Superpowers

| 🦸 Power | What it actually does |
|---|---|
| 🕵️ **Auto Job Hunt** | Scours Adzuna + Google-grounded search for roles matching your skills, salary, and work mode. Dead links get probed and yeeted. |
| 🎯 **Match Scoring** | Every listing ranked 0–100 against your resume. No more "am I even qualified?" spirals. |
| 📄 **ATS Resume Upgrade** | Scores your resume vs. the job description, then generates a tailored, ATS-ready PDF. *KAPOW.* |
| 🤝 **Referral Cameos** | Surfaces real, verified employees at the target company on LinkedIn. No hallucinated humans — every profile is live-probed before it reaches you. |
| 📬 **Shared Yawns** | Spot a role that screams "your friend"? Fling it their way with a note. |
| 📅 **Yawn Calendar** | Time-travel to any past day and see what the agent dug up while you slept. |
| ☀️ **Morning Digest** | A daily 6 AM IST email of your top matches. *(Sticker on the box says: Under testing · not for users yet.)* |

## 🧪 The Lab (Stack)

- **Next.js 16** (App Router) + **React 19** + TypeScript
- **Tailwind v4** + shadcn/ui + GSAP (yes, those little peeps walking across the landing page are a sprite sheet)
- **Auth.js** (Google OAuth) · **MongoDB** + Mongoose
- **Gemini** (`@google/genai`) with Google Search grounding — the brain of the agent
- **Adzuna API** — the job firehose
- **Resend** + React Email · **Vercel** Blob, Cron & serverless

Want the full blueprints, agent pipeline diagram, and data model? The serious-face doc lives at **[`tech-arch.md`](./tech-arch.md)**.

## 🚀 Power Up (Setup)

**Step 1 — Clone the secret formula:**

```bash
cp .env.example .env.local   # then fill in the values
```

**Step 2 — Assemble:**

```bash
npm install
npm run dev
```

**Step 3 — Google OAuth:** create credentials in Google Cloud Console and set the authorized redirect URI to:

```
http://localhost:3000/api/auth/callback/google
```

**Step 4 — Poke the cron manually** (after deploy, or locally with the secret):

```bash
curl -X POST http://localhost:3000/api/cron/daily-digest \
  -H "Authorization: Bearer $CRON_SECRET"
```

The real cron fires at `30 0 * * *` UTC (= **6:00 AM IST**, per `vercel.json`) and **always refreshes the job feed** for every user with a complete profile. Emails stay off unless you flip the switch below.

### ✉️ Email Digests (optional side quest)

1. Set `DIGEST_EMAILS_ENABLED=true` on Vercel
2. Add + verify a domain at [resend.com/domains](https://resend.com/domains)
3. Set `RESEND_FROM_EMAIL` to an address on that domain, e.g. `Y.A.W.N <digest@yourdomain.com>`
4. Redeploy, then optionally re-run the curl above

Check outcomes in MongoDB `digestlogs` (`emailStatus`: `sent` / `failed` / `skipped`).

## 🗺️ The Map (Main Routes)

| Panel | What happens here |
|---|---|
| `/` | The cover page — sign in while the peeps parade by |
| `/onboarding` | Roll your character (roles, ₹, locations, resume) |
| `/dashboard` | Your daily stack of yawns — flip, save, apply, share, pass |
| `/settings` | Retcon your profile |
| `/creator` | The creator's issue |
| `POST /api/jobs/refresh` | Summon the agent on demand (once per hour — heroes need cooldowns) |
| `POST /api/cron/daily-digest` | The overnight patrol + optional email |

---

<p align="center"><em>Roles, matches, and resumes land while you nap.</em> 😴💼</p>
