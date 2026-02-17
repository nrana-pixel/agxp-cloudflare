# Deployment Checklist

Use this checklist to deploy the Cloudflare Edge Backend to production.

## Pre-Deployment

### 1. Cloudflare Account Setup
- [ ] Have a Cloudflare account with Workers enabled
- [ ] Install Wrangler CLI: `npm install -g wrangler`
- [ ] Authenticate Wrangler: `wrangler login`

### 2. Create Resources

#### D1 Database
```bash
wrangler d1 create edge_backend_db
```
- [ ] Copy `database_id` from output
- [ ] Update `wrangler.toml` with database_id

#### KV Namespaces
```bash
wrangler kv:namespace create "KV_SESSIONS"
wrangler kv:namespace create "KV_TOKENS"
```
- [ ] Copy both namespace IDs from output
- [ ] Update `wrangler.toml` with KV namespace IDs

### 3. Configure Secrets

#### Generate Encryption Key
```bash
# Option 1: Use openssl (recommended)
openssl rand -base64 32

# Option 2: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
- [ ] Generate 256-bit encryption key
- [ ] Set secret: `wrangler secret put ENCRYPTION_KEY`

#### Set JWT Secret
```bash
# Generate a strong random secret
openssl rand -base64 64
```
- [ ] Generate JWT secret
- [ ] Set secret: `wrangler secret put JWT_SECRET`

### 4. Update Configuration

Edit `wrangler.toml`:
- [ ] Update `database_id` in `[[d1_databases]]`
- [ ] Update `id` in both `[[kv_namespaces]]` sections
- [ ] Update `FRONTEND_URL` in `[vars]` (your frontend URL)
- [ ] Keep `API_BASE_URL` as placeholder for now

## Deployment

### 5. Run Database Migrations
```bash
npm run db:migrate
```
- [ ] Verify migration completed successfully
- [ ] Check D1 dashboard to confirm tables exist

### 6. First Deployment
```bash
npm run deploy
```
- [ ] Note the deployed worker URL (e.g., `https://cloudflare-edge-backend.your-subdomain.workers.dev`)
- [ ] Save this URL for next step

### 7. Update API_BASE_URL
- [ ] Edit `wrangler.toml`
- [ ] Set `API_BASE_URL` to your worker URL from step 6
- [ ] Redeploy: `npm run deploy`

## Post-Deployment

### 8. Verify Deployment

#### Health Check
```bash
curl https://your-worker.workers.dev/health
```
Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-16T...",
  "service": "cloudflare-edge-backend"
}
```
- [ ] Health check returns 200 OK
- [ ] Response contains correct service name

#### Check Logs
```bash
wrangler tail
```
- [ ] Monitor logs for any errors
- [ ] Verify no startup errors

### 9. Test Core Functionality

#### Test Database Connection
- [ ] Go to Cloudflare dashboard → D1
- [ ] Verify `edge_backend_db` exists
- [ ] Run a test query: `SELECT * FROM users LIMIT 1;`

#### Test KV Namespaces
- [ ] Go to Cloudflare dashboard → KV
- [ ] Verify both namespaces exist
- [ ] Check they're bound to the worker

### 10. Security Verification

- [ ] Secrets are set (not in wrangler.toml)
- [ ] No plaintext tokens in code
- [ ] CORS configured for production frontend only
- [ ] Rate limiting is enabled
- [ ] JWT authentication is working

## Production Configuration

### 11. Update CORS Settings

Edit `src/index.ts`:
```typescript
app.use('/*', cors({
  origin: process.env.FRONTEND_URL, // Only allow your frontend
  // ... rest of config
}));
```
- [ ] Update CORS to only allow production frontend
- [ ] Redeploy after changes

### 12. Set Up Monitoring

- [ ] Enable Cloudflare Workers Analytics
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure alerts for high error rates
- [ ] Set up uptime monitoring

### 13. Custom Domain (Optional)

```bash
wrangler publish --routes="api.yourdomain.com/*"
```
- [ ] Add custom domain in Cloudflare dashboard
- [ ] Update DNS records
- [ ] Update `API_BASE_URL` in wrangler.toml
- [ ] Update frontend to use custom domain

## Testing in Production

### 14. End-to-End Test

#### Create Test User
- [ ] Implement user registration endpoint (not included in base implementation)
- [ ] Create a test user account
- [ ] Get JWT token for test user

#### Test Cloudflare Connection
```bash
curl -X POST https://your-worker.workers.dev/api/cloudflare/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_CF_API_TOKEN"}'
```
- [ ] Connection succeeds
- [ ] Token is encrypted in database

#### Test Zone Listing
```bash
curl https://your-worker.workers.dev/api/cloudflare/zones \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Zones are returned
- [ ] Response is properly formatted

#### Test Deployment Creation
```bash
curl -X POST https://your-worker.workers.dev/api/deployments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "YOUR_ZONE_ID",
    "zoneName": "test.example.com",
    "siteId": "test-site-1"
  }'
```
- [ ] Deployment succeeds
- [ ] Worker is deployed to client account
- [ ] KV namespace is created
- [ ] Route is configured

#### Test Variant Creation
```bash
curl -X POST https://your-worker.workers.dev/api/variants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deploymentId": 1,
    "urlPath": "/test",
    "content": "<html><body><h1>Test Variant</h1></body></html>"
  }'
```
- [ ] Variant is created
- [ ] Variant is uploaded to KV

#### Test AI Bot Detection
```bash
curl https://test.example.com/test \
  -H "User-Agent: GPTBot/1.0"
```
- [ ] Variant is served
- [ ] Response has `x-served-by: AXP` header
- [ ] Analytics event is logged

#### Test Analytics
```bash
curl https://your-worker.workers.dev/api/analytics/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Analytics data is returned
- [ ] Bot types are aggregated
- [ ] Top paths are listed

## Maintenance

### 15. Regular Tasks

- [ ] Monitor error rates daily
- [ ] Check D1 database size weekly
- [ ] Review analytics monthly
- [ ] Update dependencies quarterly
- [ ] Rotate secrets annually

### 16. Backup Strategy

- [ ] Export D1 database regularly
- [ ] Document KV namespace structure
- [ ] Keep wrangler.toml in version control
- [ ] Document all secrets (not values, just what they are)

## Rollback Plan

### If Something Goes Wrong

1. **Rollback Deployment**
   ```bash
   wrangler rollback
   ```

2. **Check Logs**
   ```bash
   wrangler tail
   ```

3. **Verify Database**
   - Check D1 dashboard
   - Run diagnostic queries

4. **Restore from Backup**
   - Import D1 backup if needed
   - Restore KV data if needed

## Success Criteria

- [ ] All health checks pass
- [ ] End-to-end test completes successfully
- [ ] No errors in logs
- [ ] Analytics are being recorded
- [ ] Client workers are serving variants
- [ ] Rate limiting is working
- [ ] Authentication is secure
- [ ] CORS is properly configured

## Notes

- Worker URL: `_______________________________`
- D1 Database ID: `_______________________________`
- KV Sessions ID: `_______________________________`
- KV Tokens ID: `_______________________________`
- Deployment Date: `_______________________________`
- Deployed By: `_______________________________`

---

**Congratulations! 🎉**

Your Cloudflare Edge Backend is now deployed and ready to serve AI-optimized variants at the edge!
