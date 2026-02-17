/**
 * AI Bot Detection Tests
 */

import { describe, it, expect } from 'vitest';

// AI bot patterns
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

function isAIBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return AI_BOT_PATTERNS.some(pattern => ua.includes(pattern.toLowerCase()));
}

function identifyBot(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  const matched = AI_BOT_PATTERNS.find(pattern => ua.includes(pattern.toLowerCase()));
  return matched || 'Unknown';
}

describe('AI Bot Detection', () => {
  describe('isAIBot', () => {
    it('should detect GPTBot', () => {
      expect(isAIBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)')).toBe(true);
    });

    it('should detect ClaudeBot', () => {
      expect(isAIBot('ClaudeBot/1.0')).toBe(true);
    });

    it('should detect Google-Extended', () => {
      expect(isAIBot('Mozilla/5.0 (compatible; Google-Extended)')).toBe(true);
    });

    it('should detect PerplexityBot', () => {
      expect(isAIBot('PerplexityBot/1.0')).toBe(true);
    });

    it('should not detect regular browsers', () => {
      expect(isAIBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
    });

    it('should not detect Googlebot (regular crawler)', () => {
      expect(isAIBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(false);
    });

    it('should handle empty user agent', () => {
      expect(isAIBot('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isAIBot('gptbot/1.0')).toBe(true);
      expect(isAIBot('GPTBOT/1.0')).toBe(true);
    });
  });

  describe('identifyBot', () => {
    it('should identify GPTBot', () => {
      expect(identifyBot('GPTBot/1.0')).toBe('GPTBot');
    });

    it('should identify ClaudeBot', () => {
      expect(identifyBot('ClaudeBot/1.0')).toBe('ClaudeBot');
    });

    it('should return Unknown for non-AI bots', () => {
      expect(identifyBot('Mozilla/5.0 Chrome/91.0')).toBe('Unknown');
    });

    it('should return Unknown for empty user agent', () => {
      expect(identifyBot('')).toBe('Unknown');
    });

    it('should be case-insensitive', () => {
      expect(identifyBot('gptbot/1.0')).toBe('GPTBot');
    });
  });
});
