# Bhasika AI Content Studio

Internal content intelligence platform for **BHASIKA** — *We explain. You decide.*

Bhasika is a digital student guidance platform for Nepali students looking at Germany's public
universities, studying abroad, and career questions. This studio is the tool the content team uses to
go from a raw idea to a finished, sourced video script:

1. Enter a raw idea, confusion or note.
2. Research it against the live internet, prioritising official sources.
3. Discover what people are actually asking online, with the original links intact.
4. Pick an audience problem worth answering.
5. Generate 3–5 second hooks that name the viewer's situation.
6. Generate the full script in Nepali or English at a chosen duration.
7. Edit it section by section, fact-check it, and keep every version.

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Demo mode vs live mode](#demo-mode-vs-live-mode)
- [Database](#database)
- [API integrations](#api-integrations)
- [Security](#security)
- [Architecture](#architecture)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Editorial rules built into the prompts](#editorial-rules-built-into-the-prompts)
- [Known limits](#known-limits)

---

## What it does

| Area | What is implemented |
| --- | --- |
| **Auth** | Server-side sign-in, bcrypt hashing, signed HttpOnly session cookie, edge-guarded routes, login throttling, password change, logout, session expiry |
| **Raw ideas** | Full brief capture — topic, language, duration (incl. custom), content type, audience, platform, tone — with auto-categorisation |
| **Research** | AI query planning → multi-query search → source classification (official / government / university / news / community / blog) → fact extraction with verification status → conflict detection |
| **Problem discovery** | Reddit (official OAuth API), YouTube Data API, Meta Graph API, plus web search; question detection, topic classification, relevance scoring, dedupe by source URL |
| **Problem analysis** | Confusion, situation, misconception, information needed, viewer takeaway, why it matters, content angles, related questions |
| **Hooks** | Five distinct styles (situation, pain-point, curiosity, direct question, myth-busting) with delivery-time estimates and a recommendation |
| **Scripts** | Hook / Problem / Solution / CTA, grounded in the selected sources, in natural Nepali or English at the target duration |
| **Editor** | Three-pane studio, per-section editing, 15 AI actions, review-before-apply for every rewrite, live duration meter, fact checking, copy, export, duplicate |
| **History** | Full-text search, six filters, rename, duplicate, archive, delete, version history with restore |
| **Learning** | Rule-based preference counting → recommended topics, favourite hook style, most-used duration, suggested CTA. Switchable and deletable |

---

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a Bhasika design system (pure black canvas, charcoal cards, one accent orange, no gradients)
- **Lucide** icons, hand-rolled shadcn-style component kit
- **Zod** for every request body
- **bcryptjs** + **jose** for auth
- **Postgres / Supabase** in production, a local JSON store in development
- Pluggable **AI**, **search** and **social** providers

---

## Quick start

```bash
git clone <this-repo>
cd Script_Generator
npm install

cp .env.example .env.local
# Generate your own signing secret and paste it into AUTH_SECRET:
openssl rand -base64 32

npm run dev
# http://localhost:3000
```

Sign in with the admin account from your `.env.local`. The template ships with
`admin@bhasika.com` and a bcrypt hash of the initial password that was provisioned for this build.

> **Change the initial password before anyone else uses this.** Sign in, open **Settings → Account &
> security**, and set a new one. Or generate a fresh hash and replace `BHASIKA_ADMIN_PASSWORD_HASH`:
>
> ```bash
> npm run hash-password
> ```
>
> The plaintext password is never stored, never logged, and never appears in this repository.

With no API keys the studio runs in **demo mode**: fully usable, with every generated item badged
*Sample data*.

---

## Environment variables

Everything lives in `.env.local` (git-ignored). `.env.example` is the template.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | no | Public base URL |
| `AUTH_SECRET` | **yes in production** | Signs the session cookie. `openssl rand -base64 32` |
| `AUTH_SESSION_TTL_HOURS` | no | Session lifetime, default `12` |
| `BHASIKA_ADMIN_EMAIL` | yes | Admin account email |
| `BHASIKA_ADMIN_PASSWORD_HASH` | yes | **bcrypt hash only** — never the plaintext |
| `BHASIKA_ADMIN_PASSWORD_HASH_B64` | no | Base64 of the hash, for hosting UIs where `$` escaping is awkward |
| `DATABASE_URL` | no | Postgres/Supabase. Without it, a local JSON store is used |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | no | Supabase project details |
| `AI_PROVIDER` | no | `openai` or `anthropic` |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | no | OpenAI or any OpenAI-compatible endpoint |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | no | Anthropic |
| `SEARCH_PROVIDER`, `SEARCH_API_KEY` | no | `tavily` (default), `serper`, or `exa` |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` | no | Reddit official API |
| `YOUTUBE_API_KEY` | no | YouTube Data API v3 |
| `FACEBOOK_ACCESS_TOKEN`, `INSTAGRAM_ACCESS_TOKEN` | no | Meta Graph API |
| `BHASIKA_DEMO_MODE` | no | Force demo mode even with keys present |

### One gotcha worth knowing

A bcrypt hash starts with `$2a$12$…`, and dotenv expands unescaped `$VAR` when the file loads —
which silently truncates the hash and makes every sign-in fail with "incorrect password". So **escape
each `$`**:

```dotenv
BHASIKA_ADMIN_PASSWORD_HASH=\$2a\$12\$FGfvCef9SyLA/Cxxb...
```

`npm run hash-password` prints the line already escaped, plus a base64 alternative. If the value is
still malformed the app logs a specific error at startup rather than failing sign-in mysteriously.

---

## Demo mode vs live mode

Demo mode is what you get with no AI key configured. It is a real, working local mode — not a
disabled UI:

- Every demo item is stored with `is_demo: true` and rendered with a **Sample data** badge.
- Sample research sources point at the **real homepage** of the organisation named (DAAD,
  study-in-germany.de, anabin, the embassy). Their excerpts are written as research notes and
  labelled as such — they are never presented as quotations from those pages.
- Sample audience problems link to a **live search URL** on the real platform, so every link resolves
  to something real. No post URLs are ever fabricated.
- The sidebar, topbar and Settings all state plainly that the studio is in demo mode.

Add keys and the same flows run against live providers. Nothing else changes.

---

## Database

### Local development

No setup. State goes to `data/store.json` (git-ignored). Writes are serialised so concurrent
requests cannot interleave.

### Production — Postgres or Supabase

```bash
export DATABASE_URL="postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres"
npm run db:migrate
```

Or apply `supabase/migrations/0001_init.sql` through the Supabase SQL editor.

The schema creates `users`, `user_preferences`, `ideas`, `research_sessions`, `research_sources`,
`audience_problems`, `scripts`, `script_versions`, `behavior_events`, `scheduled_syncs` and
`login_attempts`, with foreign keys, indexes, timestamps and row-level security enabled.

The app scopes every query by `user_id` in application code and connects with the service role; RLS
is there so that any other client (for example the anon key) cannot read another user's rows.

---

## API integrations

### AI provider

Either works; the studio picks OpenAI by default and falls back to whichever key is present.

- **OpenAI** — set `OPENAI_API_KEY`. `OPENAI_BASE_URL` lets you point at any OpenAI-compatible
  endpoint (Azure, a local model server, an internal gateway).
- **Anthropic** — set `ANTHROPIC_API_KEY` and `AI_PROVIDER=anthropic`.

Without a key: research still searches and stores sources, but facts are not extracted, and hooks and
scripts come from the labelled demo generator. AI editing and fact checking return a clear
"not configured" message rather than failing quietly.

### Search provider

Set `SEARCH_API_KEY` and optionally `SEARCH_PROVIDER`:

| Provider | Value | Where to get a key |
| --- | --- | --- |
| Tavily (default) | `tavily` | <https://tavily.com> |
| Serper (Google) | `serper` | <https://serper.dev> |
| Exa | `exa` | <https://exa.ai> |

Research runs several queries per idea, including one restricted to the priority domains (DAAD,
study-in-germany.de, uni-assist, anabin, Make it in Germany, the Federal Foreign Office, the embassy,
Hochschulkompass). If every query fails, the session is marked **error** with the provider's own
message — it never reports an empty-but-successful search.

### Reddit

1. Create an app at <https://www.reddit.com/prefs/apps> (type: **script**).
2. Set `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` and a descriptive `REDDIT_USER_AGENT`.

Uses the official OAuth application-only grant and reads public listings only.

### YouTube

Enable **YouTube Data API v3** in Google Cloud and set `YOUTUBE_API_KEY`. Public video search only.

### Facebook / Instagram

Set `FACEBOOK_ACCESS_TOKEN` / `INSTAGRAM_ACCESS_TOKEN` from a Meta app with the appropriate Page or
Business permissions.

**Be aware of what this can and cannot do.** Meta does not offer platform-wide public keyword search.
A Graph API token grants access to content you own or manage, so this provider reads the posts and
comments of the connected account. The Settings page says exactly that rather than implying
platform-wide monitoring.

### Scheduling

Settings offers manual / daily / every-6-hours / custom-cron. The preference is stored and shown, and
manual refresh works immediately. To run discovery on a schedule in production, call
`POST /api/problems/discover` from your platform's scheduler (Vercel Cron, GitHub Actions, a systemd
timer) with an authenticated session — the app does not run its own background worker.

---

## Security

- **No plaintext passwords** anywhere — in the database, the repository, or the logs. bcrypt, 12 rounds.
- **Server-side auth only.** There is no frontend password check to bypass.
- **Signed HttpOnly, SameSite=Lax cookies**, `Secure` in production, with a configurable TTL.
- **Two-layer route protection**: edge middleware verifies the signature on every dashboard page and
  API route; the server then re-resolves the account before doing any work.
- **Login throttling**: 5 attempts per email per 5 minutes, then a 15-minute lockout.
- **Password policy** on change: 10+ characters with upper, lower, digit and symbol. Changing the
  password invalidates the session.
- **Zod validation** on every request body; the Postgres driver validates every identifier against a
  column whitelist and binds every value as a parameter.
- **Safe error messages.** Provider errors (which are written to be user-facing) are surfaced;
  anything else returns a generic message and logs server-side without secrets.
- **No API keys in the browser.** Every key is read in server-only modules. `/api/status` reports
  whether a key is present, never its value.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`.

Rate limiting is in-process, which suits a single-instance internal tool. Behind several instances,
back `src/lib/auth/rate-limit.ts` with Redis or a Supabase table.

---

## Architecture

```
src/
├── app/
│   ├── (dashboard)/        # Protected pages: dashboard, ideas, problems, research, script, scripts, settings
│   ├── api/                # Route handlers (auth, ideas, research, problems, hooks, scripts, settings, status)
│   ├── login/ privacy/     # Public pages
│   └── layout.tsx  error.tsx  not-found.tsx
├── components/
│   ├── ui/                 # Button, Card, Input, Badge, Dialog, Toast, states
│   ├── layout/             # Sidebar, topbar, wordmark, navigation
│   └── ideas/ research/ problems/ scripts/ settings/
├── lib/
│   ├── ai/                 # AIProvider interface + OpenAI, Anthropic
│   ├── search/             # SearchProvider interface + Tavily, Serper, Exa
│   ├── social/             # SocialProvider interface + Reddit, YouTube, Meta
│   ├── research/           # Query planning, classification, fact extraction, problem discovery, demo data
│   ├── scripts/            # Prompts, duration engine, hooks, generation, editing, fact checking
│   ├── auth/               # Password, session, service, guards, rate limiting
│   ├── db/                 # Store interface + JSON and Postgres drivers, column whitelist
│   ├── learning/           # Rule-based preference tracking
│   └── types.ts  validation.ts  data.ts  api.ts  env.ts
├── middleware.ts           # Edge auth gate
supabase/migrations/        # SQL schema
scripts/                    # hash-password, migrate
```

Every provider sits behind an interface, so swapping one is a single line in its `index.ts` factory.
Nothing in the app hardcodes a specific vendor.

### Duration model

Estimates use words-per-second tuned for calm narration: **2.1 wps Nepali**, **2.5 wps English** —
Devanagari words carry more syllables on average. The editor shows estimated vs target with a
tolerance band, and the generator is given a word budget rather than being asked to guess.

---

## API reference

All routes require a session. Errors return `{ error, code }`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Sign in (throttled) |
| `POST` | `/api/auth/logout` | Clear the session |
| `POST` | `/api/auth/change-password` | Change password, then re-authenticate |
| `GET POST` | `/api/ideas` | List / create ideas |
| `GET POST` | `/api/research` | List sessions / run a research pass |
| `GET` | `/api/problems` | List problems with filters |
| `POST` | `/api/problems/discover` | Run a discovery sweep |
| `GET PATCH DELETE` | `/api/problems/[id]` | Read / update status / delete |
| `POST` | `/api/problems/[id]/analyze` | Deep problem analysis |
| `POST` | `/api/hooks` | Generate five hook options |
| `GET POST` | `/api/scripts` | List / generate scripts |
| `GET PATCH DELETE` | `/api/scripts/[id]` | Read / update (snapshots a version) / delete |
| `POST` | `/api/scripts/[id]/refine` | Section or whole-script rewrite — returns a proposal, saves nothing |
| `POST` | `/api/scripts/[id]/fact-check` | Check claims against the attached sources |
| `POST` | `/api/scripts/[id]/duplicate` | Duplicate |
| `GET` | `/api/scripts/[id]/versions` | Version list |
| `POST` | `/api/scripts/[id]/versions/[versionId]/restore` | Restore, keeping history |
| `GET` | `/api/scripts/[id]/export?format=txt\|json` | Export |
| `GET PATCH` | `/api/settings/preferences` | Studio defaults |
| `GET DELETE` | `/api/settings/learning` | Insights / delete learning history |
| `GET` | `/api/status` | Integration status (never key values) |
| `GET` | `/api/health` | Health check (public) |

---

## Deployment

### Vercel

1. Import the repository.
2. Add every environment variable from `.env.example` in **Project → Settings → Environment
   Variables**. For the password hash, either escape each `$` or use
   `BHASIKA_ADMIN_PASSWORD_HASH_B64`.
3. Set `DATABASE_URL` to your Supabase connection string and run `npm run db:migrate` locally against
   it once.
4. Deploy. Routes are dynamic; nothing user-specific is cached.

### Docker / self-hosted

```bash
npm ci
npm run build
npm start          # listens on $PORT, default 3000
```

Put it behind TLS — the session cookie is marked `Secure` in production and will not be sent over
plain HTTP.

### Checklist before the team uses it

- [ ] `AUTH_SECRET` is freshly generated, not the template value
- [ ] The admin password has been changed from the initial one
- [ ] `DATABASE_URL` points at Postgres, and the migration has been applied
- [ ] HTTPS is terminated in front of the app
- [ ] `.env.local` is not committed (it is git-ignored)

---

## Editorial rules built into the prompts

These are enforced in `src/lib/scripts/prompts.ts` on every generation, not left to chance:

- Never invent facts, deadlines, fees, university requirements, visa rules or earnings.
- Use only the attached research. Where it is silent, say what to verify and name the official source.
- Never claim every German public university is tuition-free.
- Never present a Reddit or forum comment as an official rule — attribute it as what people report.
- No manipulative or unsupported fear-based claims.
- No generic openers: "Today we are going to talk about Germany", "Hello everyone, welcome back",
  "Do you want to study abroad?" are banned by name.
- Explain, do not instruct. The viewer decides.
- Nepali output is natural spoken Nepali in Devanagari, keeping IELTS, ECTS, Germany, Visa, HiWi,
  Master, Bachelor, APS and Uni-Assist in Latin script — not a word-for-word translation.

Fact checking classifies each claim as verified by source, needs verification, conflicting sources,
opinion, or not enough information, and says so plainly when it cannot verify something.

---

## Known limits

Stated plainly rather than papered over:

- **No background worker.** Scheduled discovery needs an external scheduler (see
  [Scheduling](#scheduling)).
- **Meta sources are account-scoped**, not platform-wide — Meta does not expose public keyword search.
- **Rate limiting is per-process**; use Redis behind multiple instances.
- **The JSON store is for development.** Use Postgres for anything shared or persistent.
- **Single-team design.** Every row is scoped by `user_id` and the schema supports more accounts, but
  there is no invite or user-management UI yet — provision additional users directly in the database.
- **Fact checking is an assistant, not an approver.** It checks the script against the attached
  sources only. A human still reads anything about fees, deadlines or visa rules before it ships.

---

*Bhasika — We explain. You decide.*
