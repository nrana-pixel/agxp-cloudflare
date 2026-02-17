import { Context, Next } from 'hono';
import type { Env } from '../types';

/**
 * Simple rate limiting middleware using KV
 * Limits requests per user per endpoint
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
};

export function rateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get('userId') as number | undefined;
    const path = c.req.path;

    if (!userId) {
      // If no userId, skip rate limiting (public endpoints handle separately)
      await next();
      return;
    }

    const key = `ratelimit:${userId}:${path}`;
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Get current count from KV
      const stored = await c.env.KV_SESSIONS.get(key);
      let requests: number[] = stored ? JSON.parse(stored) : [];

      // Filter out old requests outside the window
      requests = requests.filter(timestamp => timestamp > windowStart);

      // Check if limit exceeded
      if (requests.length >= finalConfig.maxRequests) {
        return c.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((requests[0] + finalConfig.windowMs - now) / 1000)
          },
          429
        );
      }

      // Add current request
      requests.push(now);

      // Store updated requests with TTL
      await c.env.KV_SESSIONS.put(
        key,
        JSON.stringify(requests),
        { expirationTtl: Math.ceil(finalConfig.windowMs / 1000) }
      );

      await next();
    } catch (error) {
      // On error, allow the request through (fail open)
      console.error('Rate limiting error:', error);
      await next();
    }
  };
}

/**
 * Stricter rate limiting for sensitive endpoints like connection
 */
export const strictRateLimit = rateLimitMiddleware({
  maxRequests: 500, // Increased for development
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Standard rate limiting for normal endpoints
 */
export const standardRateLimit = rateLimitMiddleware({
  maxRequests: 100,
  windowMs: 60 * 60 * 1000, // 100 requests per hour
});
