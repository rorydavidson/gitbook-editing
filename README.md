# GitBook Editing

A web app that converts GitBook markdown documents stored in GitHub repositories into Google Docs for collaborative editing, then syncs changes back to the repo as a pull request.

Designed for teams where non-technical collaborators need to edit GitBook content without learning markdown or Git.

## How it works

1. Sign in with GitHub and connect your Google account
2. Select a GitHub repository that contains a GitBook `SUMMARY.md`
3. Choose which documents to work on
4. **Push** — documents are uploaded to Google Drive as Google Docs; GitBook-specific HTML (card tables, coloured marks, includes, etc.) is preserved via Docs comments
5. Collaborators edit in Google Docs
6. **Pull** — changes are read back from Google Docs, GitBook HTML is restored, and a pull request is opened against the original repo

## Requirements

- Node.js 20+
- A GitHub OAuth App
- A Google Cloud project with the Drive and Docs APIs enabled

## Setup

### 1. Create a GitHub OAuth App

Go to [GitHub Developer Settings](https://github.com/settings/developers) and create a new OAuth App with:

- **Homepage URL:** `http://localhost:5173` (or your production URL)
- **Authorisation callback URL:** `http://localhost:3001/auth/github/callback`

### 2. Create a Google OAuth App

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Create an OAuth 2.0 Client ID (Web application)
2. Add `http://localhost:3001/auth/google/callback` as an authorised redirect URI
3. Enable the **Google Drive API** and **Google Docs API** for your project

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the values. Generate the secret keys with:

```bash
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# TOKEN_ENCRYPTION_KEY (must be 64 hex chars / 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run in development

```bash
npm install
npm run dev:server   # API server on http://localhost:3001
npm run dev:client   # React client on http://localhost:5173
```

### 5. Run with Docker

```bash
docker compose up --build
```

The app will be available on `http://localhost` (port 80). The SQLite database is persisted in a named Docker volume.

## Running tests

```bash
npm test
```

Covers the `SUMMARY.md` parser and GitBook element extraction/restoration round-trips.

## Project structure

```
gitbook-editing/
  shared/      # Shared TypeScript types and the GitBook element registry
  server/      # Express API server
  client/      # React frontend (Vite)
```

## GitBook element support

The following GitBook-specific elements survive the round-trip through Google Docs:

| Element | Example |
|---------|---------|
| Card table | `<table data-view="cards">` |
| Colour mark | `<mark style="color:#...">` |
| Figure image | `<figure><img ...>` |
| Button link | `<a class="button ...">` |
| Aligned div | `<div align="...">` |
| Liquid include | `{% include "..." %}` |

Standard markdown (headings, lists, bold, italic, links, code blocks) is handled by Google Docs' built-in markdown import and the Docs API walker.
