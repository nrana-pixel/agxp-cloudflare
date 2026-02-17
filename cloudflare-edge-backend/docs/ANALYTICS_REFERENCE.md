# Backend Analytics - Complete Reference

## 📊 What Analytics Does the Backend Provide?

The backend provides **3 analytics endpoints** with comprehensive AI bot tracking data.

---

## 🎯 Endpoint 1: Full Analytics

### `GET /api/analytics/:deploymentId`

Returns complete analytics for a deployment (all-time data).

### Request
```bash
GET /api/analytics/1
Authorization: Bearer <JWT>
```

### Response
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
    { "path": "/about", "count": 150 },
    { "path": "/blog/post-1", "count": 100 }
  ]
}
```

### Data Included
- ✅ **totalRequests** - Total AI bot visits (all time)
- ✅ **variantsServed** - How many times optimized HTML was served
- ✅ **botTypes** - Breakdown by bot type (GPTBot, ClaudeBot, etc.)
- ✅ **topPaths** - Top 10 most visited paths with counts

---

## 📅 Endpoint 2: Time-Based Summary

### `GET /api/analytics/:deploymentId/summary?period=24h`

Returns analytics for a specific time period.

### Request
```bash
# Last 24 hours
GET /api/analytics/1/summary?period=24h
Authorization: Bearer <JWT>

# Last 7 days
GET /api/analytics/1/summary?period=7d
Authorization: Bearer <JWT>
```

### Response (24h)
```json
{
  "requests24h": 150,
  "variantsServed24h": 120,
  "requests7d": 0,
  "variantsServed7d": 0
}
```

### Response (7d)
```json
{
  "requests24h": 0,
  "variantsServed24h": 0,
  "requests7d": 1000,
  "variantsServed7d": 800
}
```

### Data Included
- ✅ **requests24h** - Total requests in last 24 hours
- ✅ **variantsServed24h** - Variants served in last 24 hours
- ✅ **requests7d** - Total requests in last 7 days
- ✅ **variantsServed7d** - Variants served in last 7 days

---

## 📝 Endpoint 3: Log Analytics Event

### `POST /v1/analytics/log`

Used by **client workers** to log analytics events (not for frontend).

### Request
```bash
POST /v1/analytics/log
Authorization: Bearer <CLIENT_API_KEY>
X-SITE-ID: site-123
Content-Type: application/json

{
  "path": "/pricing",
  "userAgent": "GPTBot/1.0",
  "botType": "GPTBot",
  "variantServed": true,
  "timestamp": "2026-02-16T10:00:00Z"
}
```

### Response
```json
{
  "success": true
}
```

---

## 🗄️ Database Schema

Analytics are stored in the `ai_requests` table:

```sql
CREATE TABLE ai_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    user_agent TEXT,
    bot_type TEXT,
    url_path TEXT,
    variant_served INTEGER DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
);
```

### Tracked Data Per Request
- `deployment_id` - Which deployment
- `timestamp` - When the bot visited
- `user_agent` - Full user agent string
- `bot_type` - Detected bot (GPTBot, ClaudeBot, etc.)
- `url_path` - Which page was visited
- `variant_served` - Was optimized HTML served? (1 = yes, 0 = no)
- `response_time_ms` - Response time (currently 0, can be enhanced)

---

## 🤖 Detected Bot Types

The system tracks these AI bots:

| Bot Type | Company | Example User-Agent |
|----------|---------|-------------------|
| GPTBot | OpenAI | `GPTBot/1.0` |
| ChatGPT-User | OpenAI | `ChatGPT-User/1.0` |
| ClaudeBot | Anthropic | `ClaudeBot/1.0` |
| Claude-Web | Anthropic | `Claude-Web/1.0` |
| Google-Extended | Google | `Google-Extended` |
| GoogleOther | Google | `GoogleOther` |
| PerplexityBot | Perplexity | `PerplexityBot/1.0` |
| Applebot-Extended | Apple | `Applebot-Extended` |
| YouBot | You.com | `YouBot/1.0` |
| Bytespider | ByteDance | `Bytespider` |
| cohere-ai | Cohere | `cohere-ai` |
| Meta-ExternalAgent | Meta | `Meta-ExternalAgent` |
| OAI-SearchBot | OpenAI | `OAI-SearchBot` |
| anthropic-ai | Anthropic | `anthropic-ai` |

---

## 📈 What You Can Build With This Data

### 1. **Traffic Overview Dashboard**
```
Total AI Bot Visits: 1,000
Optimized Content Served: 750 (75%)
Regular Content Served: 250 (25%)
```

### 2. **Bot Type Breakdown (Pie Chart)**
```
GPTBot:         400 visits (40%)
ClaudeBot:      300 visits (30%)
PerplexityBot:   50 visits (5%)
Others:         250 visits (25%)
```

### 3. **Top Pages (Bar Chart)**
```
/pricing      ████████████████████ 200
/about        ███████████████ 150
/blog/post-1  ██████████ 100
/features     ████████ 80
/contact      ██████ 60
```

### 4. **Time-Based Trends**
```
Last 24h: 150 requests (120 variants served)
Last 7d:  1000 requests (800 variants served)

Conversion Rate: 80% of bots see optimized content
```

### 5. **Performance Metrics**
```
Variant Coverage: 75%
Most Popular Path: /pricing (200 visits)
Most Active Bot: GPTBot (400 visits)
```

---

## 💡 Example Frontend Usage

### Fetch Analytics
```typescript
import { getAnalytics } from '@/services/api';

const analytics = await getAnalytics(deploymentId);

console.log(`Total Requests: ${analytics.totalRequests}`);
console.log(`Variants Served: ${analytics.variantsServed}`);
console.log(`Bot Types:`, analytics.botTypes);
console.log(`Top Paths:`, analytics.topPaths);
```

### Display in UI
```tsx
function AnalyticsDashboard({ deploymentId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getAnalytics(deploymentId).then(setAnalytics);
  }, [deploymentId]);

  if (!analytics) return <div>Loading...</div>;

  return (
    <div>
      <h2>Analytics</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3>Total Requests</h3>
          <p className="text-3xl">{analytics.totalRequests}</p>
        </Card>
        <Card>
          <h3>Variants Served</h3>
          <p className="text-3xl">{analytics.variantsServed}</p>
        </Card>
      </div>

      {/* Bot Types */}
      <div>
        <h3>Bot Types</h3>
        {Object.entries(analytics.botTypes).map(([bot, count]) => (
          <div key={bot}>
            {bot}: {count}
          </div>
        ))}
      </div>

      {/* Top Paths */}
      <div>
        <h3>Top Paths</h3>
        {analytics.topPaths.map(({ path, count }) => (
          <div key={path}>
            {path}: {count} visits
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎨 Recommended Visualizations

### 1. **Summary Cards**
- Total Requests (number)
- Variants Served (number + percentage)
- Unique Bots (count)
- Top Path (name + count)

### 2. **Charts**
- **Pie Chart**: Bot type distribution
- **Bar Chart**: Top 10 paths
- **Line Chart**: Requests over time (if you add timestamps)
- **Donut Chart**: Variant served vs regular

### 3. **Tables**
- Recent requests (timestamp, bot, path, variant served)
- Bot leaderboard (sorted by count)
- Path performance (sorted by visits)

---

## 🔮 Future Enhancements (Not Yet Implemented)

These could be added to make analytics even better:

### Time-Series Data
```typescript
// Add hourly/daily aggregation
{
  "timeSeries": [
    { "hour": "2026-02-16T10:00", "requests": 50 },
    { "hour": "2026-02-16T11:00", "requests": 75 }
  ]
}
```

### Response Time Tracking
```typescript
{
  "avgResponseTime": 45, // ms
  "p95ResponseTime": 120 // ms
}
```

### Conversion Tracking
```typescript
{
  "conversionRate": 0.75, // 75% of bots got variants
  "missedOpportunities": 250 // Bots that didn't get variants
}
```

### Geographic Data
```typescript
{
  "countries": {
    "US": 500,
    "UK": 200,
    "DE": 100
  }
}
```

---

## 📊 Complete Analytics Response Example

```json
{
  "totalRequests": 1000,
  "variantsServed": 750,
  "botTypes": {
    "GPTBot": 400,
    "ClaudeBot": 300,
    "PerplexityBot": 50,
    "Google-Extended": 100,
    "Applebot-Extended": 75,
    "YouBot": 50,
    "cohere-ai": 25
  },
  "topPaths": [
    { "path": "/pricing", "count": 200 },
    { "path": "/about", "count": 150 },
    { "path": "/blog/post-1", "count": 100 },
    { "path": "/features", "count": 80 },
    { "path": "/contact", "count": 60 },
    { "path": "/blog/post-2", "count": 50 },
    { "path": "/docs", "count": 40 },
    { "path": "/api", "count": 30 },
    { "path": "/team", "count": 20 },
    { "path": "/careers", "count": 10 }
  ]
}
```

---

## 🚀 Summary

### Available Now
✅ Total requests (all-time)  
✅ Variants served count  
✅ Bot type breakdown  
✅ Top 10 paths  
✅ 24h/7d summaries  

### Data Granularity
- **All-time**: Complete history
- **24 hours**: Last day
- **7 days**: Last week

### Use Cases
- Track AI bot traffic
- Measure variant effectiveness
- Identify popular content
- Monitor bot types
- Optimize variant coverage

**The backend provides rich analytics data ready to be visualized in the frontend!** 📊
