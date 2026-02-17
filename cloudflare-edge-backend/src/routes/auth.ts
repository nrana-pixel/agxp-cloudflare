/**
 * Cloudflare Connection Routes
 * Handles API token connection, zone listing, and disconnection
 */

import { Hono } from 'hono';
import type { Env, ConnectCloudflareRequest, ConnectCloudflareResponse, ListZonesResponse } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { strictRateLimit } from '../middleware/ratelimit.middleware';
import { CloudflareService } from '../services/cloudflare.service';
import { encryptToken, decryptToken } from '../utils/encryption';
import { isValidCloudflareToken } from '../utils/validation';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/cloudflare/connect
 * Connects a Cloudflare account via API token
 */
app.post('/connect', authMiddleware, strictRateLimit, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const body = await c.req.json<ConnectCloudflareRequest>();
    let { token } = body;
    
    // Sanitize: trim whitespace
    token = token.trim();

    // Validate token format
    if (!isValidCloudflareToken(token)) {
      return c.json<ConnectCloudflareResponse>(
        { success: false, error: 'Invalid token format' },
        400
      );
    }

    // Initialize Cloudflare service
    const cfService = new CloudflareService(token);

    // Verify token (soft check)
    // Account tokens might fail this check but still be valid for account operations
    const isValid = await cfService.verifyToken();
    if (!isValid) {
      console.warn('Token verification failed (standard verify endpoint). Attempting to list accounts directly...');
    }

    // Get account ID - This is the REAL check
    // If this succeeds, the token is valid for our needs
    const accounts = await cfService.listAccounts();
    if (accounts.length === 0) {
      // Only fail if we also can't access accounts
      if (!isValid) {
         return c.json<ConnectCloudflareResponse>(
          { success: false, error: 'Invalid or expired Cloudflare API token' },
          401
        );
      }
      
      return c.json<ConnectCloudflareResponse>(
        { success: false, error: 'No Cloudflare accounts found for this token' },
        400
      );
    }

    const accountId = accounts[0].id;

    // Encrypt token
    const tokenEncrypted = await encryptToken(token, c.env.ENCRYPTION_KEY);

    // FIX: Ensure user exists (since we are using Mock JWTs)
    // In production, users would be created during signup
    const userExists = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
    if (!userExists) {
       await c.env.DB.prepare(
         'INSERT INTO users (id, email, name) VALUES (?, ?, ?)'
       ).bind(userId, 'test@example.com', 'Test User').run();
    }

    // Check if connection exists
    const existingConnection = await c.env.DB.prepare(
      'SELECT id FROM cloudflare_connections WHERE user_id = ?'
    )
    .bind(userId)
    .first();

    if (existingConnection) {
      // Update existing
      await c.env.DB.prepare(
        `UPDATE cloudflare_connections 
         SET account_id = ?, 
             token_encrypted = ?, 
             status = 'active', 
             connected_at = datetime('now')
         WHERE user_id = ?`
      )
      .bind(accountId, tokenEncrypted, userId)
      .run();
    } else {
      // Insert new
      await c.env.DB.prepare(
        `INSERT INTO cloudflare_connections 
         (user_id, account_id, token_encrypted, token_type, status, connected_at)
         VALUES (?, ?, ?, 'api_token', 'active', datetime('now'))`
      )
      .bind(userId, accountId, tokenEncrypted)
      .run();
    }

    return c.json<ConnectCloudflareResponse>({
      success: true,
      accountId,
    });
  } catch (error) {
    console.error('Connect Cloudflare error:', error);
    return c.json<ConnectCloudflareResponse>(
      { success: false, error: 'Failed to connect Cloudflare account' },
      500
    );
  }
});

/**
 * GET /api/cloudflare/zones
 * Lists all zones (domains) for the connected account
 */
app.get('/zones', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;

    // Get connection
    const connection = await c.env.DB.prepare(
      'SELECT account_id, token_encrypted FROM cloudflare_connections WHERE user_id = ? AND status = ?'
    )
      .bind(userId, 'active')
      .first();

    if (!connection) {
      return c.json({ error: 'No active Cloudflare connection found' }, 404);
    }

    // Decrypt token
    const token = await decryptToken(
      connection.token_encrypted as string,
      c.env.ENCRYPTION_KEY
    );

    // Get zones
    const cfService = new CloudflareService(token);
    const zones = await cfService.listZones();

    return c.json<ListZonesResponse>({
      zones: zones.map(z => ({
        id: z.id,
        name: z.name,
        status: z.status,
      })),
    });
  } catch (error) {
    console.error('List zones error:', error);
    return c.json({ error: 'Failed to list zones' }, 500);
  }
});

/**
 * DELETE /api/cloudflare/disconnect
 * Disconnects the Cloudflare account
 */
app.delete('/disconnect', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;

    // Mark connection as disconnected
    await c.env.DB.prepare(
      'UPDATE cloudflare_connections SET status = ? WHERE user_id = ?'
    )
      .bind('disconnected', userId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return c.json({ error: 'Failed to disconnect' }, 500);
  }
});

export default app;
