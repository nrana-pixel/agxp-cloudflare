/**
 * Deployment Routes
 * Handles deployment creation, listing, and deletion
 */

import { Hono } from 'hono';
import type { Env, CreateDeploymentRequest, CreateDeploymentResponse } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { standardRateLimit } from '../middleware/ratelimit.middleware';
import { DeploymentService } from '../services/deployment.service';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/deployments
 * Creates a new deployment
 */
app.post('/', authMiddleware, standardRateLimit, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const body = await c.req.json<CreateDeploymentRequest>();
    const { zoneId, zoneName, siteId } = body;

    if (!zoneId || !zoneName || !siteId) {
      return c.json<CreateDeploymentResponse>(
        { success: false, error: 'Missing required fields: zoneId, zoneName, siteId' },
        400
      );
    }

    const deploymentService = new DeploymentService(c.env);
    const result = await deploymentService.deploy(userId, siteId, zoneId, zoneName);

    if (!result.success) {
      return c.json<CreateDeploymentResponse>(result, 500);
    }

    return c.json<CreateDeploymentResponse>(result);
  } catch (error) {
    console.error('Create deployment error:', error);
    return c.json<CreateDeploymentResponse>(
      { success: false, error: 'Failed to create deployment' },
      500
    );
  }
});

/**
 * GET /api/deployments
 * Lists all deployments for the user
 */
app.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;

    const deployments = await c.env.DB.prepare(
      'SELECT id, zone_name, worker_name, status, deployed_at FROM deployments WHERE user_id = ? ORDER BY deployed_at DESC'
    )
      .bind(userId)
      .all();

    return c.json({
      deployments: deployments.results.map(d => ({
        id: d.id,
        zoneName: d.zone_name,
        workerName: d.worker_name,
        status: d.status,
        deployedAt: d.deployed_at,
      })),
    });
  } catch (error) {
    console.error('List deployments error:', error);
    return c.json({ error: 'Failed to list deployments' }, 500);
  }
});

/**
 * DELETE /api/deployments/:id
 * Deletes a deployment
 */
app.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const deploymentId = parseInt(c.req.param('id'));

    if (isNaN(deploymentId)) {
      return c.json({ error: 'Invalid deployment ID' }, 400);
    }

    const deploymentService = new DeploymentService(c.env);
    await deploymentService.deleteDeployment(deploymentId, userId);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete deployment error:', error);
    return c.json({ error: 'Failed to delete deployment' }, 500);
  }
});

/**
 * PUT /api/deployments/:id/variants
 * Resyncs all variants for a deployment
 */
app.put('/:id/variants', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as number;
    const deploymentId = parseInt(c.req.param('id'));

    if (isNaN(deploymentId)) {
      return c.json({ error: 'Invalid deployment ID' }, 400);
    }

    const deploymentService = new DeploymentService(c.env);
    const count = await deploymentService.updateVariants(deploymentId, userId);

    return c.json({
      success: true,
      variantsUpdated: count,
    });
  } catch (error) {
    console.error('Update variants error:', error);
    return c.json({ error: 'Failed to update variants' }, 500);
  }
});

export default app;
