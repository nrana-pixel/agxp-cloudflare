/**
 * Analytics Routes
 * Handles analytics logging and retrieval
 */

import { Hono } from 'hono';
import type { Env, AnalyticsLogRequest } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { verifyApiKey } from '../utils/hashing';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /v1/analytics/log
 * Public endpoint for client workers to log analytics
 * Uses API key authentication
 */
app.post('/log', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const siteId = c.req.header('X-SITE-ID');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    if (!siteId) {
      return c.json({ error: 'Missing X-SITE-ID header' }, 400);
    }

    const apiKey = authHeader.substring(7);

    // Verify API key
    const apiKeyRecord = await c.env.DB.prepare(
      'SELECT deployment_id FROM api_keys WHERE key_hash = ? AND status = ?'
    )
      .bind(await import('../utils/hashing').then(m => m.hashApiKey(apiKey)), 'active')
      .first();

    if (!apiKeyRecord) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    const deploymentId = apiKeyRecord.deployment_id as number;

    // Parse request body
    const body = await c.req.json<AnalyticsLogRequest>();
    const { path, userAgent, botType, variantServed, timestamp } = body;

    if (!path || !userAgent || !botType || variantServed === undefined || !timestamp) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Log the event
    const analyticsService = new AnalyticsService(c.env);
    await analyticsService.logEvent(
      deploymentId,
      path,
      userAgent,
      botType,
      variantServed,
      timestamp
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Analytics log error:', error);
    return c.json({ error: 'Failed to log analytics' }, 500);
  }
});

/**
 * GET /api/analytics/:deploymentId
 * Gets aggregated analytics for a deployment
 */
app.get('/:deploymentId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const deploymentId = parseInt(c.req.param('deploymentId'));

    if (isNaN(deploymentId)) {
      return c.json({ error: 'Invalid deployment ID' }, 400);
    }

    // Verify user owns this deployment
    const deployment = await c.env.DB.prepare(
      'SELECT id FROM deployments WHERE id = ? AND user_id = ?'
    )
      .bind(deploymentId, userId)
      .first();

    if (!deployment) {
      return c.json({ error: 'Deployment not found' }, 404);
    }

    // Get analytics
    const analyticsService = new AnalyticsService(c.env);
    const analytics = await analyticsService.getAnalytics(deploymentId);

    return c.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ error: 'Failed to get analytics' }, 500);
  }
});

/**
 * GET /api/analytics/:deploymentId/summary
 * Gets summary analytics for a specific period
 */
app.get('/:deploymentId/summary', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const deploymentId = parseInt(c.req.param('deploymentId'));
    const period = c.req.query('period') as '24h' | '7d' || '24h';

    if (isNaN(deploymentId)) {
      return c.json({ error: 'Invalid deployment ID' }, 400);
    }

    if (!['24h', '7d'].includes(period)) {
      return c.json({ error: 'Invalid period. Must be 24h or 7d' }, 400);
    }

    // Verify user owns this deployment
    const deployment = await c.env.DB.prepare(
      'SELECT id FROM deployments WHERE id = ? AND user_id = ?'
    )
      .bind(deploymentId, userId)
      .first();

    if (!deployment) {
      return c.json({ error: 'Deployment not found' }, 404);
    }

    // Get summary
    const analyticsService = new AnalyticsService(c.env);
    const summary = await analyticsService.getSummary(deploymentId, period);

    return c.json(summary);
  } catch (error) {
    console.error('Get analytics summary error:', error);
    return c.json({ error: 'Failed to get analytics summary' }, 500);
  }
});

export default app;
