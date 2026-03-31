# GitBook → Google Docs Editor
 
## Context
 
Build a web app that converts GitBook markdown documents (stored in GitHub repos) into Google Docs for collaborative editing, then syncs changes back to the repo as a PR. This enables non-technical collaborators to edit GitBook content without learning markdown or Git.
 
Example source repo: https://github.com/SNOMED-Documents/snomed-starter-guide
 
---
 
## Architecture
 
**Monorepo** with npm workspaces: `server/`, `client/`, `shared/`
 
| Layer | Tech |
|-------|------|
| Backend | Express + TypeScript (strict) |
| Frontend | React + Vite + TypeScript |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| Auth | GitHub OAuth (passport-github2) + Google OAuth (passport-google-oauth20, offline access) |
| Deployment | Docker Compose (multi-stage builds) |
 
---
 
## Core Workflow
 
1. User signs in with GitHub + Google OAuth
2. Selects a GitHub repo → app parses `SUMMARY.md` to show document tree
3. User picks documents → **Push**: markdown uploaded to Google Drive as Google Docs, with GitBook-specific HTML preserved via Docs API comments
4. Collaborators edit in Google Docs
5. User clicks **Pull**: app reads Google Docs back, restores GitBook HTML, commits to a new branch, opens a PR
 
---
 
## Conversion Strategy
 
### Push (Markdown → Google Docs)
1. Parse markdown with `unified`/`remark-parse` to detect GitBook-specific HTML (`<table data-view="cards">`, `<mark>`, `<figure>`, buttons, liquid includes)
2. Replace each with a placeholder token, store original HTML
3. Upload cleaned markdown to Google Drive with `mimeType: application/vnd.google-apps.document` (Drive API handles standard markdown conversion)
4. Locate placeholders in the created doc, attach a Google Docs comment at each containing `GITBOOK_PRESERVE:` + serialised original HTML
5. Upload images from `.gitbook/assets/` to Drive, insert into doc
 
### Pull (Google Docs → Markdown)
1. Fetch document via Docs API `documents.get`
2. Fetch all comments; build map of preserved GitBook elements
3. Walk `Body.content` structural elements, converting to markdown
4. When walker hits a preserved-element range, emit the original HTML instead
5. Detect new images, download them, include in commit
 
**Fallback**: If Drive API markdown upload proves too lossy, swap to full Docs API `batchUpdate` walker (behind an interface).
 
---
 
## Data Model (SQLite / Drizzle)
 
- **users**: `id`, `github_id`, `github_username`, `github_access_token` (encrypted), `google_id`, `google_email`, `google_access_token` (encrypted), `google_refresh_token` (encrypted)
- **projects**: `id`, `user_id`, `repo_owner`, `repo_name`, `default_branch`, `sync_branch`, `google_drive_folder_id`, `status`
- **document_mappings**: `id`, `project_id`, `local_path`, `title`, `google_doc_id`, `google_doc_url`, `last_pushed_at`, `last_pulled_at`, `last_pushed_commit_sha`, `status`
- **image_mappings**: `id`, `project_id`, `local_path`, `drive_file_id`
- **sync_logs**: `id`, `project_id`, `direction`, `status`, `documents_affected`, `pull_request_url`, `error_message`
 
Tokens encrypted with AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY` env var.
 
---
 
## API Routes
 
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/github`, `/auth/google` | Initiate OAuth flows |
| GET | `/auth/*/callback` | OAuth callbacks |
| POST | `/auth/logout` | Destroy session |
| GET | `/api/me` | Current user |
| GET | `/api/repos` | List user's GitHub repos |
| GET | `/api/repos/:owner/:repo/summary` | Parse SUMMARY.md → tree |
| POST | `/api/projects` | Create project from repo |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Project detail + doc mappings |
| POST | `/api/projects/:id/documents` | Select documents |
| POST | `/api/projects/:id/push` | Push to Google Docs |
| POST | `/api/projects/:id/pull` | Pull changes, create PR |
| GET | `/api/projects/:id/sync-logs` | Sync history |
 
---
 
## Frontend Pages
 
1. **Login** — Sign in with GitHub, then connect Google
2. **Repo Select** — Searchable list of user's repos
3. **Document Select** — SUMMARY.md tree with checkboxes
4. **Project Dashboard** — Document table (title, path, Google Doc link, sync status), Push/Pull buttons, sync log history, PR links
 
React Router v6, TanStack Query for data fetching, ErrorBoundary on every route.
 
---
 
## GitBook HTML Element Registry (`shared/src/gitbook-elements.ts`)
 
Each entry: `name`, `detect` regex, `extractForDoc()` (returns placeholder text + metadata JSON), `restoreFromDoc()` (returns original HTML).
 
| Element | Pattern |
|---------|---------|
| card-table | `<table data-view="cards">` |
| colour-mark | `<mark style="color:...">` |
| figure-image | `<figure><img ...>` |
| button-link | `<a class="button ...">` |
| aligned-div | `<div align="...">` |
| liquid-include | `{% include "..." %}` |
 
---
 
## Implementation Phases
 
### Phase 1: Scaffolding & Auth
- Monorepo setup (npm workspaces, tsconfig, ESLint)
- Express server with health route
- Drizzle schema + migrations
- GitHub OAuth + Google OAuth (offline, refresh tokens)
- Session management (express-session + SQLite store)
- Token encryption utility
- React client with Vite, routing, Login page
- Docker Compose (server + client + nginx)
 
### Phase 2: Repo Browsing & SUMMARY.md
- GitHub service (list repos, get file contents via Octokit)
- SUMMARY.md parser → `SummaryEntry[]`
- Repo selection page
- Document selection page with tree component
- Project CRUD endpoints
 
### Phase 3: Push Pipeline
- GitBook HTML element registry
- Google Docs/Drive service (create doc, upload image, add comment)
- `markdown-to-gdoc.ts`: preprocess → upload → annotate
- Sync orchestrator (push flow)
- Dashboard with push button, document table, status badges
 
### Phase 4: Pull Pipeline
- Google Docs structural walker → markdown
- GitBook element restoration from comments
- GitHub service: create branch, commit files (Git Trees API), create PR
- Sync orchestrator (pull flow)
- Dashboard: pull button, PR links, sync log
- Round-trip fidelity tests
 
### Phase 5: Polish
- Error boundaries on all routes
- Loading/error states in UI
- Rate limiting
- British English copy audit
- Docker multi-stage builds, no root in containers
- README with setup instructions
 
---
 
## Key Dependencies
 
**Server**: `express`, `passport`, `passport-github2`, `passport-google-oauth20`, `express-session`, `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `googleapis`, `@octokit/rest`, `unified`, `remark-parse`, `zod`, `pino`
 
**Client**: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `vite`
 
---
 
## Verification
 
1. **Unit tests** (vitest): SUMMARY.md parser, GitBook HTML extraction/restoration
2. **Integration tests**: Push pipeline with sample GitBook markdown (all element types), pull pipeline with mock Google Doc response
3. **Round-trip test**: Push then immediately pull, assert output matches input
4. **Manual E2E**: Sign in → select example repo → push docs → edit in Google Docs → pull → verify PR contains correct changes
 
---
 
## Risks
 
| Risk | Mitigation |
|------|-----------|
| Drive markdown upload is lossy | Pre-strip GitBook HTML; fall back to full Docs API batchUpdate |
| Comment API limits | Use bookmarks/named ranges as alternative |
| Token expiry during sync | Proactive refresh before each API call |
| Merge conflicts on pull | Always branch + PR; user resolves conflicts |