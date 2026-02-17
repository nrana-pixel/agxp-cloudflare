# Environment Management Guide

This backend runs inside Cloudflare Workers. Secrets and plain vars are supplied through
Wrangler bindings, so we use two files to keep life simple:

- `.dev.vars`: development-only values automatically loaded by `wrangler dev`
- `.env`: front-end only values (CORS origin, API base URL) that also mirror the Worker vars

## One-command secret sync

Use the helper script to push everything in `.dev.vars` to Wrangler secrets.

```bash
cd cloudflare-edge-backend
npm run env:sync
```

Behind the scenes this runs `scripts/setup-env.ts`, which reads `.dev.vars` and calls `wrangler secret put` for:

- `ENCRYPTION_KEY`
- `JWT_SECRET`
- `FIRECRAWL_API_KEY`
- `GEMINI_API_KEY`

If a value is missing in `.dev.vars`, the script skips it.

## Local development

1. Copy `.env.example` to `.env` and update `FRONTEND_URL`/`API_BASE_URL` if needed.
2. Put all required secrets into `.dev.vars`.
3. Run `npm run dev` from `cloudflare-edge-backend`. Wrangler automatically loads `.dev.vars` so `c.env` contains every key.

## Deployment

Whenever you update `.dev.vars` locally, rerun `npm run env:sync` before deploying so Wrangler's persisted secrets match your file. Then run `npm run deploy`.
