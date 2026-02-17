/**
 * Deployment Service
 * Orchestrates the deployment of client workers to Cloudflare
 */

import { CloudflareService } from './cloudflare.service';
import { generateApiKey, hashApiKey } from '../utils/hashing';
import type { Env, DeploymentResult, Variant } from '../types';
import { getClientWorkerCode } from '../templates/client-worker';

export class DeploymentService {
  constructor(private env: Env) {}

  /**
   * Deploys a worker to the client's Cloudflare account
   */
  async deploy(
    userId: number,
    siteId: string,
    zoneId: string,
    zoneName: string
  ): Promise<DeploymentResult> {
    try {
      // 1. Get Cloudflare connection for this user
      const connection = await this.env.DB.prepare(
        'SELECT account_id, token_encrypted FROM cloudflare_connections WHERE user_id = ? AND status = ?'
      )
        .bind(userId, 'active')
        .first();

      if (!connection) {
        return { success: false, error: 'No active Cloudflare connection found' };
      }

      const accountId = connection.account_id as string;
      const tokenEncrypted = connection.token_encrypted as string;

      // 2. Decrypt token
      const { decryptToken } = await import('../utils/encryption');
      const accessToken = await decryptToken(tokenEncrypted, this.env.ENCRYPTION_KEY);

      // 3. Initialize Cloudflare service
      const cfService = new CloudflareService(accessToken);

      // 4. Create KV namespace
      const kvNamespace = await cfService.createKVNamespace(
        accountId,
        `axp-variants-${siteId}`
      );
      const kvNamespaceId = kvNamespace.id;

      // 5. Generate worker code
      const workerName = `axp-${siteId}`;
      const workerCode = getClientWorkerCode();

      // 6. Upload worker script with KV binding
      const bindings = [
        {
          type: 'kv_namespace',
          name: 'VARIANTS',
          namespace_id: kvNamespaceId,
        },
      ];

      await cfService.uploadWorker(accountId, workerName, workerCode, bindings);

      // 7. Generate and set worker secrets
      const clientApiKey = generateApiKey();
      const keyHash = await hashApiKey(clientApiKey);

      await cfService.setWorkerSecret(accountId, workerName, 'CLIENT_API_KEY', clientApiKey);
      await cfService.setWorkerSecret(accountId, workerName, 'SITE_ID', siteId);
      await cfService.setWorkerSecret(accountId, workerName, 'API_ENDPOINT', this.env.API_BASE_URL);

      // 8. Add worker route
      const routePattern = `${zoneName}/*`;
      const route = await cfService.addWorkerRoute(zoneId, routePattern, workerName);

      // 9. Upload existing variants to KV (if any)
      const variantsUploaded = await this.uploadExistingVariants(
        cfService,
        accountId,
        kvNamespaceId,
        userId
      );

      // 10. Persist deployment record
      const deploymentResult = await this.env.DB.prepare(
        `INSERT INTO deployments 
        (user_id, zone_id, zone_name, worker_name, kv_namespace_id, route_pattern, route_id, status, deployed_at, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
        .bind(userId, zoneId, zoneName, workerName, kvNamespaceId, routePattern, route.id, 'active')
        .run();

      const deploymentId = deploymentResult.meta.last_row_id;

      // 11. Store API key hash
      await this.env.DB.prepare(
        'INSERT INTO api_keys (user_id, key_hash, deployment_id, status) VALUES (?, ?, ?, ?)'
      )
        .bind(userId, keyHash, deploymentId, 'active')
        .run();

      // 12. Post-deploy health check
      const isHealthy = await this.healthCheck(zoneName);

      console.log(`Deployment ${deploymentId} completed. Health check: ${isHealthy ? 'PASS' : 'FAIL'}`);

      return {
        success: true,
        deploymentId: deploymentId as number,
        workerName,
        kvNamespaceId,
        variantsUploaded,
      };
    } catch (error) {
      console.error('Deployment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error',
      };
    }
  }

  /**
   * Updates all variants for a deployment
   */
  async updateVariants(deploymentId: number, userId: number): Promise<number> {
    try {
      // Get deployment info
      const deployment = await this.env.DB.prepare(
        'SELECT d.*, c.account_id, c.token_encrypted FROM deployments d JOIN cloudflare_connections c ON d.user_id = c.user_id WHERE d.id = ? AND d.user_id = ? AND d.status = ?'
      )
        .bind(deploymentId, userId, 'active')
        .first();

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      const accountId = deployment.account_id as string;
      const kvNamespaceId = deployment.kv_namespace_id as string;
      const tokenEncrypted = deployment.token_encrypted as string;

      // Decrypt token
      const { decryptToken } = await import('../utils/encryption');
      const accessToken = await decryptToken(tokenEncrypted, this.env.ENCRYPTION_KEY);

      // Initialize Cloudflare service
      const cfService = new CloudflareService(accessToken);

      // Upload all active variants
      const count = await this.uploadExistingVariants(
        cfService,
        accountId,
        kvNamespaceId,
        userId,
        deploymentId
      );

      // Update last_updated timestamp
      await this.env.DB.prepare(
        'UPDATE deployments SET last_updated = datetime(\'now\') WHERE id = ?'
      )
        .bind(deploymentId)
        .run();

      return count;
    } catch (error) {
      console.error('Update variants failed:', error);
      throw error;
    }
  }

  /**
   * Deletes a deployment and cleans up resources
   */
  async deleteDeployment(deploymentId: number, userId: number): Promise<void> {
    try {
      // Get deployment info
      const deployment = await this.env.DB.prepare(
        'SELECT d.*, c.account_id, c.token_encrypted FROM deployments d JOIN cloudflare_connections c ON d.user_id = c.user_id WHERE d.id = ? AND d.user_id = ?'
      )
        .bind(deploymentId, userId)
        .first();

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      const accountId = deployment.account_id as string;
      const workerName = deployment.worker_name as string;
      const kvNamespaceId = deployment.kv_namespace_id as string;
      const zoneId = deployment.zone_id as string;
      const routeId = deployment.route_id as string;
      const tokenEncrypted = deployment.token_encrypted as string;

      // Decrypt token
      const { decryptToken } = await import('../utils/encryption');
      const accessToken = await decryptToken(tokenEncrypted, this.env.ENCRYPTION_KEY);

      // Initialize Cloudflare service
      const cfService = new CloudflareService(accessToken);

      // Delete resources (best effort - continue even if some fail)
      try {
        if (routeId) {
          await cfService.deleteWorkerRoute(zoneId, routeId);
        }
      } catch (error) {
        console.error('Failed to delete worker route:', error);
      }

      try {
        await cfService.deleteWorker(accountId, workerName);
      } catch (error) {
        console.error('Failed to delete worker:', error);
      }

      try {
        await cfService.deleteKVNamespace(accountId, kvNamespaceId);
      } catch (error) {
        console.error('Failed to delete KV namespace:', error);
      }

      // Mark deployment as deleted
      await this.env.DB.prepare(
        'UPDATE deployments SET status = ?, last_updated = datetime(\'now\') WHERE id = ?'
      )
        .bind('deleted', deploymentId)
        .run();

      // Mark API keys as inactive
      await this.env.DB.prepare(
        'UPDATE api_keys SET status = ? WHERE deployment_id = ?'
      )
        .bind('inactive', deploymentId)
        .run();
    } catch (error) {
      console.error('Delete deployment failed:', error);
      throw error;
    }
  }

  /**
   * Uploads existing variants to KV
   */
  private async uploadExistingVariants(
    cfService: CloudflareService,
    accountId: string,
    kvNamespaceId: string,
    userId: number,
    deploymentId?: number
  ): Promise<number> {
    let query = 'SELECT url_path, content FROM variants WHERE user_id = ? AND status = ?';
    const params: any[] = [userId, 'active'];

    if (deploymentId) {
      query += ' AND deployment_id = ?';
      params.push(deploymentId);
    }

    const variants = await this.env.DB.prepare(query).bind(...params).all();

    let count = 0;
    for (const variant of variants.results) {
      try {
        const urlPath = variant.url_path as string;
        const content = variant.content as string;

        await cfService.putKVValue(accountId, kvNamespaceId, urlPath, content);
        count++;
      } catch (error) {
        console.error(`Failed to upload variant ${variant.url_path}:`, error);
      }
    }

    return count;
  }

  /**
   * Performs a health check on the deployed worker
   */
  private async healthCheck(zoneName: string): Promise<boolean> {
    try {
      const response = await fetch(`https://${zoneName}/`, {
        headers: {
          'User-Agent': 'GPTBot/1.0',
        },
      });

      const servedBy = response.headers.get('x-served-by');
      return servedBy === 'AXP';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
