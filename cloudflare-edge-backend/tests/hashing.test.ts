/**
 * Hashing Tests
 */

import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey, verifyApiKey, hashContent } from '../src/utils/hashing';

describe('Hashing', () => {
  describe('generateApiKey', () => {
    it('should generate a key with correct format', () => {
      const key = generateApiKey();
      
      expect(key).toMatch(/^sk_live_[A-Za-z0-9_-]+$/);
    });

    it('should generate different keys each time', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      
      expect(key1).not.toBe(key2);
    });

    it('should generate keys of reasonable length', () => {
      const key = generateApiKey();
      
      // sk_live_ (8 chars) + base64url encoded 24 bytes (32 chars) = 40 chars
      expect(key.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('hashApiKey', () => {
    it('should hash an API key', async () => {
      const apiKey = 'sk_live_test123456789';
      const hash = await hashApiKey(apiKey);
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should produce consistent hashes for the same key', async () => {
      const apiKey = 'sk_live_test123456789';
      
      const hash1 = await hashApiKey(apiKey);
      const hash2 = await hashApiKey(apiKey);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different keys', async () => {
      const key1 = 'sk_live_test123';
      const key2 = 'sk_live_test456';
      
      const hash1 = await hashApiKey(key1);
      const hash2 = await hashApiKey(key2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyApiKey', () => {
    it('should verify a correct API key', async () => {
      const apiKey = 'sk_live_test123456789';
      const hash = await hashApiKey(apiKey);
      
      const isValid = await verifyApiKey(apiKey, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect API key', async () => {
      const correctKey = 'sk_live_correct';
      const wrongKey = 'sk_live_wrong';
      
      const hash = await hashApiKey(correctKey);
      
      const isValid = await verifyApiKey(wrongKey, hash);
      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const apiKey = 'sk_live_TestKey';
      const hash = await hashApiKey(apiKey);
      
      const isValid = await verifyApiKey('sk_live_testkey', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('hashContent', () => {
    it('should hash HTML content', async () => {
      const content = '<html><body><h1>Hello World</h1></body></html>';
      const hash = await hashContent(content);
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256
    });

    it('should produce consistent hashes for the same content', async () => {
      const content = '<html><body>Test</body></html>';
      
      const hash1 = await hashContent(content);
      const hash2 = await hashContent(content);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', async () => {
      const content1 = '<html><body>Version 1</body></html>';
      const content2 = '<html><body>Version 2</body></html>';
      
      const hash1 = await hashContent(content1);
      const hash2 = await hashContent(content2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should be sensitive to whitespace changes', async () => {
      const content1 = '<html><body>Test</body></html>';
      const content2 = '<html><body> Test </body></html>';
      
      const hash1 = await hashContent(content1);
      const hash2 = await hashContent(content2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('End-to-end API key workflow', () => {
    it('should generate, hash, and verify a key', async () => {
      // Generate a new API key
      const apiKey = generateApiKey();
      
      // Hash it for storage
      const hash = await hashApiKey(apiKey);
      
      // Verify the original key
      const isValid = await verifyApiKey(apiKey, hash);
      expect(isValid).toBe(true);
      
      // Verify a wrong key fails
      const wrongKey = generateApiKey();
      const isWrongValid = await verifyApiKey(wrongKey, hash);
      expect(isWrongValid).toBe(false);
    });
  });
});
