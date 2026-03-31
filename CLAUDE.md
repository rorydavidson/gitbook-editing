# GitBook Editing — Project Instructions

## What this project does

Converts GitBook markdown documents (stored in GitHub repos) into Google Docs for collaborative editing, then syncs changes back to the repo as a pull request.

## Architecture

**Monorepo** with npm workspaces: `shared/`, `server/`, `client/`

| Layer | Tech |
|-------|------|
| Backend | Express + TypeScript (strict) |
| Frontend | React + Vite + TypeScript |
| Database | SQLite via Drizzle ORM + `@libsql/client` |
| Auth | GitHub OAuth (passport-github2) + Google OAuth (passport-google-oauth20, offline access) |
| Deployment | Docker Compose |

## Important technical decisions

### Database: `@libsql/client` (not `better-sqlite3`)
`better-sqlite3` was replaced because native module compilation (`gyp`/`distutils`) fails on Python 3.12+. `@libsql/client` uses an async API — **all Drizzle query methods return Promises**. Always `await` them: `.get()`, `.all()`, `.run()`.

### GitBook HTML round-tripping
GitBook-specific HTML elements (`<table data-view="cards">`, `<mark style="color:...">`, liquid `{% include %}`, etc.) are:
1. Stripped from markdown before upload, replaced with placeholder tokens
2. Stored as `GITBOOK_PRESERVE:{json}` comments in Google Docs
3. Restored from those comments during pull

The element registry lives in `shared/src/gitbook-elements.ts`.

### Token encryption
All OAuth tokens (GitHub, Google) are encrypted at rest with AES-256-GCM. Key comes from `TOKEN_ENCRYPTION_KEY` env var. See `server/src/utils/crypto.ts`.

### Session store
Currently uses the default in-memory session store (sessions are lost on server restart). This is a known limitation — no persistent store was wired up to avoid native module issues.

## Key files

- `shared/src/gitbook-elements.ts` — GitBook HTML element registry
- `server/src/services/markdown-to-gdoc.ts` — push pipeline (markdown → Google Doc)
- `server/src/services/gdoc-to-markdown.ts` — pull pipeline (Google Doc → markdown)
- `server/src/services/sync-orchestrator.ts` — orchestrates push/pull, creates branches and PRs
- `server/src/services/summary-parser.ts` — parses `SUMMARY.md` into a tree
- `server/src/db/schema.ts` — Drizzle schema (users, projects, document_mappings, image_mappings, sync_logs)

## Dev setup

```bash
npm install          # from repo root (installs all workspaces)
npm run dev          # starts server (port 3001) + client (port 5173) in parallel
```

Required env vars (copy `.env.example` to `.env`):
```
DATABASE_PATH=./data/app.db
TOKEN_ENCRYPTION_KEY=<32-byte hex>
SESSION_SECRET=<random string>
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
CLIENT_URL=http://localhost:5173
```

## Processing model

All heavy processing (GitHub API calls, Google Docs API calls, markdown conversion) runs server-side. The client is a thin React UI that calls the REST API.

## Tests

```bash
cd server && npx vitest run
```

Tests cover: SUMMARY.md parser, GitBook element extraction/restoration (round-trip fidelity).
