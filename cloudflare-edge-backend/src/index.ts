/**
 * Main Hono Application
 * Cloudflare Edge Backend for AI-Optimized Variants
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Import routes
import authRoutes from './routes/auth';
import deploymentRoutes from './routes/deployments';
import variantRoutes from './routes/variants';
import analyticsRoutes from './routes/analytics';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: (origin) => origin, // In production, restrict to FRONTEND_URL
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-SITE-ID'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cloudflare-edge-backend',
  });
});

// Mount routes
app.route('/api/cloudflare', authRoutes);
app.route('/api/deployments', deploymentRoutes);
app.route('/api/variants', variantRoutes);
app.route('/v1/analytics', analyticsRoutes);
app.route('/api/analytics', analyticsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Global error:', err);
  return c.json(
    { error: 'Internal server error' },
    500
  );
});

export default app;
