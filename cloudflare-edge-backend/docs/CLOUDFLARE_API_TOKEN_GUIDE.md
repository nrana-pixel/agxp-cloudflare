# Creating a Cloudflare API Token

This guide walks you through creating the correct Cloudflare API token with the necessary permissions for the Edge Delivery system.

## Why Do You Need an API Token?

The Edge Delivery system needs to deploy workers to your Cloudflare account, create KV namespaces, and configure routes on your domains. To do this securely, you provide an API token that grants specific permissions.

---

## Step-by-Step Guide

### Step 1: Log into Cloudflare Dashboard

Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) and log in to your account.

### Step 2: Navigate to API Tokens

1. Click on your **profile icon** in the top-right corner
2. Select **"My Profile"**
3. Click on the **"API Tokens"** tab in the left sidebar
4. Click the **"Create Token"** button

![API Tokens Page](https://developers.cloudflare.com/images/fundamentals/api/tokens-list.png)

### Step 3: Use the "Edit Cloudflare Workers" Template

1. Find the **"Edit Cloudflare Workers"** template
2. Click **"Use template"**

This template provides a good starting point, but we need to customize it.

### Step 4: Configure Token Permissions

You need to set the following permissions:

#### Account Permissions
| Resource | Permission |
|----------|------------|
| **Workers Scripts** | Edit |
| **Workers KV Storage** | Edit |
| **Account Settings** | Read |

#### Zone Permissions
| Resource | Permission |
|----------|------------|
| **Workers Routes** | Edit |
| **Zone** | Read |

### Step 5: Set Account Resources

Under **"Account Resources"**:
- Select **"Include"** → **"All accounts"**
  
  *Or if you prefer, select specific accounts you want to grant access to*

### Step 6: Set Zone Resources

Under **"Zone Resources"**:
- Select **"Include"** → **"All zones"**
  
  *Or select specific zones (domains) you want to deploy to*

### Step 7: Set Token Name and TTL

1. **Token name**: Give it a descriptive name like `Edge Delivery System`
2. **TTL (Time to Live)**: 
   - For testing: Set to a short duration (e.g., 1 week)
   - For production: Set to a longer duration or leave blank for no expiration

### Step 8: Create and Copy Token

1. Click **"Continue to summary"**
2. Review the permissions
3. Click **"Create Token"**
4. **IMPORTANT**: Copy the token immediately and store it securely
   - You will only see this token once
   - If you lose it, you'll need to create a new one

---

## Complete Permissions Checklist

Use this checklist to verify you've set everything correctly:

- [ ] **Account / Workers Scripts**: Edit
- [ ] **Account / Workers KV Storage**: Edit
- [ ] **Account / Account Settings**: Read
- [ ] **Zone / Workers Routes**: Edit
- [ ] **Zone / Zone**: Read
- [ ] **Account Resources**: Include → All accounts (or specific accounts)
- [ ] **Zone Resources**: Include → All zones (or specific zones)

---

## Security Best Practices

### ✅ DO:
- Store the token securely (password manager, environment variables)
- Use specific account/zone restrictions if possible
- Set an expiration date for testing tokens
- Regenerate tokens periodically
- Delete tokens you're no longer using

### ❌ DON'T:
- Share your token with anyone
- Commit tokens to version control (Git)
- Use the same token across multiple applications
- Give more permissions than necessary

---

## Using the Token

Once you have your token:

1. **In the Frontend**: Paste it into the "Connect Cloudflare" page
2. **In the API**: The token will be encrypted and stored securely in the database
3. **For Deployments**: The system will use this token to create workers and KV namespaces in your account

---

## Troubleshooting

### "Invalid API token" Error

**Possible causes:**
- Token was copied incorrectly (extra spaces, missing characters)
- Token has expired
- Token doesn't have the required permissions

**Solution:**
- Create a new token following the steps above
- Ensure all permissions are set correctly

### "Insufficient permissions" Error

**Possible causes:**
- Missing one or more required permissions
- Account/Zone resources not configured correctly

**Solution:**
- Go back to the token settings in Cloudflare
- Verify all permissions match the checklist above
- If needed, create a new token with correct permissions

### Token Expired

**Solution:**
- Create a new token
- Update it in the Edge Delivery Console (Connect Cloudflare page)

---

## API Token vs API Key

**Important**: This system requires an **API Token**, NOT an API Key.

| API Token | API Key (Legacy) |
|-----------|------------------|
| ✅ Scoped permissions | ❌ Full account access |
| ✅ Can be restricted | ❌ Cannot be restricted |
| ✅ Can expire | ❌ Never expires |
| ✅ Recommended | ❌ Deprecated |

**Always use API Tokens** for better security.

---

## Example Token Creation (Visual Guide)

### 1. Template Selection
```
┌─────────────────────────────────────────┐
│  Edit Cloudflare Workers                │
│  ┌─────────────────────────────────┐   │
│  │  [Use template]                 │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 2. Permissions Configuration
```
Account Permissions:
  Workers Scripts .............. Edit
  Workers KV Storage ........... Edit
  Account Settings ............. Read

Zone Permissions:
  Workers Routes ............... Edit
  Zone ......................... Read
```

### 3. Resource Scope
```
Account Resources:
  Include → All accounts
  
Zone Resources:
  Include → All zones
```

---

## Need Help?

If you're still having trouble:

1. Check the [Cloudflare API Token Documentation](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
2. Review the error message in the Edge Delivery Console
3. Verify your Cloudflare account has the necessary features enabled (Workers, KV)
4. Contact support with the error details

---

## Quick Reference

**Minimum Required Permissions:**
```
Account:
  - Workers Scripts: Edit
  - Workers KV Storage: Edit
  - Account Settings: Read

Zone:
  - Workers Routes: Edit
  - Zone: Read
```

**Token Scope:**
```
Account Resources: All accounts (or specific)
Zone Resources: All zones (or specific)
```

**Token Security:**
- Never share your token
- Store securely
- Set expiration for testing
- Rotate regularly in production
