# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
cd cloudflare-edge-backend
npm install
```

### 2. Set Up Cloudflare Resources

#### Create D1 Database
```bash
wrangler d1 create edge_backend_db
```

Copy the `database_id` from the output and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "edge_backend_db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Update this
```

#### Create KV Namespaces
```bash
wrangler kv:namespace create "KV_SESSIONS"
wrangler kv:namespace create "KV_TOKENS"
```

Update `wrangler.toml` with the IDs from the output:
```toml
[[kv_namespaces]]
binding = "KV_SESSIONS"
id = "YOUR_KV_SESSIONS_ID_HERE"  # ← Update this

[[kv_namespaces]]
binding = "KV_TOKENS"
id = "YOUR_KV_TOKENS_ID_HERE"  # ← Update this
```

### 3. Run Database Migrations
```bash
npm run db:migrate
```

### 4. Set Secrets

#### Generate Encryption Key
```bash
# Generate a random base64 key (or use this example for testing)
# Example: openssl rand -base64 32
wrangler secret put ENCRYPTION_KEY
# Paste your base64 key when prompted
```

#### Set JWT Secret
```bash
wrangler secret put JWT_SECRET
# Enter a strong secret (e.g., a random string)
```

### 5. Update Configuration

Edit `wrangler.toml` and update the vars:
```toml
[vars]
FRONTEND_URL = "http://localhost:3000"  # Your frontend URL
API_BASE_URL = "https://your-worker.workers.dev"  # Will be your worker URL after first deploy
```

### 6. Deploy
```bash
npm run deploy
```

After deployment, note your worker URL (e.g., `https://cloudflare-edge-backend.your-subdomain.workers.dev`) and update `API_BASE_URL` in `wrangler.toml` with this URL, then redeploy.

### 7. Test the Deployment

```bash
# Health check
curl https://your-worker.workers.dev/health

# Expected response:
# {"status":"healthy","timestamp":"2026-02-16T...","service":"cloudflare-edge-backend"}
```

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🔧 Local Development

```bash
# Start local dev server
npm run dev

# Server will be available at http://localhost:8787
```

## 📝 Creating Your First Deployment

### Step 1: Connect Cloudflare Account

First, create a Cloudflare API token:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Required permissions:
   - Account → Workers Scripts: Edit
   - Account → Workers KV Storage: Edit
   - Zone → Workers Routes: Edit
   - Account / Zone: Read

Then connect via API:
```bash
curl -X POST https://your-worker.workers.dev/api/cloudflare/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_CLOUDFLARE_API_TOKEN"}'
```

### Step 2: List Zones

```bash
curl https://your-worker.workers.dev/api/cloudflare/zones \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 3: Create Deployment

```bash
curl -X POST https://your-worker.workers.dev/api/deployments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "YOUR_ZONE_ID",
    "zoneName": "example.com",
    "siteId": "my-site-1"
  }'
```

### Step 4: Add Variants

```bash
curl -X POST https://your-worker.workers.dev/api/variants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deploymentId": 1,
    "urlPath": "/product/headphones",
    "content": "<html><body><h1>AI-Optimized Content</h1></body></html>"
  }'
```

### Step 5: Test AI Bot Detection

```bash
# Test with AI bot user agent
curl https://example.com/product/headphones \
  -H "User-Agent: GPTBot/1.0"

# Should return the optimized variant with header: x-served-by: AXP
```

## 🔍 Monitoring

### View Analytics

```bash
curl https://your-worker.workers.dev/api/analytics/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### View Summary

```bash
curl "https://your-worker.workers.dev/api/analytics/1/summary?period=24h" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🐛 Troubleshooting

### Issue: "No active Cloudflare connection found"
**Solution:** Make sure you've connected your Cloudflare account via `/api/cloudflare/connect`

### Issue: "Failed to create KV namespace"
**Solution:** Verify your Cloudflare API token has the correct permissions

### Issue: "Deployment not found"
**Solution:** Ensure you're using the correct deployment ID and that it belongs to your user

### Issue: Worker not serving variants
**Solution:** 
1. Check that variants are uploaded to KV
2. Verify the worker route is configured correctly
3. Test with a known AI bot user agent (e.g., `GPTBot/1.0`)

## 📚 Next Steps

- Read the full [README.md](./README.md) for detailed API documentation
- Explore the [implementation plan](../implementation_plan.md)
- Check out the test files in `tests/` for usage examples
- Review security best practices in the README

## 🆘 Need Help?

- Check the logs in Cloudflare dashboard
- Review the D1 database contents
- Inspect KV namespace values
- Open an issue on GitHub
