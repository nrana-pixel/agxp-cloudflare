import { Context, Next } from 'hono';
import type { Env, JwtPayload } from '../types';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches userId to context
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    
    // Attach user info to context
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);

    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }
}

/**
 * Verifies a JWT token
 */
async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature
  const data = `${headerB64}.${payloadB64}`;
  const expectedSignature = await sign(data, secret);

  if (signatureB64 !== expectedSignature) {
    throw new Error('Invalid signature');
  }

  // Decode payload
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload;

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Signs data using HMAC-SHA256
 */
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return arrayBufferToBase64Url(new Uint8Array(signature));
}

function arrayBufferToBase64Url(buffer: Uint8Array): string {
  const bytes = Array.from(buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Optional: Creates a JWT token (for testing or user creation)
 */
export async function createJwt(payload: Omit<JwtPayload, 'exp'>, secret: string, expiresIn: number = 86400): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JwtPayload = {
    ...payload,
    exp: now + expiresIn
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const data = `${headerB64}.${payloadB64}`;
  const signature = await sign(data, secret);

  return `${data}.${signature}`;
}
