# Cloudflare Edge Frontend

A premium implementation of the Edge Delivery Console to manage your Cloudflare deployments and variants.

## Features

- **Connect Cloudflare**: Securely connect your account with an API token.
- **One-Click Deploy**: Deploy the edge worker to any of your domains instantly.
- **Variant Manager**: Create and edit HTML variants that are served from the edge.
- **Real-Time Status**: View deployment status and links.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The frontend will start at http://localhost:5173

### 3. Connect to Backend

Ensure the backend is running on `http://localhost:8787`. If you changed the port verify `src/services/api.ts`.
