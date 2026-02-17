/**
 * Input validation utilities
 */

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL path format
 */
export function isValidUrlPath(path: string): boolean {
  if (path === '/') {
    return true;
  }

  return path.startsWith('/') && path.length > 1;
}

/**
 * Validates Cloudflare API token format
 */
export function isValidCloudflareToken(token: string): boolean {
  // Basic validation - tokens are typically 40+ characters
  return typeof token === 'string' && token.length >= 40;
}

/**
 * Validates zone ID format
 */
export function isValidZoneId(zoneId: string): boolean {
  // Cloudflare zone IDs are 32-character hex strings
  return /^[a-f0-9]{32}$/i.test(zoneId);
}

/**
 * Validates account ID format
 */
export function isValidAccountId(accountId: string): boolean {
  // Cloudflare account IDs are 32-character hex strings
  return /^[a-f0-9]{32}$/i.test(accountId);
}

/**
 * Sanitizes HTML content (basic)
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - in production, use a proper HTML sanitizer
  return html.trim();
}

/**
 * Validates deployment status
 */
export function isValidDeploymentStatus(status: string): boolean {
  return ['active', 'deleted'].includes(status);
}

/**
 * Validates connection status
 */
export function isValidConnectionStatus(status: string): boolean {
  return ['active', 'disconnected'].includes(status);
}
