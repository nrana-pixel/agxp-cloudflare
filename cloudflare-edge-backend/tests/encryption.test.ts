/**
 * Encryption Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { encryptToken, decryptToken, generateEncryptionKey } from '../src/utils/encryption';

describe('Encryption', () => {
  let encryptionKey: string;

  beforeAll(async () => {
    // Generate a test encryption key
    encryptionKey = await generateEncryptionKey();
  });

  describe('encryptToken and decryptToken', () => {
    it('should encrypt and decrypt a token successfully', async () => {
      const plaintext = 'my-secret-cloudflare-token-12345';
      
      const encrypted = await encryptToken(plaintext, encryptionKey);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      
      const decrypted = await decryptToken(encrypted, encryptionKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext', async () => {
      const plaintext = 'my-secret-token';
      
      const encrypted1 = await encryptToken(plaintext, encryptionKey);
      const encrypted2 = await encryptToken(plaintext, encryptionKey);
      
      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same plaintext
      expect(await decryptToken(encrypted1, encryptionKey)).toBe(plaintext);
      expect(await decryptToken(encrypted2, encryptionKey)).toBe(plaintext);
    });

    it('should handle long tokens', async () => {
      const longToken = 'a'.repeat(1000);
      
      const encrypted = await encryptToken(longToken, encryptionKey);
      const decrypted = await decryptToken(encrypted, encryptionKey);
      
      expect(decrypted).toBe(longToken);
    });

    it('should handle special characters', async () => {
      const specialToken = 'token-with-special-chars-!@#$%^&*()_+{}[]|\\:";\'<>?,./';
      
      const encrypted = await encryptToken(specialToken, encryptionKey);
      const decrypted = await decryptToken(encrypted, encryptionKey);
      
      expect(decrypted).toBe(specialToken);
    });

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = 'my-secret-token';
      const wrongKey = await generateEncryptionKey();
      
      const encrypted = await encryptToken(plaintext, encryptionKey);
      
      await expect(decryptToken(encrypted, wrongKey)).rejects.toThrow();
    });

    it('should fail to decrypt tampered ciphertext', async () => {
      const plaintext = 'my-secret-token';
      
      const encrypted = await encryptToken(plaintext, encryptionKey);
      
      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -5) + 'XXXXX';
      
      await expect(decryptToken(tampered, encryptionKey)).rejects.toThrow();
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid base64 key', async () => {
      const key = await generateEncryptionKey();
      
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
      
      // Should be valid base64
      expect(() => atob(key)).not.toThrow();
    });

    it('should generate different keys each time', async () => {
      const key1 = await generateEncryptionKey();
      const key2 = await generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });
  });
});
