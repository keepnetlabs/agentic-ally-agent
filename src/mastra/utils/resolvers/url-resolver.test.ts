import { describe, expect, it, vi } from 'vitest';
import { resolveResourceUrls, getResourcesForScene8 } from './url-resolver';

// Mock logger to reduce noise
vi.mock('../core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('url-resolver', () => {
  describe('resolveResourceUrls', () => {
    it('returns topic-specific URLs when match found', () => {
      const result = resolveResourceUrls('phishing', 'THREAT');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toContain('Phishing');
      // Check if we got the specific phishing entries, not generico
      const isSpecific = result.some(r => r.url.includes('phishing-examples') || r.title.includes('Phishing'));
      expect(isSpecific).toBe(true);
    });

    it('falls back to category when topic not found', () => {
      const result = resolveResourceUrls('unknown-topic-xyz', 'THREAT');
      expect(result.length).toBeGreaterThan(0);
      // Should return THREAT category items
      const isThreat = result.every(r => r.category === 'THREAT');
      expect(isThreat).toBe(true);
    });

    it('forces DEVELOPMENT category for code topics', () => {
      // "unknown-topic" would normally fallback to "PROCESS" if we passed "PROCESS"
      // But isCode=true should force "DEVELOPMENT"
      const result = resolveResourceUrls('unknown-topic-code', 'PROCESS', true);
      expect(result.length).toBeGreaterThan(0);
      const isDev = result.every(r => r.category === 'DEVELOPMENT');
      expect(isDev).toBe(true);
    });

    it('falls back to GENERIC if category also empty', () => {
      // Passing an invalid category
      const result = resolveResourceUrls('unknown-topic', 'INVALID_CAT');
      expect(result.length).toBeGreaterThan(0);
      const isGeneric = result.every(r => r.category === 'GENERIC');
      expect(isGeneric).toBe(true);
    });
  });

  describe('getResourcesForScene8', () => {
    it('uses keyTopics for resolution if available', () => {
      const analysis = {
        topic: 'General Stuff',
        category: 'PROCESS',
        keyTopics: ['Ransomware'], // specific topic
      };
      const result = getResourcesForScene8(analysis);
      expect(result.length).toBeGreaterThan(0);
      // Should find ransomware resources
      const hasRansomware = result.some(r => r.title.includes('Ransomware') || r.url.includes('ransomware'));
      expect(hasRansomware).toBe(true);
    });

    it('falls back to regular topic resolution if keyTopics missing', () => {
      const analysis = {
        topic: 'Phishing',
        category: 'THREAT',
      };
      const result = getResourcesForScene8(analysis);
      expect(result.length).toBeGreaterThan(0);
      const isPhishing = result.some(r => r.title.includes('Phishing'));
      expect(isPhishing).toBe(true);
    });
  });
});
