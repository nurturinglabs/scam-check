# Scam Check

**A second opinion before you pay.**

A web app for blue-collar workers in India to check whether a suspicious offer (job, investment, loan, online task, courier/parcel call) is a scam. Paste the message, answer up to three quick follow-up questions, get a clear verdict — *likely scam / suspicious / probably safe* — with the specific red flags found and concrete next steps. Share the verdict via URL.

Built for [JobReach](https://jobreach.in) (Kiran, Karnataka) by haagLABS. v1 is English-only, web-only, no LLM dependency.

---

## Table of contents

- [What it does](#what-it-does)
- [Why deterministic, not LLM](#why-deterministic-not-llm)
- [Quickstart](#quickstart)
- [Architecture](#architecture)
- [Detection pipeline](#detection-pipeline)
  - [Signal extractor](#signal-extractor)
  - [Instant-fail rules](#instant-fail-rules)
  - [Classifier](#classifier)
  - [Rules engine](#rules-engine)
  - [Per-category follow-ups](#per-category-follow-ups)
- [Pattern database](#pattern-database)
  - [Adding a new scam pattern](#adding-a-new-scam-pattern)
- [Test fixtures](#test-fixtures)
- [API](#api)
- [Storage / Supabase](#storage--supabase)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Out of scope but designed for](#out-of-scope-but-designed-for)
- [Open questions](#open-questions)

---

## What it does

A user lands on the homepage and sees two columns:

- **Left — the index.** A library of common scam patterns (job, investment, loan, task, courier) with hooks, classic scripts, example messages, and prevalence indicators. Even users who don't chat learn something on first load.
- **Right — the desk.** A conversational agent. The user pastes the message they received, optionally taps a category chip, and the backend either returns a verdict immediately or asks one focused yes/no follow-up. Maximum three follow-ups, then a verdict is forced.

The verdict screen shows:

- A colored banner with the headline call (red / amber / green).
- Specific red flags found, in plain English with section markers.
- Numbered next steps including the **1930** cyber-crime helpline, **cybercrime.gov.in**, and **sachet.rbi.org.in** for investment fraud.
- A **Share this verdict** button that copies a public URL — the user can forward it to whoever is pressuring them.

On mobile the layout collapses to two tabs: *Check your offer* (default) and *Common scams*.

## Why deterministic, not LLM

v1 has no LLM dependency. The detection logic is regex + keyword matching + a small rules engine, all in pure TypeScript. The trade-offs:

- **Free to run, fast, auditable.** A verdict is computed in milliseconds. Every fired rule is traceable to a JSON entry.
- **Editable by non-engineers.** Adding a new scam pattern is a JSON commit, no code change.
- **Channel-agnostic backend.** WhatsApp / voice / Kannada layers in v2-v3 plug into the same `/api/analyze` without rewriting it.
- **No data sent to third parties.** Important for the user demographic — anonymous, no PII stored.

The architecture leaves a documented seam for an LLM fallback (Sarvam / Haiku) on `need_more_info` cases, to be added in v2.

---

## Quickstart

Requires Node 20+ and npm 10+.

```bash
git clone https://github.com/nurturinglabs/scam-check.git
cd scam-check
npm install

# Run the deterministic test suite (18 fixtures, including the
# investment-scam regression test).
npm test

# Start the dev server.
npm run dev
# → http://localhost:3000
```

By default the app uses an in-memory store for verdicts (good for local dev; verdicts disappear on restart). To persist verdicts and interactions, see [Storage / Supabase](#storage--supabase).

### Other scripts

| Script             | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Next.js dev server (HMR)                           |
| `npm run build`    | Production build                                   |
| `npm run start`    | Run the production build                           |
| `npm run lint`     | ESLint (`next/core-web-vitals`)                    |
| `npm run typecheck`| `tsc --noEmit`                                     |
| `npm test`         | Run the fixture suite (`tests/run.ts` via tsx)     |

> **Note**: don't run `npm run build` while `npm run dev` is running — they share the `.next/` directory and will collide.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js app router, React Server + Client)           │
│                                                                 │
│  app/page.tsx ─→ <HomeLayout>                                   │
│                    ├─ <ScamLibrary>  (left column, cards)       │
│                    └─ <CheckAgent>   (right column, chat UI)    │
│                          └─ <Verdict>                           │
│                                                                 │
│  app/v/[id]/page.tsx ─→ <Verdict>  (shared)                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼   HTTP JSON
┌─────────────────────────────────────────────────────────────────┐
│  API routes (Node runtime)                                      │
│                                                                 │
│  POST /api/analyze       → run detection pipeline               │
│  POST /api/verdict       → persist verdict, return short slug   │
│  GET  /api/verdict/[id]  → fetch saved verdict                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Detection core  (pure TypeScript, no I/O — testable)           │
│                                                                 │
│  extract(text)        → signals                                 │
│  evaluateInstantFail  → short-circuit at high severity          │
│  classify(signals)    → category (job / investment / …)         │
│  evaluate(cat, sigs)  → verdict + red flags + next steps        │
│  pickNextQuestion     → per-category follow-up                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Pattern database — JSON files in data/patterns/                │
│                                                                 │
│  common.json  job.json  investment.json  loan.json              │
│               task.json  courier.json                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Storage  (lib/storage.ts)                                      │
│                                                                 │
│  Supabase (if env vars set) | In-memory Map (otherwise)         │
└─────────────────────────────────────────────────────────────────┘
```

Three layers, each with a clean seam:

1. **Frontend** has zero business logic. It calls `/api/analyze` and renders the response.
2. **API layer** is three thin route handlers — argument validation and storage glue only.
3. **Detection core** has no I/O. It can run in a unit test, a webhook, or a voice-agent tool call without modification.

---

## Detection pipeline

`POST /api/analyze` runs this pipeline. The same logic runs in tests and would run inside a WhatsApp / voice adapter.

```
text + prior signals + answers
            │
            ▼
       extract(text)              ← regex/keyword pass + numeric extraction
            │                       + derived compound signals
            ▼
       merge prior signals
            │
            ▼
       apply follow-up answers
            │
            ▼
   evaluateInstantFail(signals)   ← if any rule fires, short-circuit
            │
       ┌────┴────┐
   no  │         │  yes
       ▼         ▼
   classify   build verdict at HIGH severity from the
   (signals)  instant-fail rule + any other rules that fire
       │
       ▼
   evaluate(category, signals)    ← rules engine: red flags + severity
       │
       ▼
   if decisive (likely_scam, or probably_safe after ≥1 follow-up,
                or 3 follow-ups already done):
       return verdict
   else:
       return next follow-up question for this category
```

### Signal extractor

[`lib/detection/extractor.ts`](lib/detection/extractor.ts) runs ~35 regex/keyword patterns from the JSON files and produces a `Signals` object. Beyond simple regexes it computes:

- **`payment_amount`** — the largest rupee amount in the message (handles `₹`, `Rs`, `INR`, `K`, `lakh`, `crore`).
- **`unrealistic_pay_for_effort`** / **`unrealistic_pay_ratio`** — heuristic that flags 2 hrs/day @ ≥₹10K/month, or ≥₹500/day for ≤3 hrs, or ≥₹40K/month with no clear role.
- **Derived compound signals**:
  - `upfront_payment_demanded` ← any of the fee mentions
  - `payment_for_job_offer` ← registration / training / kit / deposit fee
  - `pay_to_unlock_earnings` ← merchant-task or recharge mention
  - `customs_or_courier_pretext` ← parcel/customs language + payment
  - `arrest_threat` ← FIR / CBI / digital arrest / police
  - `loan_fee_before_disbursement` ← pre-approved loan + upfront fee

### Instant-fail rules

[`lib/detection/instant_fail.ts`](lib/detection/instant_fail.ts). Run **before** classification. If any fires, the pipeline short-circuits to a `likely_scam` verdict at high severity, no follow-ups asked.

| Rule                                           | Category    | Why                                                                     |
| ---------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| `instant_guaranteed_high_returns`              | investment  | SEBI bars Indian advisors from guaranteeing returns                     |
| `instant_arrest_threat`                        | courier     | "Digital arrest" doesn't exist in Indian law                            |
| `instant_loan_fee_before_disbursement`         | loan        | RBI prohibits pre-disbursement fee collection                           |
| `instant_pay_to_unlock_earnings`               | task        | Classic merchant-task / recharge-to-unlock scam                         |
| `instant_payment_for_unsolicited_job`          | job         | Genuine employers never charge candidates                               |
| `instant_crypto_or_trading_pump_via_telegram`  | investment  | Pump-and-dump or fake-app withdrawal trap                               |

The fixture suite locks in fixture #2 ("Someone contacted me promising 20% returns on investment, deposit 5000 to start") as a regression test. It must instant-fail.

### Classifier

[`lib/detection/classifier.ts`](lib/detection/classifier.ts). Weighted scoring per category. Each signal contributes a documented weight (in the per-category JSON files) toward one or more categories. If the top score is below threshold (2), the classifier returns `unknown` and the pipeline asks the user to clarify.

Tuned so the legitimate fixtures (HDFC FD with 7.2% interest, SBI loan branch visit, walk-in interview) classify as the right category but trigger no red-flag rules, ending in `probably_safe`.

### Rules engine

[`lib/detection/rules.ts`](lib/detection/rules.ts). Reads `red_flag_rules` from the relevant category file plus shared rules from `common.json`. Each rule has:

```json
{
  "id": "job_upfront_fee",
  "requires_any": ["mentions_registration_fee", "mentions_training_fee", ...],
  "red_flag": "Genuine employers never ask candidates to pay any fee...",
  "severity": "high"
}
```

`requires_all` and `requires_any` are both supported. Severity weights: `low=1`, `medium=2`, `high=4`. Verdict logic:

- Any high-severity rule **or** total severity ≥ 4 → `likely_scam`
- Total severity ≥ 2 → `need_more_info`
- Any rule fires but total < 2 → `need_more_info`
- No rules fire → `probably_safe`

### Per-category follow-ups

[`lib/detection/next_question.ts`](lib/detection/next_question.ts) defines an ordered list of questions per category, picked by which signal is still unset. Examples:

- **Job** → "Did they ask you to pay any money — registration, training, kit, security deposit — before joining?"
- **Investment** → "Did they promise you a specific return on your money — like a percentage, daily/weekly profit, or doubling your money?"
- **Loan** → "Have they asked you for any fee (GST, processing, insurance) before releasing the loan?"
- **Courier** → "Did they mention police, CBI, customs, FIR, arrest, or any kind of legal action against you?"

A "yes" answer flips the underlying signal to true, which can in turn fire instant-fail or red-flag rules on the next pipeline run.

---

## Pattern database

JSON files in [`data/patterns/`](data/patterns/), one per category (`job.json`, `investment.json`, `loan.json`, `task.json`, `courier.json`) plus a shared [`common.json`](data/patterns/common.json).

Each file contains:

```jsonc
{
  "metadata": { "category": "job", "version": 1, "last_updated": "2026-05-06" },

  // Cards rendered in the left-column scam library.
  "display": {
    "label": "Job scam",
    "icon": "briefcase",
    "color": "#dc2626",
    "cards": [
      {
        "id": "job-data-entry",
        "title": "Data entry, ₹15K/month for 2 hours",
        "script": "Promises easy work-from-home job, then asks for a registration / training fee...",
        "tags": ["Upfront fee", "Too good to be true", "WhatsApp only"],
        "example": "Data entry job, 2 hrs/day, ₹15K/month. Send 250 registration fee on WhatsApp.",
        "prevalence": "high"
      }
    ]
  },

  // Regex/keyword lists that fire signals during extraction.
  "signal_patterns": {
    "data_entry_or_form_filling": [
      "\\bdata\\s+entry\\b", "\\bform\\s+filling\\b", "\\btype\\s+work\\b"
    ]
  },

  // How signals contribute to category scoring.
  "category_signal_weights": {
    "data_entry_or_form_filling": 4,
    "mentions_registration_fee": 3
  },

  // Red-flag rules specific to this category.
  "red_flag_rules": [
    {
      "id": "job_upfront_fee",
      "requires_any": ["mentions_registration_fee", "mentions_training_fee", "..."],
      "red_flag": "Genuine employers never ask candidates to pay...",
      "severity": "high"
    }
  ],

  // Category-specific recommendations on the verdict screen.
  "next_steps": [
    "Do not pay any 'registration', 'training' or 'kit' fee.",
    "Ask for the company's website, office address, and an official email."
  ]
}
```

`common.json` contains cross-cutting signal patterns (Aadhaar / PAN requests, OTP requests, urgency cues, threat language, prize/lottery, short URLs, APK installs, guaranteed-return language) and the cross-cutting `red_flag_rules` that apply regardless of category.

### Adding a new scam pattern

Most updates do **not** require a code change.

1. **New trigger phrase** for an existing signal — add to the relevant `signal_patterns[<signal>]` array.
2. **New red-flag rule** — append to `red_flag_rules` in the right category file with `requires_any` / `requires_all`, a `red_flag` string, and `severity`.
3. **New scam-library card** — append to `display.cards` in the right category file with `id`, `title`, `script`, `tags`, `example`, `prevalence`.
4. **New signal entirely** — add patterns to `common.json` or a category file. If the signal needs to be derived (compound logic), add it to [`lib/detection/extractor.ts`](lib/detection/extractor.ts).
5. Re-run `npm test`.
6. Commit. The frontend and detection engine read from the same JSON, so the card and the rule update together.

---

## Test fixtures

[`tests/fixtures.json`](tests/fixtures.json) holds 18 examples:

- 7 instant-fail scam fixtures (one per instant-fail rule)
- 5 multi-signal scam fixtures (job/investment/loan/task/courier)
- 3 legitimate-but-tricky fixtures (walk-in interview, SBI loan branch, HDFC FD)
- 1 legitimate delivery-partner job
- 2 ambiguous fixtures that should return `need_more_info`

[`tests/run.ts`](tests/run.ts) runs the rules engine against each fixture and asserts:

- `expected_category`
- `expected_verdict` (`likely_scam` / `need_more_info` / `probably_safe`)
- `expected_severity`
- `expected_instant_fail` flag
- `expected_red_flags_must_include` list of rule IDs

```
$ npm test
PASS 01-job-data-entry-fee-unsolicited
PASS 02-investment-20pct-returns-REGRESSION   ← critical regression
PASS 03-investment-crypto-telegram
…
18 passed, 0 failed (18 total)
```

Failures print the firing signals, classifier scores, and rules-engine output so you can see exactly why a fixture didn't pass.

---

## API

All routes use the Node runtime and accept/return JSON.

### `POST /api/analyze`

Run the detection pipeline. Used by the conversational agent and by future channel adapters (WhatsApp, voice).

**Request**:

```json
{
  "text": "Data entry job, 2 hrs/day, ₹15K/month. Send 250 registration fee.",
  "category_hint": "job",
  "prior_signals": null,
  "follow_up_count": 0,
  "follow_up_answers": {}
}
```

**Response (verdict)**:

```json
{
  "kind": "verdict",
  "verdict": {
    "category": "job",
    "category_label": "Job offer",
    "verdict": "likely_scam",
    "severity": "high",
    "red_flags": ["Genuine employers never ask candidates to pay any fee..."],
    "next_steps": ["Do not pay any 'registration' fee...", "..."],
    "reasoning": "We saw a pattern that's almost never present in genuine offers...",
    "signals": { "...": "..." },
    "fired_rule_ids": ["instant_payment_for_unsolicited_job", "job_upfront_fee"]
  }
}
```

**Response (follow-up)**:

```json
{
  "kind": "follow_up",
  "question": "Did they ask you to pay any money before joining?",
  "question_id": "job_payment_asked",
  "type": "yes_no",
  "signals": { "...": "..." },
  "category_guess": "job"
}
```

The client passes the returned `signals` and the user's answer back as `prior_signals` and `follow_up_answers` on the next call, incrementing `follow_up_count`.

### `POST /api/verdict`

Persist a verdict, get a short slug for the share URL.

**Request**:

```json
{
  "verdict": { "..." : "..." },
  "session_id": "anonymized-uuid-from-cookie",
  "user_text": "Original message the user pasted"
}
```

**Response**: `{ "id": "k7p2x9" }`. The slug is 6 chars, alphabet `abcdefghjkmnpqrstuvwxyz23456789` (no ambiguous chars). The verdict expires after 90 days.

### `GET /api/verdict/[id]`

Fetch a saved verdict for the share page. `404` if not found, `400` if the slug shape is wrong.

---

## Storage / Supabase

[`lib/storage.ts`](lib/storage.ts) abstracts persistence. Two implementations:

- **`MemoryStorage`** (default in dev) — `Map` in the Node process. Verdicts disappear on restart. Fine for local development.
- **`SupabaseStorage`** — used when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.

### Schema

Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the Supabase SQL editor (or via `supabase db push`):

```sql
create table verdicts (
  id text primary key,                    -- short slug like "k7p2x9"
  category text not null,
  verdict text not null,
  severity text not null,
  red_flags jsonb not null,
  next_steps jsonb not null,
  reasoning text not null,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '90 days')
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,               -- anonymous UUID from cookie
  user_text text not null,
  category text,
  signals jsonb not null,
  verdict_id text references verdicts(id),
  created_at timestamptz default now()
);
```

`verdicts` is publicly readable by ID (RLS policy `verdicts_public_read`). `interactions` is server-write only (no client-side reads). No PII is stored — `session_id` is a random UUID set in a cookie.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The app auto-falls-back to in-memory storage if these are unset.

---

## Project structure

```
scam-check/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts           # POST /api/analyze
│   │   ├── verdict/route.ts           # POST /api/verdict
│   │   └── verdict/[id]/route.ts      # GET  /api/verdict/[id]
│   ├── v/[id]/
│   │   ├── page.tsx                   # share page (SSR, public)
│   │   └── not-found.tsx
│   ├── globals.css                    # parchment + claret theme tokens
│   ├── layout.tsx                     # next/font: Fraunces + Inter
│   └── page.tsx                       # homepage (loads scam library SSR)
├── components/
│   ├── HomeLayout.tsx                 # 2-column wrapper, mobile tabs
│   ├── ScamLibrary.tsx                # left column: search, filter, cards
│   ├── ScamCard.tsx                   # single scam card
│   ├── CheckAgent.tsx                 # right column: chat-style agent
│   └── Verdict.tsx                    # verdict display (used by both pages)
├── data/patterns/
│   ├── common.json                    # cross-cutting signals & rules
│   ├── job.json                       # + display block (cards)
│   ├── investment.json                # + display block
│   ├── loan.json                      # + display block
│   ├── task.json                      # + display block
│   └── courier.json                   # + display block
├── lib/
│   ├── detection/
│   │   ├── analyze.ts                 # pipeline orchestrator
│   │   ├── extractor.ts               # regex + numeric extraction
│   │   ├── instant_fail.ts            # short-circuit rules
│   │   ├── classifier.ts              # weighted scoring
│   │   ├── rules.ts                   # red-flag rule evaluation
│   │   ├── next_question.ts           # per-category follow-ups
│   │   ├── patterns.ts                # JSON loader + scam library exporter
│   │   └── types.ts                   # shared types
│   └── storage.ts                     # Supabase | in-memory
├── supabase/
│   └── migrations/0001_init.sql
├── tests/
│   ├── fixtures.json                  # 18 fixtures
│   └── run.ts                         # test runner (no framework)
├── next.config.mjs
├── tailwind.config.ts                 # parchment + claret + serif tokens
├── tsconfig.json
└── package.json
```

---

## Deployment

The app is designed to deploy to **Vercel** out of the box.

1. Push to GitHub (this repo).
2. Import the repo into Vercel.
3. Add the three Supabase environment variables in the Vercel project settings.
4. Deploy. The `/v/[id]` route is server-rendered on demand, the home page is statically prerendered.

The `/api/*` routes run on the Node runtime (declared explicitly in each handler). They are stateless except for the storage layer, so horizontal scaling is automatic.

**Page-load budget**: under 2 seconds on 3G simulation. The home page first-load JS is around 91 kB (Next.js shared chunks + a small client bundle for the chat UI).

---

## Out of scope but designed for

These are v2 / v3 work, but the v1 architecture accommodates them without a rewrite:

- **Kannada and Hindi.** Pattern files and verdict templates parallel-translated. The detection core operates on language-agnostic boolean signals, so swapping the language layer is purely a content task.
- **WhatsApp channel.** A Twilio or Meta Cloud API webhook posts inbound messages to `/api/analyze` and posts the verdict back. No detection logic in the webhook.
- **Voice channel.** A [Retell](https://retellai.com) agent's tools call `/api/analyze` and `/api/verdict`. Same backend.
- **Admin dashboard.** A `/admin` route showing aggregated scam types this week, top red flags, geographic clustering. The `interactions` schema already supports this — no migration needed.
- **LLM fallback.** For ambiguous text where the rules engine returns `need_more_info`, optionally call a small model (Sarvam, Claude Haiku) to classify. Deterministic rules remain primary; the LLM is a tiebreaker, not a replacement.
- **Pattern submission.** Let users submit new scam patterns they encountered, queued for the haagLABS team's review before being added to the library.

---

## Open questions

1. Branding — JobReach, haagLABS, or co-branded?
2. Will Kiran's team add patterns themselves or send them to haagLABS?
3. Deployment domain — subdomain of JobReach, or standalone?
4. Compliance / data residency — Supabase region (Mumbai / `ap-south-1`)?
5. Prevalence ratings on cards — does Kiran have field data on which scams hit his users most, or do we estimate from public sources?

---

## License

Internal — haagLABS / JobReach. No public license yet.
