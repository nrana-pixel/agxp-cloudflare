/**
 * Content Generation Service
 * Handles Firecrawl crawling and Gemini content optimization
 */

import type { Env } from '../types';

interface CrawlResult {
  success: boolean;
  data?: {
    html?: string;
    markdown?: string;
    summary?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
metadata?: {
    statusCode?: number;
  };
  error?: string;
}

interface GeminiCandidate {
  content: {
    parts: Array<{ text?: string }>;
  }[];
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message: string };
}

export class ContentGenerationService {
  constructor(private env: Env) {}

  async crawlSourceUrl(url: string): Promise<{ html: string; title?: string }> {
    if (!this.env.FIRECRAWL_API_KEY) {
      throw new Error('Missing FIRECRAWL_API_KEY env binding');
    }

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ['html', 'markdown', 'summary'],
        maxAge: 0,
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Firecrawl scrape failed: ${text}`);
    }

    const data = (await response.json()) as CrawlResult;

    if (!data.success || !data.data?.html) {
      throw new Error('Firecrawl scrape did not return HTML content');
    }

    return {
      html: data.data.html,
      title: data.data.metadata?.title,
    };
  }

  async optimizeContent(html: string, instructions?: string): Promise<string> {
    if (!this.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY env binding');
    }

    const prompt = this.buildPrompt(html, instructions);

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API request failed: ${text}`);
    }

    const data = (await response.json()) as GeminiResponse;

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!output) {
      throw new Error('Gemini response missing content');
    }

    const cleanedOutput = output.replace(/<!--[\s\S]*?-->/g, '').trim();

    if (!cleanedOutput) {
      throw new Error('Gemini response missing usable content');
    }

    return cleanedOutput;
  }

  private buildPrompt(sourceHtml: string, instructions?: string): string {
    const baseInstructions = `You are an expert conversion copywriter.
Convert the provided HTML into optimized HTML aimed at AI crawlers (GPTBot, ClaudeBot, Perplexity) while keeping:
- the exact document structure, hierarchy, and section order
- every existing section, link, image, and CTA (update copy but do not add/remove sections)
- semantic HTML5 structure
- important metadata (title, description, canonical, OpenGraph)
- readable text and CTAs

Strict requirements:
- Do NOT introduce new sections, stats, partners, or claims that are not present in the source
- Do NOT remove existing sections or links
- Do NOT include HTML comments, template hints, or placeholder text
- Keep href/src values untouched

Focus on:
- concise messaging
- clear value propositions
- bullet lists and scannable sections
- premium tone and trustworthy voice

Return only valid HTML. Do not include markdown, explanations, or comments.`;

    const customInstructions = instructions?.trim()
      ? `
Additional direction:
${instructions.trim()}`
      : '';

    return `${baseInstructions}${customInstructions}

Source HTML:
${sourceHtml}`;
  }
}
