# Quick Reference: Cloudflare API Token Setup

## 🔑 Required Permissions

### Account Level
- ✅ **Workers Scripts**: Edit
- ✅ **Workers KV Storage**: Edit  
- ✅ **Account Settings**: Read

### Zone Level
- ✅ **Workers Routes**: Edit
- ✅ **Zone**: Read

---

## 📋 Step-by-Step (2 Minutes)

1. **Go to**: [Cloudflare Dashboard](https://dash.cloudflare.com) → Profile → API Tokens
2. **Click**: "Create Token"
3. **Use Template**: "Edit Cloudflare Workers"
4. **Add Permissions**:
   - Account: Workers Scripts (Edit), Workers KV Storage (Edit), Account Settings (Read)
   - Zone: Workers Routes (Edit), Zone (Read)
5. **Set Resources**:
   - Account Resources: Include → All accounts
   - Zone Resources: Include → All zones
6. **Create & Copy**: Save the token securely (you'll only see it once!)

---

## ⚠️ Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|----------|
| Using API Key | Use API Token |
| Missing "Workers KV Storage" permission | Include all 5 permissions |
| Forgetting to copy token | Copy immediately after creation |
| Sharing token publicly | Store in password manager |

---

## 🔗 Direct Link

Create token here: https://dash.cloudflare.com/profile/api-tokens

---

## 💡 Pro Tips

- **Testing**: Set token to expire in 7 days
- **Production**: Use "No expiration" or long TTL
- **Security**: Create separate tokens for dev/prod
- **Backup**: Save token in your password manager immediately

---

## 🆘 Troubleshooting

**"Invalid token" error?**
→ Check for extra spaces when pasting

**"Insufficient permissions" error?**
→ Verify all 5 permissions are set (see checklist above)

**Token expired?**
→ Create a new one and reconnect

---

For detailed instructions, see: [CLOUDFLARE_API_TOKEN_GUIDE.md](./CLOUDFLARE_API_TOKEN_GUIDE.md)
