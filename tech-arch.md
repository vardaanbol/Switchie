# Y.A.W.N — Technical Architecture

> **Y.A.W.N** ("Yearning Applications While Napping") is an AI-powered job-discovery agent for the Indian market. Users sign in with Google, set up a profile (target roles, salary range in ₹, work mode, locations, resume), and an autonomous agent finds live job postings, scores them 0–100, and surfaces referral contacts — all presented in a comic-book-styled dashboard.

---

## 1. Stack Overview

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Styling / UI | Tailwind CSS v4, shadcn/ui, Base UI, `lucide-react`, `sonner` (toasts), GSAP (landing animation) |
| Auth | Auth.js (NextAuth v5 beta) — Google OAuth, JWT sessions |
| Database | MongoDB via Mongoose 9 (cached global connection) |
| AI | Google Gemini (`@google/genai`) with Google Search grounding |
| Job sources | Adzuna API + Gemini grounded search |
| Files | Vercel Blob (resume storage), `pdf-parse` / `mammoth` (text extraction), `pdf-lib` (ATS PDF generation) |
| Email | Resend + React Email |
| Validation | Zod (`src/lib/validators/profile.ts`) |
| Deployment | Vercel (serverless + cron) |

**State management:** intentionally minimal — React `useState` / `useTransition` / `useMemo`, `sessionStorage` for UI trivia, native `fetch` against internal API routes. No Redux/Zustand/React Query.

---

## 2. Directory Layout

```
src/
  auth.ts                     # NextAuth config: Google provider, JWT strategy, user upsert on sign-in
  proxy.ts                    # Middleware: protects /dashboard, /settings, /onboarding
  app/
    layout.tsx                # Root layout (Geist fonts, SessionProvider, Toaster)
    page.tsx                  # Landing + Google sign-in (server action)
    onboarding/               # First-time profile setup
    dashboard/                # Main app: feed, saved, applied, shared, calendar
      day/[date]/             # Calendar day view of past suggestions
    settings/                 # Profile editing + resume upload
    creator/                  # About-the-creator page
    api/                      # REST-ish API routes (section 4)
  components/
    ui/                       # shadcn primitives + landing hero/features + crowd-canvas (GSAP peeps)
    jobs/                     # jobs-carousel, share-job-modal, shared-yawns-list, refresh-step-loader
    layout/                   # app-header, landing-footer
    profile/, auth/, feedback/, providers/, brand/
  lib/
    agent/                    # AI agent core (section 5)
    jobs/                     # dashboard-job mapping, experience filter, employer resolution, URL verification
    resume/                   # text extraction, ATS PDF builder, LaTeX template, fingerprinting
    email/send-digest.ts
    db/mongodb.ts             # Cached Mongoose connection
    validators/, auth-helpers.ts, profile.ts, blob.ts, utils.ts
  models/                     # Mongoose schemas (section 6)
  emails/daily-digest.tsx     # React Email template
```

Path alias: `@/*` → `src/*`.

---

## 3. Authentication & Route Protection

- **`src/auth.ts`** — NextAuth v5 with a single Google provider and **JWT sessions** (no DB sessions, despite `@auth/mongodb-adapter` being installed). On sign-in, a `User` document is upserted by `googleId`. JWT and session callbacks attach `userId` and `profileComplete` so the middleware can route without a DB hit.
- **`src/proxy.ts`** (middleware) — guards `/dashboard`, `/settings`, `/onboarding`:
  - unauthenticated → redirect to `/` with `callbackUrl`
  - authenticated but incomplete profile → redirect to `/onboarding`
- **`src/lib/auth-helpers.ts`** — `requireUser()` enforces auth in every API route except the cron endpoint (bearer secret) and the NextAuth handler.

---

## 4. API Surface (`src/app/api/`)

| Route | Method | Purpose |
|---|---|---|
| `auth/[...nextauth]` | GET/POST | NextAuth handlers (Google OAuth) |
| `jobs` | GET | List user's jobs with filters (status, work mode, location, salary); applies experience filter and employer-name repair |
| `jobs/refresh` | POST | On-demand agent run. Rate-limited to **1/hour** per user (`RefreshRateLimit`, bypassed in dev). Referral lookup deferred via `after()`. `maxDuration = 300` |
| `jobs/[id]` | PATCH | Update job status (`saved` / `applied` / `dismissed`), stamps `savedAt` / `appliedAt` |
| `jobs/[id]/referrals` | POST | Find LinkedIn referral contacts (grounded Gemini + live URL probing) |
| `jobs/[id]/resume-match` | POST | Score user's resume against the JD (Gemini) |
| `jobs/[id]/enhance-resume` | POST | Generate a JD-tailored ATS resume (Gemini) |
| `jobs/[id]/enhanced-resume-pdf` | GET | Render the enhanced resume as a downloadable PDF (`pdf-lib`) |
| `jobs/[id]/share` | POST | Share a job snapshot with another user (`SharedYawn`) |
| `shared-yawns`, `shared-yawns/[id]` | GET / PATCH | List and update received shares |
| `resume/upload` | POST | Upload PDF/DOCX (≤5 MB) → Vercel Blob; extract text; Gemini extracts skills + experience. `runtime = "nodejs"` |
| `profile` | PUT/PATCH | Save profile (Zod-validated) |
| `feedback` | POST | Store user feedback |
| `locations/search` | GET | City autocomplete via Photon (komoot), bounding-boxed to India |
| `users/search` | GET | User lookup for sharing |
| `cron/daily-digest` | GET/POST | `CRON_SECRET`-protected. Refreshes every complete profile's feed; sends Resend digest email only when `DIGEST_EMAILS_ENABLED=true`. `maxDuration = 300` |

**External services:** Google OAuth, MongoDB, Google Gemini (with Google Search grounding), Adzuna, Photon/Komoot geocoding, Resend, Vercel Blob, and live LinkedIn HTTP probing.

---

## 5. The Agent Pipeline (`src/lib/agent/`)

Entry point: `runJobSearchAgent(userId)` in `run-job-search-agent.ts`. Triggered by the dashboard Refresh button (`POST /api/jobs/refresh`) or the daily cron.

```
Load User profile (Mongo)
        │
        ├──────────────── parallel ────────────────┐
        ▼                                          ▼
  adzuna.ts                          search-jobs-via-grounding.ts
  Adzuna API: up to 3 roles ×        Gemini + Google Search grounding
  2 locations × 2 pages,             (≤8 verified real listings)
  ≤7 days old, interleaved
        │                                          │
        └───────────────► merge ◄──────────────────┘
                            │
              dedupe.ts: dedupe by title+company+location,
              cap 2 listings per company
                            │
              drop URLs already in DB
                            │
              verify-job-url.ts: HTTP-probe up to 24 URLs,
              drop 404s / "role closed" / careers-index pages
                            │
              enrich-listing.ts (Gemini, max 8, concurrency 6):
              clean description, resolve real employer vs.
              staffing agency, pros/cons, INR salary estimate,
              matchScore 0–100, requiredExperienceYears
                            │
              experience filter: drop roles > ±2 years
              from resume experience
                            │
              sort by matchScore → insertMany into JobListing
              (unique index on userId + sourceUrl)
                            │
              after HTTP response (next/after or cron):
              fillReferralsForJobs → find-referral-contacts.ts
```

### Design notes

- **Anti-hallucination:** the referral finder never trusts model-invented LinkedIn handles. It only keeps `/in/` URLs that literally appear in grounding results **and** pass a live HTTP probe, then verifies current employment. One grounded search per company is reused across that company's roles.
- **Centralized LLM access:** `gemini.ts` exposes `generateJson` / `generateGroundedJson` with JSON cleanup, a model fallback chain (`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-flash-latest`), retry with backoff on 429/503/504, and per-call cost logging (`cost-log.ts`).
- **Employer resolution** (`src/lib/jobs/resolve-employer.ts`): heuristics replace staffing-agency poster names with the real client extracted from JD phrasing ("hiring for X", "on behalf of X", "our client X").
- **Fingerprint caching:** resume-derived AI outputs (skills extraction, resume match, enhanced resume) are keyed by a resume fingerprint and reused until the resume actually changes.

---

## 6. Data Model (`src/models/`)

| Model | Purpose | Notable fields / indexes |
|---|---|---|
| `User` | Profile | salary range, work mode, locations, target roles, resume URL/text/fingerprint, parsed skills, experience (months/years/roles), `emailDigestEnabled` |
| `JobListing` | A discovered job for a user | enrich fields (matchScore, pros/cons, salary), resume-match fields, enhanced-resume fields; **unique `{userId, sourceUrl}`**; indexes on `matchScore`, `foundAt`, `status` |
| `SharedYawn` | Snapshotted job shared between users | unique `{toUserId, fromUserId, sourceUrl}` |
| `RefreshRateLimit` | 1-hour refresh gate per user | bypassed when `NODE_ENV=development` |
| `DigestLog` | Email send audit | `emailStatus`: pending / sent / failed / skipped |
| `Feedback` | User feedback | — |

Connection management: `src/lib/db/mongodb.ts` caches the Mongoose connection on `global` (survives serverless warm invocations), `bufferCommands: false`.

---

## 7. Frontend Architecture

- **`dashboard/page.tsx`** (server component) loads jobs and renders **`DashboardClient`** — the tab shell (Feed / Saved / Applied / Shared Yawns / Calendar) with a Refresh button that POSTs `/api/jobs/refresh`, shows an animated multi-step loader (`refresh-step-loader.tsx`), then re-fetches `/api/jobs`.
- **`jobs-carousel.tsx`** (~1,160 lines) is the heart of the UI: a one-card-at-a-time carousel. Each card lazily triggers resume-match scoring and referral fetching on expand, and offers Save / Applied / Share / Pass actions plus an enhanced-resume modal (PDF / Markdown / LaTeX download, regenerate).
- **`crowd-canvas.tsx`** slices the `public/images/peeps/all-peeps.png` sprite sheet (15×7 grid) and uses GSAP to animate a walking crowd across the landing hero.
- **Comic design system** lives in `globals.css`: halftone dot overlays, paper texture, thick black borders, hard offset shadows (`shadow-[Npx_Npx_0_#000]`).

---

## 8. Deployment & Ops

- **Platform:** Vercel serverless. No Docker.
- **Cron:** `vercel.json` schedules `POST /api/cron/daily-digest` at `30 0 * * *` UTC (6:00 AM IST). The cron always refreshes feeds; emails are opt-in via `DIGEST_EMAILS_ENABLED`.
- **`next.config.ts`:** `serverExternalPackages: ["mongoose", "pdf-parse", "@napi-rs/canvas", "mammoth"]` — native/heavy deps stay external to the bundle.
- **Long-running AI routes** set `maxDuration = 300`.

### Environment variables

| Variable | Used for |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `AUTH_SECRET` (or `NEXTAUTH_SECRET`) / `AUTH_URL` (or `NEXTAUTH_URL`) | Auth.js |
| `MONGODB_URI` | MongoDB |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini (model optional; fallback chain built in) |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna job API |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (resume storage) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Digest emails |
| `CRON_SECRET` | Protects the cron endpoint |
| `DIGEST_EMAILS_ENABLED` | Opt-in flag for digest emails |
