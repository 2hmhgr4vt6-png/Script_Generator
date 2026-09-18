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
- [Access and exposure](#access-and-exposure)
- [Running it for free](#running-it-for-free)
- [API keys](#api-keys)
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
| **Access** | No sign-in. Open the URL and start working — see [Access and exposure](#access-and-exposure) |
| **API keys** | Added in Settings, encrypted at rest, verified with a real call per provider — see [API keys](#api-keys) |
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
- **Postgres / Supabase** in production, a local JSON store in development
- Pluggable **AI**, **search** and **social** providers

---

## Quick start

```bash
git clone <this-repo>
cd Script_Generator
npm install

cp .env.example .env.local   # optional — everything in it is optional
npm run dev
# http://localhost:3000
```

That is the whole setup. There is no sign-in: the app opens straight onto the dashboard and creates
its single local workspace on first load.

With no API keys the studio runs in **demo mode**: fully usable, with every generated item badged
*Sample data*. To generate real scripts you need one AI key — see
**[Running it for free](#running-it-for-free)**, which needs no payment method anywhere.

---

## Access and exposure

**The studio has no authentication.** Anyone who can reach the URL can read every idea, research
session, discovered problem and script in it, generate new ones, delete anything, and spend your
configured API keys' quota. There is no login page, no session, and no per-route check.

That is fine for the intended use — one team, running it locally or on a private network. If it goes
anywhere reachable, put the access control in front of it:

| Where it runs | What to put in front |
| --- | --- |
| A laptop | Nothing. Bind to `localhost` (the default) and it is not reachable from the network |
| An internal server | VPN or an office-network-only firewall rule |
| Vercel | Deployment Protection (Vercel Authentication or Password Protection), in Project → Settings → Deployment Protection |
| Behind your own proxy | Basic auth, SSO/OIDC, or a Cloudflare Access policy on the hostname |

The same applies to the API routes — `/api/*` is as open as the pages are.

---

## Running it for free

**You never have to enter a payment method.** OpenAI and Anthropic both require one — that is why
they ask for a card — but every capability in this studio has a free provider behind it.

The whole thing takes about ten minutes.

### 1. AI provider — Google Gemini (5 minutes)

This is the one that matters: nothing generates without it.

1. Go to **<https://aistudio.google.com/app/apikey>**.
2. Sign in with any Google account.
3. Click **Create API key**. No credit card is requested at any point.
4. Copy the key (it starts with `AIza…`).
5. In the studio: **Settings → API keys → Google Gemini → Add key**, paste, **Save**, then **Test**.

Gemini's free tier covers the Flash models, which is what the studio defaults to. The Pro models
need billing, so leave the model field alone unless you know you want to change it. Free usage is
capped per minute and per day, which is plenty for writing scripts.

**Why Gemini and not Groq for Bhasika?** Gemini handles Devanagari noticeably better. If you write
mostly in English, Groq is faster and equally free.

### 2. Web search — Tavily (3 minutes)

Needed for live research and for discovering real audience problems. Without it the studio still
runs, using clearly-labelled sample research.

1. Go to **<https://app.tavily.com/home>** and sign up.
2. Copy the API key from the dashboard (it starts with `tvly-…`).
3. **Settings → API keys → Web search → Add key**, choose **Tavily**, paste, **Save**, **Test**.

Tavily's free plan gives a monthly credit allowance with no card. One search costs one credit.

### 3. Reddit — optional, free (5 minutes)

This is where the most useful audience questions come from.

1. Go to **<https://www.reddit.com/prefs/apps>** → **create another app…**
2. Choose type **script**, put anything in the redirect field (`http://localhost:3000`).
3. The **client ID** is the short string under the app name; the **secret** is labelled.
4. **Settings → API keys → Reddit → Add key**, paste both, set a user agent like
   `bhasika-content-studio/1.0 by u/yourname`, **Save**, **Test**.

### 4. YouTube — optional, free quota

Google Cloud → create a project → enable **YouTube Data API v3** → create an API key. The daily
quota costs nothing and no billing account is required.

### Other free AI options

| Provider | Cost | Good for | Sign-up |
| --- | --- | --- | --- |
| **Google Gemini** | Free, no card | **Recommended.** Best Nepali quality of the free options | <https://aistudio.google.com/app/apikey> |
| **Groq** | Free, no card | Very fast; English scripts | <https://console.groq.com/keys> |
| **OpenRouter** | Free models available | Trying several models with one key — use ids ending in `:free` | <https://openrouter.ai/keys> |
| **Ollama** | Free, offline | No account at all; runs on your own machine | <https://ollama.com/download> |

**Ollama** is worth knowing about if you would rather nothing left your computer: install it, run
`ollama pull llama3.1`, then point the studio at `http://localhost:11434/v1`. No key, no limits, no
account — but it needs a reasonably powerful machine, and small local models write weaker Nepali.

If you configure more than one, a **Use** selector appears at the top of the AI section so you can
pick which one writes. On *Automatic* the studio prefers the free providers.

> Free tiers and model names change. Every figure above was checked in September 2026 — if something
> looks different, trust the provider's own pricing page over this file.

---

## API keys

Every provider key is entered in **Settings → API keys**. No file editing, no redeploy.

| Integration | Cost | What it unlocks |
| --- | --- | --- |
| Google Gemini | Free, no card | Fact extraction, hooks, script generation, rewriting, fact checking |
| Groq | Free, no card | The same, on fast open models |
| OpenRouter | Free models available | The same, across many models |
| Ollama | Free, offline | The same, on your own machine |
| OpenAI | **Paid only** | The same |
| Anthropic | **Paid only** | The same |
| Web search (Tavily / Serper / Exa) | Tavily free, no card | Live internet research and public-discussion discovery |
| Reddit | Free | Public posts where your audience asks questions |
| YouTube | Free quota | Public video search |
| Facebook / Instagram | Meta app required | Posts on the Page or account the token manages |

### How keys are handled

- **Encrypted at rest.** Secrets are sealed with AES-256-GCM before they touch the database. The key
  comes from `CREDENTIALS_SECRET`; without it one is generated into `data/credentials.key` so local
  development needs no setup, and Settings warns you to set the variable before deploying.
- **Write-only.** A saved secret is never sent back to the browser. Settings shows the last four
  characters so you can tell which key is in place. Leaving a secret field blank keeps the stored one.
- **Verified, not assumed.** **Test** makes the cheapest real call the provider allows — a one-token
  completion, a three-result search, an OAuth token fetch — and shows the provider's own answer. So
  "Verified" means the key works, not merely that a value is present.
- **Environment variables still work.** They are the fallback when nothing is stored, and a key saved
  in Settings overrides the matching variable. Existing `.env` deployments need no changes.
- **Removable.** Deleting a stored credential falls back to the environment variable if one is set.

Non-secret settings live alongside the keys: the model for each provider, the base URL for OpenAI and
Ollama (so you can point at Azure, a gateway or a local server), the search provider, and the Reddit
user agent.

> Because the studio has no sign-in, anyone who can reach it can *use* these keys, even though they
> cannot read them back. Keep it on localhost or behind your own access control, and prefer keys with
> spending limits.

---

## Environment variables

Everything lives in `.env.local` (git-ignored). `.env.example` is the template.

Provider keys are easier to manage in [Settings → API keys](#api-keys); these are the fallback, plus
the settings that can only come from the environment.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | no | Public base URL |
| `CREDENTIALS_SECRET` | **recommended** | Encrypts keys stored via Settings. Without it, a key file is generated locally |
| `DATABASE_URL` | no | Postgres/Supabase. Without it, a local JSON store is used |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | no | Supabase project details |
| `AI_PROVIDER` | no | `gemini`, `groq`, `openrouter`, `ollama`, `openai` or `anthropic`. Unset = first one configured |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | no | Google Gemini (free tier, no card) |
| `GROQ_API_KEY`, `GROQ_MODEL` | no | Groq (free tier, no card) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | no | OpenRouter (free models available) |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | no | A local Ollama server — no key needed |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | no | OpenAI, or any OpenAI-compatible endpoint |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | no | Anthropic |
| `SEARCH_PROVIDER`, `SEARCH_API_KEY` | no | `tavily` (default), `serper`, or `exa` |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` | no | Reddit official API |
| `YOUTUBE_API_KEY` | no | YouTube Data API v3 |
| `FACEBOOK_ACCESS_TOKEN`, `INSTAGRAM_ACCESS_TOKEN` | no | Meta Graph API |
| `BHASIKA_DEMO_MODE` | no | Force demo mode even with keys present |

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
`api_integrations`, with foreign keys, indexes, timestamps and row-level security enabled.

There is one workspace row in `users`, created automatically on first load, and every other table is
scoped to it. Keeping that scoping means the schema is ready if accounts are ever added back, and it
costs nothing today.

The app connects with the service role, which bypasses RLS. RLS is enabled with no permissive policy
so that every *other* client — the anon key, the Supabase data browser as an end user — is denied by
default.

---

## API integrations

### AI provider

Six are supported. Add the key in **Settings → API keys**, or set it in the environment. When more
than one is configured, `AI_PROVIDER` (or the **Use** selector in Settings) picks the active one;
left unset, the studio takes the first configured provider in free-first order.

Gemini, Groq, OpenRouter and Ollama all speak the OpenAI chat-completions protocol, so they are
presets over a single client rather than separate implementations:

| `AI_PROVIDER` | Endpoint | Key |
| --- | --- | --- |
| `gemini` | `generativelanguage.googleapis.com/v1beta/openai` | `GEMINI_API_KEY` |
| `groq` | `api.groq.com/openai/v1` | `GROQ_API_KEY` |
| `openrouter` | `openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| `ollama` | `OLLAMA_BASE_URL` (default `localhost:11434/v1`) | none |
| `openai` | `OPENAI_BASE_URL` (default `api.openai.com/v1`) | `OPENAI_API_KEY` |
| `anthropic` | `api.anthropic.com` | `ANTHROPIC_API_KEY` |

Because OpenAI's preset honours `OPENAI_BASE_URL`, any other OpenAI-compatible endpoint (Azure, an
internal gateway, a self-hosted server) works without new code.

Without a key: research still searches and stores sources, but facts are not extracted, and hooks and
scripts come from the labelled demo generator. AI editing and fact checking return a clear
"not configured" message rather than failing quietly.

### Search provider

Add the key in Settings, or set `SEARCH_API_KEY` and optionally `SEARCH_PROVIDER`:

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
2. Enter the client ID, client secret and a descriptive user agent in Settings, or set
   `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` and `REDDIT_USER_AGENT`.

Uses the official OAuth application-only grant and reads public listings only.

### YouTube

Enable **YouTube Data API v3** in Google Cloud, then add the key in Settings or set `YOUTUBE_API_KEY`.
Public video search only.

### Facebook / Instagram

Add the token in Settings, or set `FACEBOOK_ACCESS_TOKEN` / `INSTAGRAM_ACCESS_TOKEN`, from a Meta app
with the appropriate Page or Business permissions.

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

The studio has no authentication — see [Access and exposure](#access-and-exposure) for what that
means and what to put in front of it. Everything below is what the app itself still does:

- **No API keys in the browser.** Keys are read in server-only modules, stored AES-256-GCM encrypted,
  and never sent back to the client — Settings shows a four-character preview and nothing more.
  `/api/status` reports whether a key is present, never its value.
- **Zod validation** on every request body.
- **SQL injection is structurally prevented**: the Postgres driver validates every identifier against
  a column whitelist and binds every value as a parameter.
- **Safe error messages.** Provider errors (which are written to be user-facing) are surfaced;
  anything else returns a generic message and logs server-side without secrets.
- **RLS enabled with no permissive policy**, so clients other than the app's service-role connection
  are denied by default.
- **No secrets in the repository**: `.env.local` and `data/store.json` are git-ignored.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`.
- Pages are marked `noindex, nofollow`.

---

## Architecture

```
src/
├── app/
│   ├── (dashboard)/        # Dashboard, ideas, problems, research, script, scripts, settings
│   ├── api/                # Route handlers (ideas, research, problems, hooks, scripts, settings, status)
│   ├── privacy/            # Privacy page
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
│   ├── credentials/        # Registry, AES-256-GCM crypto, encrypted credential store
│   ├── db/                 # Store interface + JSON and Postgres drivers, column whitelist
│   ├── learning/           # Rule-based preference tracking
│   └── types.ts  validation.ts  data.ts  api.ts  env.ts  user.ts
supabase/migrations/        # SQL schema
scripts/                    # migrate
```

Every provider sits behind an interface, so swapping one is a single line in its `index.ts` factory.
Nothing in the app hardcodes a specific vendor.

### Duration model

Estimates use words-per-second tuned for calm narration: **2.1 wps Nepali**, **2.5 wps English** —
Devanagari words carry more syllables on average. The editor shows estimated vs target with a
tolerance band, and the generator is given a word budget rather than being asked to guess.

---

## API reference

No route requires a session — they are all open. Errors return `{ error, code }`.

| Method | Route | Purpose |
| --- | --- | --- |
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
| `GET PUT DELETE` | `/api/settings/integrations` | Read masked state / save keys / remove keys |
| `POST` | `/api/settings/integrations/[id]/test` | Verify a credential with a real provider call |
| `GET PATCH` | `/api/settings/preferences` | Studio defaults |
| `GET DELETE` | `/api/settings/learning` | Insights / delete learning history |
| `GET` | `/api/status` | Integration status (never key values) |
| `GET` | `/api/health` | Health check |

---

## Deployment

### Vercel

1. Import the repository.
2. Add the environment variables you need from `.env.example` in **Project → Settings → Environment
   Variables**.
3. Set `DATABASE_URL` to your Supabase connection string and run `npm run db:migrate` locally against
   it once.
4. **Turn on Deployment Protection** in **Project → Settings → Deployment Protection**. Without it the
   deployment is public — see [Access and exposure](#access-and-exposure).
5. Deploy. Routes are dynamic; nothing is cached between requests.

### Docker / self-hosted

```bash
npm ci
npm run build
npm start          # listens on $PORT, default 3000
```

Bind it to `localhost` and reach it over an SSH tunnel, or put an authenticating reverse proxy in
front of it. Do not expose the port directly.

### Checklist before the team uses it

- [ ] Access control is in place in front of the app, or it is only reachable from localhost
- [ ] `CREDENTIALS_SECRET` is set, so keys stored via Settings survive a redeploy
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
- **No authentication and no multi-user separation.** One shared workspace, open to anyone who can
  reach it. Rows are still scoped to a workspace id, so accounts could be layered back on without a
  data migration.
- **Stored keys are only as private as the deployment.** They are encrypted at rest and never
  returned to the browser, but the running app can decrypt them, and it has no sign-in — so the
  access boundary in front of it is what protects them.
- **Fact checking is an assistant, not an approver.** It checks the script against the attached
  sources only. A human still reads anything about fees, deadlines or visa rules before it ships.

---

*Bhasika — We explain. You decide.*
