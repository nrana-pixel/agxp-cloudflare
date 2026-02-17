/**
 * AES-GCM Encryption utilities for securing Cloudflare API tokens
 * Uses Web Crypto API available in Cloudflare Workers
 */

/**
 * Encrypts plaintext using AES-GCM
 * @param plaintext - The text to encrypt
 * @param keyString - Base64-encoded 256-bit encryption key
 * @returns Base64-encoded string containing IV + ciphertext + auth tag
 */
export async function encryptToken(
  plaintext: string,
  keyString: string
): Promise<string> {
  try {
    // Decode the base64 key
    // Windows fix: trim potential \r\n characters
    const safeKeyString = keyString.trim();
    let keyData = base64ToArrayBuffer(safeKeyString);

    // CRITICAL FIX: Windows/Wrangler sometimes injects \r\n which adds 2 bytes (34 bytes total)
    // We strictly slice to 32 bytes (256 bits) to ensure encryption works
    if (keyData.byteLength > 32) {
      // console.warn(`Warning: Encryption key was ${keyData.byteLength} bytes. Truncating to 32 bytes.`);
      keyData = keyData.slice(0, 32);
    }
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encode plaintext
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as base64
    return arrayBufferToBase64(combined);
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts ciphertext using AES-GCM
 * @param ciphertext - Base64-encoded string containing IV + ciphertext + auth tag
 * @param keyString - Base64-encoded 256-bit encryption key
 * @returns Decrypted plaintext
 */
export async function decryptToken(
  ciphertext: string,
  keyString: string
): Promise<string> {
  try {
    // Decode the base64 key
    const safeKeyString = keyString.trim();
    let keyData = base64ToArrayBuffer(safeKeyString);

    if (keyData.byteLength > 32) {
      keyData = keyData.slice(0, 32);
    }
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decode ciphertext
    const combined = base64ToArrayBuffer(ciphertext);

    // Extract IV (first 12 bytes) and ciphertext (rest)
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a random 256-bit encryption key
 * @returns Base64-encoded key
 */
export async function generateEncryptionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(new Uint8Array(exported));
}

// Helper functions
function arrayBufferToBase64(buffer: Uint8Array): string {
  const bytes = Array.from(buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
