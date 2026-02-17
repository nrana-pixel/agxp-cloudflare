/**
 * Variant Routes
 * Handles variant CRUD operations
 */

import { Hono } from 'hono';
import type { Env, CreateVariantRequest, CreateVariantResponse, UpdateVariantRequest } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { standardRateLimit } from '../middleware/ratelimit.middleware';
import { CloudflareService } from '../services/cloudflare.service';
import { decryptToken } from '../utils/encryption';
import { hashContent } from '../utils/hashing';
import { isValidUrlPath } from '../utils/validation';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/variants
 * Creates a new variant and syncs to KV
 */
app.post('/', authMiddleware, standardRateLimit, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const body = await c.req.json<CreateVariantRequest>();
    const { deploymentId, urlPath, content } = body;

    if (!deploymentId || !urlPath || !content) {
      return c.json<CreateVariantResponse>(
        { success: false, error: 'Missing required fields: deploymentId, urlPath, content' },
        400
      );
    }

    if (!isValidUrlPath(urlPath)) {
      return c.json<CreateVariantResponse>(
        { success: false, error: 'Invalid URL path format' },
        400
      );
    }

    // Get deployment and connection info
    const deployment = await c.env.DB.prepare(
      `SELECT d.*, c.account_id, c.token_encrypted 
       FROM deployments d 
       JOIN cloudflare_connections c ON d.user_id = c.user_id 
       WHERE d.id = ? AND d.user_id = ? AND d.status = ?`
    )
      .bind(deploymentId, userId, 'active')
      .first();

    if (!deployment) {
      return c.json<CreateVariantResponse>(
        { success: false, error: 'Deployment not found' },
        404
      );
    }

    // Generate content hash
    const contentHash = await hashContent(content);

    // Insert variant into DB
    const result = await c.env.DB.prepare(
      `INSERT INTO variants 
       (user_id, deployment_id, url_path, content, content_hash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`
    )
      .bind(userId, deploymentId, urlPath, content, contentHash)
      .run();

    const variantId = result.meta.last_row_id;

    // Upload to KV
    const accountId = deployment.account_id as string;
    const kvNamespaceId = deployment.kv_namespace_id as string;
    const tokenEncrypted = deployment.token_encrypted as string;

    const token = await decryptToken(tokenEncrypted, c.env.ENCRYPTION_KEY);
    const cfService = new CloudflareService(token);

    const kvKey = encodeURIComponent(urlPath);
    await cfService.putKVValue(accountId, kvNamespaceId, kvKey, content);

    return c.json<CreateVariantResponse>({
      success: true,
      variantId: variantId as number,
    });
  } catch (error) {
    console.error('Create variant error:', error);
    return c.json<CreateVariantResponse>(
      { success: false, error: 'Failed to create variant' },
      500
    );
  }
});

/**
 * PUT /api/variants/:id
 * Updates a variant and syncs to KV
 */
app.put('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const variantId = parseInt(c.req.param('id'));
    const body = await c.req.json<UpdateVariantRequest>();
    const { content } = body;

    if (isNaN(variantId)) {
      return c.json({ error: 'Invalid variant ID' }, 400);
    }

    if (!content) {
      return c.json({ error: 'Missing required field: content' }, 400);
    }

    // Get variant and deployment info
    const variant = await c.env.DB.prepare(
      `SELECT v.*, d.kv_namespace_id, c.account_id, c.token_encrypted
       FROM variants v
       JOIN deployments d ON v.deployment_id = d.id
       JOIN cloudflare_connections c ON d.user_id = c.user_id
       WHERE v.id = ? AND v.user_id = ?`
    )
      .bind(variantId, userId)
      .first();

    if (!variant) {
      return c.json({ error: 'Variant not found' }, 404);
    }

    // Generate new content hash
    const contentHash = await hashContent(content);

    // Update variant in DB
    await c.env.DB.prepare(
      'UPDATE variants SET content = ?, content_hash = ?, updated_at = datetime(\'now\') WHERE id = ?'
    )
      .bind(content, contentHash, variantId)
      .run();

    // Update in KV
    const accountId = variant.account_id as string;
    const kvNamespaceId = variant.kv_namespace_id as string;
    const tokenEncrypted = variant.token_encrypted as string;
    const urlPath = variant.url_path as string;

    const token = await decryptToken(tokenEncrypted, c.env.ENCRYPTION_KEY);
    const cfService = new CloudflareService(token);

    const kvKey = encodeURIComponent(urlPath);
    await cfService.putKVValue(accountId, kvNamespaceId, kvKey, content);

    return c.json({ success: true });
  } catch (error) {
    console.error('Update variant error:', error);
    return c.json({ error: 'Failed to update variant' }, 500);
  }
});

/**
 * DELETE /api/variants/:id
 * Deletes a variant from DB and KV
 */
app.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const variantId = parseInt(c.req.param('id'));

    if (isNaN(variantId)) {
      return c.json({ error: 'Invalid variant ID' }, 400);
    }

    // Get variant and deployment info
    const variant = await c.env.DB.prepare(
      `SELECT v.*, d.kv_namespace_id, c.account_id, c.token_encrypted
       FROM variants v
       JOIN deployments d ON v.deployment_id = d.id
       JOIN cloudflare_connections c ON d.user_id = c.user_id
       WHERE v.id = ? AND v.user_id = ?`
    )
      .bind(variantId, userId)
      .first();

    if (!variant) {
      return c.json({ error: 'Variant not found' }, 404);
    }

    // Delete from DB
    await c.env.DB.prepare('DELETE FROM variants WHERE id = ?')
      .bind(variantId)
      .run();

    // Try to delete from KV (best effort)
    try {
      const accountId = variant.account_id as string;
      const kvNamespaceId = variant.kv_namespace_id as string;
      const tokenEncrypted = variant.token_encrypted as string;
      const urlPath = variant.url_path as string;

      const token = await decryptToken(tokenEncrypted, c.env.ENCRYPTION_KEY);
      const cfService = new CloudflareService(token);

      const kvKey = encodeURIComponent(urlPath);
      await cfService.deleteKVValue(accountId, kvNamespaceId, kvKey);
    } catch (error) {
      console.error('Failed to delete from KV (continuing):', error);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete variant error:', error);
    return c.json({ error: 'Failed to delete variant' }, 500);
  }
});

/**
 * GET /api/variants
 * Lists all variants for a deployment
 */
app.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const deploymentId = c.req.query('deploymentId');

    if (!deploymentId) {
      return c.json({ error: 'Missing query parameter: deploymentId' }, 400);
    }

    const variants = await c.env.DB.prepare(
      'SELECT id, url_path, content_hash, status, created_at, updated_at FROM variants WHERE user_id = ? AND deployment_id = ? ORDER BY created_at DESC'
    )
      .bind(userId, parseInt(deploymentId))
      .all();

    return c.json({ variants: variants.results });
  } catch (error) {
    console.error('List variants error:', error);
    return c.json({ error: 'Failed to list variants' }, 500);
  }
});

export default app;
