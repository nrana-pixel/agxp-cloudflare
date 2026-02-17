# Cloudflare Edge Integration for AI-Optimized Variants

A production-grade Cloudflare Workers backend built with Hono that enables users to deploy AI-optimized HTML variants to their own Cloudflare accounts. The system detects AI bots via User-Agent and serves optimized content from Cloudflare KV storage.

## Features

- 🔐 **Secure API Token Management** - AES-GCM encryption for Cloudflare API tokens
- 🤖 **AI Bot Detection** - Detects 15+ AI crawlers (GPTBot, ClaudeBot, Perplexity, etc.)
- ⚡ **Edge Deployment** - Automatically deploys workers to client Cloudflare accounts
- 📊 **Analytics** - Real-time tracking of AI bot requests and variant serving
- 🔄 **Automatic Sync** - Variants automatically sync to Cloudflare KV
- 🛡️ **Security First** - Rate limiting, JWT auth, API key hashing

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Our Backend (Hono)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth   │  │Deployment│  │ Variants │  │Analytics │  │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│         │              │              │              │      │
│         └──────────────┴──────────────┴──────────────┘      │
│                        │                                     │
│                   ┌────▼────┐                               │
│                   │ D1 DB   │                               │
│                   └─────────┘                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Cloudflare API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Client's Cloudflare Account                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Client Worker   │◄────────┤   KV Namespace   │         │
│  │  (AI Detection)  │         │   (Variants)     │         │
│  └────────┬─────────┘         └──────────────────┘         │
│           │                                                  │
│           │ Routes: example.com/*                           │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │   Origin Site    │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest

## Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

## Setup

### 1. Install Dependencies

```bash
cd cloudflare-edge-backend
npm install
```

### 2. Create D1 Database

```bash
# Create the database
wrangler d1 create edge_backend_db

# Note the database_id from the output and update wrangler.toml
```

### 3. Create KV Namespaces

```bash
# Create KV namespaces
wrangler kv:namespace create "KV_SESSIONS"
wrangler kv:namespace create "KV_TOKENS"

# Note the IDs and update wrangler.toml
```

### 4. Run Migrations

```bash
# Apply the database schema
npm run db:migrate
```

### 5. Set Secrets

You can either run the helper script (recommended) or set each secret manually.

```bash
# Sync everything from .dev.vars into wrangler secrets
cd cloudflare-edge-backend
npm run env:sync
```

Manual fallback:
```bash
wrangler secret put ENCRYPTION_KEY
wrangler secret put JWT_SECRET
wrangler secret put FIRECRAWL_API_KEY
wrangler secret put GEMINI_API_KEY
```

### 6. Update wrangler.toml

Update the following in `wrangler.toml`:
- `database_id` for D1
- `id` for both KV namespaces
- `FRONTEND_URL` and `API_BASE_URL` in vars

## Development

```bash
# Start local development server
npm run dev

# The server will be available at http://localhost:8787
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## API Endpoints

### Authentication

#### POST /api/cloudflare/connect
Connect a Cloudflare account via API token.

**Request:**
```json
{
  "token": "your-cloudflare-api-token"
}
```

**Response:**
```json
{
  "success": true,
  "accountId": "abc123..."
}
```

#### GET /api/cloudflare/zones
List all zones (domains) for the connected account.

**Response:**
```json
{
  "zones": [
    {
      "id": "zone123",
      "name": "example.com",
      "status": "active"
    }
  ]
}
```

#### DELETE /api/cloudflare/disconnect
Disconnect the Cloudflare account.

### Deployments

#### POST /api/deployments
Deploy a worker to a zone.

**Request:**
```json
{
  "zoneId": "zone123",
  "zoneName": "example.com",
  "siteId": "site-unique-id"
}
```

**Response:**
```json
{
  "success": true,
  "deploymentId": 1,
  "workerName": "axp-site-unique-id",
  "kvNamespaceId": "kv123"
}
```

#### GET /api/deployments
List all deployments for the authenticated user.

#### DELETE /api/deployments/:id
Delete a deployment and clean up resources.

#### PUT /api/deployments/:id/variants
Resync all variants to KV for a deployment.

### Variants

#### POST /api/variants
Create a new variant and sync to KV.

**Request:**
```json
{
  "deploymentId": 1,
  "urlPath": "/product/headphones",
  "content": "<html>...</html>"
}
```

#### PUT /api/variants/:id
Update a variant and sync to KV.

#### DELETE /api/variants/:id
Delete a variant from DB and KV.

#### POST /api/variants/auto-generate
Crawl a live URL, optimize it with Gemini, and store as a variant.

**Request:**
```json
{
  "deploymentId": 1,
  "urlPath": "/pricing",
  "sourceUrl": "https://example.com/pricing",
  "instructions": "Highlight enterprise features and remove human testimonials"
}
```

**Environment requirements:**
- `FIRECRAWL_API_KEY`
- `GEMINI_API_KEY` (Gemini 2.5 Flash)

#### GET /api/variants?deploymentId=1
List all variants for a deployment.

### Analytics

#### POST /v1/analytics/log
Log an analytics event (called by client workers).

**Headers:**
- `Authorization: Bearer {CLIENT_API_KEY}`
- `X-SITE-ID: {SITE_ID}`

**Request:**
```json
{
  "path": "/product/headphones",
  "userAgent": "GPTBot/1.0",
  "botType": "GPTBot",
  "variantServed": true,
  "timestamp": "2026-02-16T10:00:00Z"
}
```

#### GET /api/analytics/:deploymentId
Get aggregated analytics for a deployment.

**Response:**
```json
{
  "totalRequests": 1000,
  "variantsServed": 750,
  "botTypes": {
    "GPTBot": 400,
    "ClaudeBot": 350
  },
  "topPaths": [
    { "path": "/product/headphones", "count": 200 }
  ]
}
```

#### GET /api/analytics/:deploymentId/summary?period=24h
Get summary analytics for a specific period (24h or 7d).

## Database Schema

See `migrations/0001_initial_schema.sql` for the complete schema.

**Tables:**
- `users` - User accounts
- `cloudflare_connections` - Encrypted Cloudflare API tokens
- `deployments` - Worker deployments
- `variants` - HTML variants
- `api_keys` - Hashed API keys for analytics
- `ai_requests` - Analytics events

## Security

### Token Encryption
All Cloudflare API tokens are encrypted using AES-GCM with a 256-bit key before storage. The encryption key is stored as a Cloudflare Worker secret.

### API Key Hashing
Client API keys are hashed using SHA-256 before storage. Only the hash is stored in the database.

### Rate Limiting
- Strict rate limiting (5 req/hour) on `/api/cloudflare/connect`
- Standard rate limiting (100 req/hour) on other authenticated endpoints

### Authentication
- JWT-based authentication for user endpoints
- API key authentication for analytics logging

## Client Worker

The client worker deployed to user accounts:

1. **Detects AI bots** via User-Agent patterns
2. **Serves variants** from KV if available
3. **Falls back to origin** if no variant exists
4. **Logs analytics** back to our backend (non-blocking)
5. **Passes through** all human traffic unchanged

### Detected AI Bots

- GPTBot (OpenAI)
- ChatGPT-User
- ClaudeBot (Anthropic)
- Claude-Web
- Google-Extended
- GoogleOther
- PerplexityBot
- Applebot-Extended
- YouBot
- Bytespider
- cohere-ai
- Meta-ExternalAgent
- OAI-SearchBot

## Environment Variables

- `.env` → non-secret vars used by both dev server and deployed Worker
- `.dev.vars` → local-only secrets automatically loaded by `wrangler dev`
- `npm run env:sync` → pushes secrets to Wrangler before deployment

See `.env.example` for required environment variables and [Environment Management Guide](./docs/ENVIRONMENT_MANAGEMENT.md) for details.

## 📚 Documentation

### For Users
- **[Cloudflare API Token Guide](./docs/CLOUDFLARE_API_TOKEN_GUIDE.md)** - Complete guide on creating the correct API token with required permissions
- **[API Token Quick Reference](./docs/API_TOKEN_QUICK_REFERENCE.md)** - Quick checklist for users (can be embedded in your UI)
- **[User Integration Guide](./docs/USER_INTEGRATION_GUIDE.md)** - Complete user journey and integration instructions for your product

### For Developers
- **[Quick Start Guide](./QUICKSTART.md)** - Get started in 5 minutes
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Production deployment steps
- **[Project Summary](./PROJECT_SUMMARY.md)** - Implementation overview
- **[Final Notes](./FINAL_NOTES.md)** - Architecture and design decisions

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
