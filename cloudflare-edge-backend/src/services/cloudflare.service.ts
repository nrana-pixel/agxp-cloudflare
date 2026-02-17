/**
 * Cloudflare API Service
 * Wrapper for Cloudflare API interactions
 */

import type {
  CloudflareApiResponse,
  CloudflareAccount,
  CloudflareZone,
  CloudflareKVNamespace,
  CloudflareWorkerRoute,
} from '../types';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

export class CloudflareService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Verifies the API token
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(`${CLOUDFLARE_API_BASE}/user/tokens/verify`, {
        headers: this.getHeaders(),
      });

      const data = await response.json() as CloudflareApiResponse;
      return data.success;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  /**
   * Lists all accounts accessible by the token
   */
  async listAccounts(): Promise<CloudflareAccount[]> {
    const response = await fetch(`${CLOUDFLARE_API_BASE}/accounts`, {
      headers: this.getHeaders(),
    });

    const data = await response.json() as CloudflareApiResponse<CloudflareAccount[]>;
    
    if (!data.success) {
      throw new Error(`Failed to list accounts: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.result;
  }

  /**
   * Lists all zones (domains)
   */
  async listZones(): Promise<CloudflareZone[]> {
    const response = await fetch(`${CLOUDFLARE_API_BASE}/zones`, {
      headers: this.getHeaders(),
    });

    const data = await response.json() as CloudflareApiResponse<CloudflareZone[]>;
    
    if (!data.success) {
      throw new Error(`Failed to list zones: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.result;
  }

  /**
   * Creates a KV namespace in the specified account
   */
  async createKVNamespace(accountId: string, title: string): Promise<CloudflareKVNamespace> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/storage/kv/namespaces`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ title }),
      }
    );

    const data = await response.json() as CloudflareApiResponse<CloudflareKVNamespace>;
    
    if (!data.success) {
      throw new Error(`Failed to create KV namespace: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.result;
  }

  /**
   * Uploads a worker script
   */
  async uploadWorker(
    accountId: string,
    workerName: string,
    script: string,
    bindings: any[]
  ): Promise<void> {
    const metadata = {
      main_module: 'worker.js',
      bindings,
      compatibility_date: '2024-02-01',
    };

    const formData = new FormData();
    formData.append('worker.js', new Blob([script], { type: 'application/javascript+module' }), 'worker.js');
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/workers/scripts/${workerName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      }
    );

    const data = await response.json() as CloudflareApiResponse;
    
    if (!data.success) {
      throw new Error(`Failed to upload worker: ${data.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Sets a worker secret
   */
  async setWorkerSecret(
    accountId: string,
    workerName: string,
    secretName: string,
    secretValue: string
  ): Promise<void> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/workers/scripts/${workerName}/secrets`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: secretName,
          text: secretValue,
          type: 'secret_text',
        }),
      }
    );

    const data = await response.json() as CloudflareApiResponse;
    
    if (!data.success) {
      throw new Error(`Failed to set worker secret: ${data.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Adds a worker route to a zone
   */
  async addWorkerRoute(
    zoneId: string,
    pattern: string,
    scriptName: string
  ): Promise<CloudflareWorkerRoute> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/workers/routes`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          pattern,
          script: scriptName,
        }),
      }
    );

    const data = await response.json() as CloudflareApiResponse<CloudflareWorkerRoute>;
    
    if (!data.success) {
      throw new Error(`Failed to add worker route: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.result;
  }

  /**
   * Uploads a value to KV
   */
  async putKVValue(
    accountId: string,
    namespaceId: string,
    key: string,
    value: string
  ): Promise<void> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'text/html',
        },
        body: value,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to put KV value: ${text}`);
    }
  }

  /**
   * Deletes a value from KV
   */
  async deleteKVValue(
    accountId: string,
    namespaceId: string,
    key: string
  ): Promise<void> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to delete KV value: ${text}`);
    }
  }

  /**
   * Deletes a worker script
   */
  async deleteWorker(accountId: string, workerName: string): Promise<void> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/workers/scripts/${workerName}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    const data = await response.json() as CloudflareApiResponse;
    
    if (!data.success) {
      throw new Error(`Failed to delete worker: ${data.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Deletes a worker route
   */
  async deleteWorkerRoute(zoneId: string, routeId: string): Promise<void> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/workers/routes/${routeId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    const data = await response.json() as CloudflareApiResponse;
    
    if (!data.success) {
      throw new Error(`Failed to delete worker route: ${data.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Deletes a KV namespace
   */
  async deleteKVNamespace(accountId: string, namespaceId: string): Promise<void> {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    const data = await response.json() as CloudflareApiResponse;
    
    if (!data.success) {
      throw new Error(`Failed to delete KV namespace: ${data.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Gets common headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}
