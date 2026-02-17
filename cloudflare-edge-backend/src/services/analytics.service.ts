/**
 * Analytics Service
 * Handles analytics data ingestion and aggregation
 */

import type { Env, AnalyticsResponse, AnalyticsSummaryResponse } from '../types';

export class AnalyticsService {
  constructor(private env: Env) {}

  /**
   * Logs an analytics event from a client worker
   */
  async logEvent(
    deploymentId: number,
    path: string,
    userAgent: string,
    botType: string,
    variantServed: boolean,
    timestamp: string
  ): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO ai_requests 
      (deployment_id, timestamp, user_agent, bot_type, url_path, variant_served, response_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(deploymentId, timestamp, userAgent, botType, path, variantServed ? 1 : 0, 0)
      .run();
  }

  /**
   * Gets aggregated analytics for a deployment
   */
  async getAnalytics(deploymentId: number): Promise<AnalyticsResponse> {
    // Total requests
    const totalResult = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM ai_requests WHERE deployment_id = ?'
    )
      .bind(deploymentId)
      .first();

    const totalRequests = (totalResult?.count as number) || 0;

    // Variants served
    const variantsResult = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM ai_requests WHERE deployment_id = ? AND variant_served = 1'
    )
      .bind(deploymentId)
      .first();

    const variantsServed = (variantsResult?.count as number) || 0;

    // Bot types breakdown
    const botTypesResult = await this.env.DB.prepare(
      'SELECT bot_type, COUNT(*) as count FROM ai_requests WHERE deployment_id = ? GROUP BY bot_type'
    )
      .bind(deploymentId)
      .all();

    const botTypes: Record<string, number> = {};
    for (const row of botTypesResult.results) {
      const botType = row.bot_type as string;
      const count = row.count as number;
      if (botType) {
        botTypes[botType] = count;
      }
    }

    // Top paths
    const topPathsResult = await this.env.DB.prepare(
      'SELECT url_path, COUNT(*) as count FROM ai_requests WHERE deployment_id = ? GROUP BY url_path ORDER BY count DESC LIMIT 10'
    )
      .bind(deploymentId)
      .all();

    const topPaths = topPathsResult.results.map(row => ({
      path: row.url_path as string,
      count: row.count as number,
    }));

    return {
      totalRequests,
      variantsServed,
      botTypes,
      topPaths,
    };
  }

  /**
   * Gets summary analytics for a specific time period
   */
  async getSummary(deploymentId: number, period: '24h' | '7d'): Promise<AnalyticsSummaryResponse> {
    const hours = period === '24h' ? 24 : 168;

    // Requests in period
    const requestsResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM ai_requests 
       WHERE deployment_id = ? AND timestamp >= datetime('now', '-${hours} hours')`
    )
      .bind(deploymentId)
      .first();

    const requests = (requestsResult?.count as number) || 0;

    // Variants served in period
    const variantsResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM ai_requests 
       WHERE deployment_id = ? AND variant_served = 1 AND timestamp >= datetime('now', '-${hours} hours')`
    )
      .bind(deploymentId)
      .first();

    const variantsServed = (variantsResult?.count as number) || 0;

    if (period === '24h') {
      return {
        requests24h: requests,
        variantsServed24h: variantsServed,
        requests7d: 0,
        variantsServed7d: 0,
      };
    } else {
      return {
        requests24h: 0,
        variantsServed24h: 0,
        requests7d: requests,
        variantsServed7d: variantsServed,
      };
    }
  }
}
