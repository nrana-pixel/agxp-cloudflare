/**
 * Hashing utilities for API keys using SHA-256
 * Uses Web Crypto API available in Cloudflare Workers
 */

/**
 * Generates a random API key with format: sk_live_{32_random_chars}
 * @returns API key string
 */
export function generateApiKey(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  const randomString = arrayBufferToBase64Url(randomBytes);
  return `sk_live_${randomString}`;
}

/**
 * Hashes an API key using SHA-256
 * @param apiKey - The API key to hash
 * @returns Hex-encoded hash
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(new Uint8Array(hashBuffer));
}

/**
 * Verifies an API key against a stored hash
 * @param apiKey - The API key to verify
 * @param storedHash - The stored hash to compare against
 * @returns True if the key matches the hash
 */
export async function verifyApiKey(
  apiKey: string,
  storedHash: string
): Promise<boolean> {
  const computedHash = await hashApiKey(apiKey);
  return computedHash === storedHash;
}

/**
 * Generates a content hash for variant content
 * @param content - The HTML content to hash
 * @returns Hex-encoded hash
 */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(new Uint8Array(hashBuffer));
}

// Helper functions
function arrayBufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function arrayBufferToBase64Url(buffer: Uint8Array): string {
  const bytes = Array.from(buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
