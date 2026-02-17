# User Integration Guide

This guide explains how to integrate the Cloudflare Edge Delivery system into your product and what your users need to do.

---

## 📖 Overview

The Cloudflare Edge Delivery system allows your users to:
1. Connect their Cloudflare account
2. Deploy edge workers to their domains with one click
3. Create AI-optimized HTML variants
4. Serve optimized content to AI bots automatically

---

## 🎯 User Journey

### Step 1: User Connects Cloudflare Account

**What the user does:**
1. Creates a Cloudflare API token (see [API Token Guide](./CLOUDFLARE_API_TOKEN_GUIDE.md))
2. Pastes the token into your app's "Connect Cloudflare" page

**What happens behind the scenes:**
- Token is verified with Cloudflare API
- Token is encrypted with AES-GCM
- User's account ID is fetched and stored
- Connection status is saved to database

**API Endpoint:** `POST /api/cloudflare/connect`

---

### Step 2: User Selects a Domain

**What the user does:**
1. Sees a list of their Cloudflare zones (domains)
2. Selects which domain to deploy to
3. Provides a unique Site ID (e.g., "my-blog-prod")

**What happens behind the scenes:**
- Zones are fetched from user's Cloudflare account
- User picks from dropdown in your UI

**API Endpoint:** `GET /api/cloudflare/zones`

---

### Step 3: One-Click Deployment

**What the user does:**
1. Clicks "Deploy" button

**What happens automatically:**
1. ✅ Creates KV namespace in user's account (`axp-variants-{siteId}`)
2. ✅ Uploads worker script to user's account (`axp-{siteId}`)
3. ✅ Binds KV namespace to worker
4. ✅ Sets worker secrets (API key, site ID, endpoint)
5. ✅ Adds route to domain (`example.com/*`)
6. ✅ Performs health check
7. ✅ Saves deployment record

**Result:** Worker is LIVE on user's domain in ~10 seconds

**API Endpoint:** `POST /api/deployments`

---

### Step 4: User Creates Variants

**What the user does:**
1. Enters a URL path (e.g., `/pricing`)
2. Pastes optimized HTML content
3. Clicks "Save Variant"

**What happens behind the scenes:**
1. Variant is saved to YOUR database (master copy)
2. Variant is uploaded to USER'S KV namespace
3. Content hash is calculated for change detection

**Result:** AI bots visiting `/pricing` will now see the optimized version

**API Endpoint:** `POST /api/variants`

---

### Step 5: AI Bots Visit the Site

**What happens automatically:**

```
AI Bot (GPTBot) → example.com/pricing
                    ↓
            Worker intercepts request
                    ↓
        Checks User-Agent for AI bot patterns
                    ↓
            Looks up "/pricing" in KV
                    ↓
        Serves optimized HTML (if found)
                    ↓
        Logs analytics back to your backend
```

**Result:** AI bots see optimized content, humans see normal site

---

## 🗄️ Data Storage Architecture

### Your Backend (D1 Database)
```
cloudflare_connections
├─ encrypted_token (AES-GCM encrypted)
├─ account_id
└─ status

deployments
├─ zone_id, zone_name
├─ worker_name
├─ kv_namespace_id
└─ route_id

variants (MASTER COPY)
├─ deployment_id
├─ url_path
├─ content (HTML)
└─ content_hash

api_keys (hashed with SHA-256)
ai_requests (analytics)
```

### User's Cloudflare Account
```
Worker: axp-{siteId}
├─ Routes: example.com/*
├─ Secrets:
│  ├─ CLIENT_API_KEY
│  ├─ SITE_ID
│  └─ API_ENDPOINT
└─ Binding:
   └─ VARIANTS → KV Namespace

KV Namespace: axp-variants-{siteId}
├─ /pricing → <html>optimized content</html>
├─ /about → <html>optimized content</html>
└─ /blog/post-1 → <html>optimized content</html>
```

---

## 🔄 Data Flow

### Creating a Variant
```
User → Your Frontend → Your Backend → User's KV
                           ↓
                      Your D1 Database
```

1. User creates variant in your UI
2. Your backend saves to D1 (master)
3. Your backend uploads to user's KV (edge delivery)

### Serving to AI Bots
```
AI Bot → User's Domain → User's Worker → User's KV
                              ↓
                    Analytics → Your Backend
```

1. AI bot visits user's site
2. Worker detects bot via User-Agent
3. Worker fetches variant from KV
4. Worker serves optimized HTML
5. Worker logs analytics (non-blocking)

---

## 🎨 Frontend Integration

### Required UI Components

1. **Connect Cloudflare Page**
   - Input field for API token (password type)
   - "Connect" button
   - Link to token creation guide
   - Error handling for invalid tokens

2. **Domain Selection Page**
   - Dropdown of user's zones
   - Input for Site ID
   - "Deploy" button
   - Loading state during deployment

3. **Deployment Dashboard**
   - List of active deployments
   - Status indicators (active/inactive)
   - Links to deployed sites
   - "Manage Variants" button per deployment

4. **Variant Manager**
   - URL path input
   - HTML content textarea/editor
   - "Save Variant" button
   - List of existing variants
   - Edit/Delete actions

### Example React Component (Simplified)

```tsx
function ConnectCloudflare() {
  const [token, setToken] = useState('');
  
  const handleConnect = async () => {
    const res = await fetch('/api/cloudflare/connect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userJWT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    
    if (res.ok) {
      // Show success, redirect to deployment page
    }
  };
  
  return (
    <div>
      <input 
        type="password" 
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste Cloudflare API token..."
      />
      <button onClick={handleConnect}>Connect</button>
      <a href="/docs/api-token-guide">How to create a token</a>
    </div>
  );
}
```

---

## 🔐 Security Considerations

### Token Storage
- ✅ Tokens are encrypted with AES-GCM before storage
- ✅ Encryption key is stored as Cloudflare Worker secret
- ✅ Never logged or exposed in API responses

### API Key Generation
- ✅ Client API keys are generated with crypto.getRandomValues()
- ✅ Keys are hashed with SHA-256 before storage
- ✅ Only the hash is stored in database

### Rate Limiting
- ✅ Strict limits on `/api/cloudflare/connect` (5 req/hour)
- ✅ Standard limits on other endpoints (100 req/hour)

### CORS
- ⚠️ Currently allows all origins for development
- 🔒 **IMPORTANT**: Restrict to your frontend URL in production

---

## 📊 Analytics

Users can view analytics for their deployments:

```
GET /api/analytics/:deploymentId
```

**Response:**
```json
{
  "totalRequests": 1000,
  "variantsServed": 750,
  "botTypes": {
    "GPTBot": 400,
    "ClaudeBot": 300,
    "PerplexityBot": 50
  },
  "topPaths": [
    { "path": "/pricing", "count": 200 },
    { "path": "/about", "count": 150 }
  ]
}
```

---

## 🤖 Detected AI Bots

The system automatically detects these AI bots:

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
- anthropic-ai

---

## 🚀 Deployment Checklist for Your Product

### Before Launch
- [ ] Set up D1 database
- [ ] Create KV namespaces
- [ ] Set encryption key secret
- [ ] Set JWT secret
- [ ] Deploy backend to Cloudflare Workers
- [ ] Update `API_BASE_URL` in wrangler.toml
- [ ] Restrict CORS to your frontend URL
- [ ] Implement user authentication (JWT)
- [ ] Build frontend UI components
- [ ] Add API token guide to your docs
- [ ] Set up error monitoring
- [ ] Configure analytics dashboard

### User Onboarding
- [ ] Guide users to create API token
- [ ] Explain what permissions are needed
- [ ] Show deployment status in real-time
- [ ] Provide example HTML variants
- [ ] Display analytics clearly
- [ ] Offer support for common issues

---

## 💡 Best Practices

### For Your Product
1. **Validate inputs** before sending to API
2. **Show loading states** during deployments (can take 5-10 seconds)
3. **Handle errors gracefully** with user-friendly messages
4. **Cache zone lists** to reduce API calls
5. **Provide examples** of optimized HTML variants
6. **Monitor deployment health** and alert users to issues

### For Your Users
1. **Start with one domain** to test the system
2. **Create variants for high-traffic pages** first
3. **Test with AI bot user agents** before going live
4. **Monitor analytics** to see which bots visit
5. **Update variants regularly** based on performance
6. **Use descriptive Site IDs** for easy identification

---

## 🆘 Common User Issues

### "Invalid API token"
**Cause:** Token copied incorrectly or expired  
**Solution:** Create new token following the guide

### "Deployment failed"
**Cause:** Insufficient permissions or Cloudflare API error  
**Solution:** Verify token permissions, check Cloudflare status

### "Variant not serving"
**Cause:** URL path mismatch or worker not deployed  
**Solution:** Check exact URL path, verify worker is active

### "Analytics not showing"
**Cause:** No AI bot traffic yet  
**Solution:** Test with AI bot user agent, wait for real traffic

---

## 📚 Additional Resources

- [Cloudflare API Token Guide](./CLOUDFLARE_API_TOKEN_GUIDE.md) - Detailed token creation instructions
- [API Token Quick Reference](./API_TOKEN_QUICK_REFERENCE.md) - Quick checklist for users
- [Main README](../README.md) - Complete technical documentation
- [Quick Start Guide](../QUICKSTART.md) - Setup instructions
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md) - Production deployment steps

---

## 🎉 Success Metrics

Your users will see:
- ✅ Workers deployed in ~10 seconds
- ✅ AI bots receiving optimized content
- ✅ Analytics showing bot traffic
- ✅ Zero impact on human visitors
- ✅ Global edge delivery (sub-millisecond latency)

---

**Need help integrating?** Review the example frontend in `cloudflare-edge-frontend/` for a complete reference implementation.
