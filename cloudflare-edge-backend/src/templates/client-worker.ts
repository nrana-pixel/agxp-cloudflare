/**
 * Client Worker Template
 * This worker is deployed to the client's Cloudflare account
 * It detects AI bots and serves optimized HTML variants from KV
 */

import type { ClientWorkerEnv } from '../types';

// AI bot patterns to detect
const AI_BOT_PATTERNS = [
  'GPTBot',
  'ChatGPT-User',
  'Claude-Web',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'GoogleOther',
  'PerplexityBot',
  'Perplexity',
  'Applebot-Extended',
  'YouBot',
  'Bytespider',
  'cohere-ai',
  'Meta-ExternalAgent',
  'OAI-SearchBot',
];

/**
 * Checks if a user agent is an AI bot
 */
function isAIBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return AI_BOT_PATTERNS.some(pattern => ua.includes(pattern.toLowerCase()));
}

/**
 * Identifies which bot type from the user agent
 */
function identifyBot(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  const matched = AI_BOT_PATTERNS.find(pattern => ua.includes(pattern.toLowerCase()));
  return matched || 'Unknown';
}

/**
 * Logs analytics event back to the main API
 */
async function logAnalytics(
  env: ClientWorkerEnv,
  data: {
    path: string;
    userAgent: string;
    botType: string;
    variantServed: boolean;
    timestamp: string;
  }
): Promise<void> {
  try {
    await fetch(`${env.API_ENDPOINT}/v1/analytics/log`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLIENT_API_KEY}`,
        'Content-Type': 'application/json',
        'X-SITE-ID': env.SITE_ID,
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Logging should never block or throw
    console.error('Analytics logging failed:', error);
  }
}

/**
 * Main fetch handler
 */
export default {
  async fetch(
    request: Request,
    env: ClientWorkerEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const userAgent = request.headers.get('user-agent') || '';
    const timestamp = new Date().toISOString();

    // Check if this is an AI bot
    if (isAIBot(userAgent)) {
      const botType = identifyBot(userAgent);

      // Try to get variant from KV
      // URL-encode the path for KV key
      const kvKey = encodeURIComponent(path);
      const variant = await env.VARIANTS.get(kvKey);

      if (variant) {
        // Serve the variant
        const response = new Response(variant, {
          headers: {
            'content-type': 'text/html;charset=UTF-8',
            'cache-control': 'public, max-age=3600',
            'x-served-by': 'AXP',
            'x-bot-type': botType,
          },
        });

        // Log analytics (non-blocking)
        ctx.waitUntil(
          logAnalytics(env, {
            path,
            userAgent,
            botType,
            variantServed: true,
            timestamp,
          })
        );

        return response;
      } else {
        // No variant found, log and fall through to origin
        ctx.waitUntil(
          logAnalytics(env, {
            path,
            userAgent,
            botType,
            variantServed: false,
            timestamp,
          })
        );
      }
    }

    // Not an AI bot or no variant - fetch from origin
    return fetch(request);
  },
};

/**
 * Returns the client worker code as a string for deployment
 */
export function getClientWorkerCode(): string {
  return `// AI-Optimized Variant Worker
// Deployed by AXP Edge Delivery

const AI_BOT_PATTERNS = [
  'GPTBot',
  'ChatGPT-User',
  'Claude-Web',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'GoogleOther',
  'PerplexityBot',
  'Perplexity',
  'Applebot-Extended',
  'YouBot',
  'Bytespider',
  'cohere-ai',
  'Meta-ExternalAgent',
  'OAI-SearchBot',
];

function isAIBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return AI_BOT_PATTERNS.some(pattern => ua.includes(pattern.toLowerCase()));
}

function identifyBot(userAgent) {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  const matched = AI_BOT_PATTERNS.find(pattern => ua.includes(pattern.toLowerCase()));
  return matched || 'Unknown';
}

async function logAnalytics(env, data) {
  try {
    await fetch(\`\${env.API_ENDPOINT}/v1/analytics/log\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${env.CLIENT_API_KEY}\`,
        'Content-Type': 'application/json',
        'X-SITE-ID': env.SITE_ID,
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Analytics logging failed:', error);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const userAgent = request.headers.get('user-agent') || '';
    const timestamp = new Date().toISOString();

    if (isAIBot(userAgent)) {
      const botType = identifyBot(userAgent);
      const kvKey = encodeURIComponent(path);
      const variant = await env.VARIANTS.get(kvKey);

      if (variant) {
        const response = new Response(variant, {
          headers: {
            'content-type': 'text/html;charset=UTF-8',
            'cache-control': 'public, max-age=3600',
            'x-served-by': 'AXP',
            'x-bot-type': botType,
          },
        });

        ctx.waitUntil(
          logAnalytics(env, {
            path,
            userAgent,
            botType,
            variantServed: true,
            timestamp,
          })
        );

        return response;
      } else {
        ctx.waitUntil(
          logAnalytics(env, {
            path,
            userAgent,
            botType,
            variantServed: false,
            timestamp,
          })
        );
      }
    }

    return fetch(request);
  },
};`;
}

