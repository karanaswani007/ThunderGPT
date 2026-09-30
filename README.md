# ThunderGPT

**AI That Works at Your Speed**  
Developed by [HK SoftTech](https://hksofttech.vercel.app)

ThunderGPT is a production AI assistant: streaming chat, conversation history, multimodal files, image generation, optional web search, and a controlled product identity.

## Features

- Streaming chat with markdown, code, tables, and math
- Multiple conversations, search, rename, delete, auto titles
- Edit, resend, regenerate, copy, stop generation
- File understanding: images, PDF, TXT, MD, CSV, DOCX
- Image generation and a private gallery
- Model selector with Auto routing
- Google, X, and email/password sign-in
- Guest chat (rate-limited) with local history
- Dark / light / system appearance
- Embeddable surface at `/embed` for the HK SoftTech site

## Architecture

```
Browser
  → ThunderGPT API (`/api/chat`, `/api/images`, `/api/models`)
    → ThunderGPT AI provider layer
      → Gemini (primary, when `GEMINI_API_KEY` is set)
      → xAI Grok (fallback, when `XAI_API_KEY` is set)
```

API keys never leave the server.

This app runs on **TanStack Start + React + Tailwind + Postgres** so it can be previewed and deployed on this platform. Product boundaries stay portable: AI providers, search, storage, and the chat API are isolated modules. A future Next.js/Supabase port can reuse those layers.

## Tech stack

- React 19, TanStack Start / Router / Query
- TypeScript, Tailwind CSS v4, Radix UI
- Postgres (Neon in production, embedded PGLite in preview)
- Better Auth (Google, X, email/password)
- Gemini API and/or xAI API

## Project structure

```
src/routes/          pages + API handlers
src/components/      UI, chat, app shell
src/lib/ai/          providers, models, identity, errors
src/lib/chat/        streaming + persistence
src/lib/validation/  request and file checks
src/lib/search/      search-provider seam
migrations/          Postgres schema
```

## Environment

Do not commit secrets. Configure these on the host (Vercel / platform):

| Variable | Where | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | server | Primary AI engine |
| `XAI_API_KEY` | server | Fallback AI engine |
| `GEMINI_MODEL_FAST` / `_GENERAL` / `_REASONING` / `_VISION` / `_IMAGE` | server | Override Gemini model IDs |
| `XAI_MODEL_FAST` / `_GENERAL` / `_REASONING` / `_VISION` / `_IMAGE` | server | Override xAI model IDs |
| `DATABASE_URL` | server | Postgres (injected on deploy) |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | server | Session signing secret and public auth origin |
| `GROK_AUTH_ISSUER` / `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET` | server | Deployed OAuth broker configuration |
| `GROK_PREVIEW_AUTH_ISSUER` / `GROK_PREVIEW_CLIENT_ID` / `GROK_PREVIEW_CLIENT_SECRET` | server | Optional live-preview OAuth client; configure outside source control |
| `GROK_PREVIEW_ALLOWED_HOSTS` | server | Comma-separated preview callback host patterns |
| `GROK_GATE_ORIGIN` / `GROK_PROJECT_ID` | server | Gate identity verification configuration |
| `GROK_CONNECTORS_URL` / `GROK_CONNECTOR_ACCESS_TOKEN` | server | Optional connector integration |
| `VITE_AUTH_ENABLED` / `VITE_PUBLIC_HOSTNAME` / `VITE_STUN_URLS` | public | Client-safe feature, hostname, and STUN settings |

`.env.example` lists these settings with placeholders only. Do not commit populated environment files; configure real credentials through a secret manager or the deployment platform.

## Local development

```bash
npm install
npm run dev
```

The app listens on port 8080. With no `DATABASE_URL`, Postgres runs in-process. With no `GEMINI_API_KEY`, ThunderGPT uses xAI when that key is present.

```bash
npm run typecheck
npm test
npm run build
```

## Supabase / Gemini / auth setup

1. Create a Google AI Studio key and set `GEMINI_API_KEY`.
2. On Vercel, the platform provisions Postgres as `DATABASE_URL`.
3. Sign-in uses this app’s Better Auth:
   - Google and X through the platform broker
   - Email/password stored in the app database
4. Apply `migrations/0001_auth.sql` and `migrations/0002_thundergpt.sql` (automatic on preview start and on `npm run build`).
5. File bytes live in Postgres for this release. Swap `src/lib/files/` to object storage later if you outgrow that.

Password-reset email sending requires an email provider on the auth server. Until that is wired, users can reset via Google/X or a new email account.

## Vercel

The project is Vercel-compatible (`vercel.json` + Nitro preset).

1. Set the environment variables above.
2. Deploy. `npm run build` applies migrations.
3. Point a domain at the deployment.
4. Smoke-check: landing, sign-in, a chat, a file upload, and an image (if the configured model supports it).

## HK SoftTech integration

- **Iframe:** `/embed` is a chrome-light chat surface.
- **API:** `POST /api/chat` (SSE) and `GET /api/models`.
- **Identity:** ThunderGPT is the HK SoftTech product. Google Gemini / xAI Grok are engines, not the product.

## Troubleshooting

- **“AI engine is not configured”** — set `GEMINI_API_KEY` or `XAI_API_KEY`.
- **Image generation fails** — the configured image model may be unavailable on the current API tier; chat still works.
- **File rejected** — only images, PDF, TXT/MD, CSV, and DOCX, with size limits.
- **Guest rate limit** — sign in for the full allowance.

ThunderGPT is developed by HK SoftTech.  
https://hksofttech.vercel.app
