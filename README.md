# Scam Check

A second opinion before you pay.

A web app that lets users describe a suspicious offer (job, investment, loan, online task, courier call) in plain text and returns a verdict — *likely scam / suspicious / probably safe* — with the red flags found and concrete next steps. Built for blue-collar workers in India.

## Quickstart

Requires Node 20+.

```bash
npm install
npm test         # run the fixture suite
npm run dev      # http://localhost:3000
```

Without environment variables, the app runs against an in-memory store (good for local dev, verdicts disappear on restart).

## Configuration

Copy `.env.example` to `.env.local` and fill in the Supabase keys to enable persistent verdicts and the share-URL feature across restarts.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the Supabase SQL editor.

## Stack

Next.js 14 · TypeScript · Tailwind · Supabase. Deployed on Vercel.

## Layout

```
app/             Pages and API routes
components/      UI components
data/patterns/   Scam-pattern JSON (editable without touching code)
lib/             Detection logic and storage
tests/           Fixture suite (npm test)
```

## License

Internal — haagLABS. Not for public reuse.
