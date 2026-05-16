# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev        # start dev server on localhost:3000
pnpm build      # production build
pnpm lint       # run ESLint
```

No test suite exists.

## Environment Variables

```
GEMINI_API_KEY      # required — used by app/lib/gemini.ts for AI matching
STAFF_EMAIL         # optional, defaults to admin@cradle.com.my
STAFF_PASSWORD      # optional, defaults to cradle2026
```

## Architecture

This is **Cradle Portal** — a Malaysian startup ecosystem matching platform built for a hackathon. It has three actor flows:

1. **Startup** (`/startup`) — fills a profile form, which POSTs to `/api/startups`, then GETs `/api/startups/[id]/matches` (calls Gemini with seed data), and passes results via `sessionStorage` to `/startup/results`.
2. **Partner** (`/partner`) — sub-routes for corporate/investor/service_provider that POST to `/api/partners`.
3. **Cradle Staff** (`/staff/login` → `/admin`) — simple credential login, admin dashboard shows all linkages with filters and CSV export.

### Data flow

- `data/mentors.json`, `data/programmes.json`, `data/partners.json` are static seed files read from disk at match time (`readFileSync` inside `/api/startups/[id]/matches/route.ts`).
- `app/lib/store.ts` is a process-level in-memory singleton (`globalThis.__store`) that holds startups, linkages, and partners. The file documents that Firestore is the intended swap target.
- `app/lib/gemini.ts` calls Gemini 1.5 Flash and strips markdown fences from the response before JSON-parsing. `app/lib/prompts.ts` contains `buildMatchingPrompt`.
- Linkages are created when a startup confirms a match (`POST /api/linkages`), and can be status-patched via `PATCH /api/linkages/[id]`.

### Type conventions

- camelCase in TypeScript (`LinkageCreate`, `MatchResponse`), snake_case in store docs (`LinkageDoc`). `docToLinkage()` converts between them.
- Dynamic API route handlers use `RouteContext<'/api/path/[id]'>` for typed params — this is a Next.js 16 convention; `ctx.params` must be awaited.
- All API routes return `Response.json(...)` (Web API), not `NextResponse.json`.
- Pages that need browser APIs are `'use client'` components; server components are the default.
