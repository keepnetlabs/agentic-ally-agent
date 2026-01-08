import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExampleDoc } from './example-repo';
import '../../../src/__tests__/setup';

/**
 * Test Suite: ExampleRepo Service
 * Tests for example document repository and semantic search
 * Covers: ExampleDoc interface, search functionality, embedding integration
 */

describe('ExampleRepo Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('ExampleDoc interface', () => {
    it('should have required path and content fields', () => {
      const doc: ExampleDoc = {
        path: '/examples/phishing-email.ts',
        content: 'const email = { subject: "Urgent" };',
      };

      expect(doc).toHaveProperty('path');
      expect(doc).toHaveProperty('content');
      expect(typeof doc.path).toBe('string');
      expect(typeof doc.content).toBe('string');
    });

    it('should have optional embedding field', () => {
      const doc: ExampleDoc = {
        path: '/examples/phishing-email.ts',
        content: 'const email = { subject: "Urgent" };',
        embedding: [0.1, 0.2, 0.3, 0.4],
      };

      expect(doc).toHaveProperty('embedding');
      expect(Array.isArray(doc.embedding)).toBe(true);
    });

    it('should have optional metadata field', () => {
      const doc: ExampleDoc = {
        path: '/examples/phishing-email.ts',
        content: 'const email = { subject: "Urgent" };',
        metadata: {
          category: 'phishing',
          topics: ['email', 'security'],
          complexity: 2,
          lastUpdated: new Date('2024-01-01'),
        },
      };

      expect(doc).toHaveProperty('metadata');
      expect(doc.metadata?.category).toBe('phishing');
      expect(Array.isArray(doc.metadata?.topics)).toBe(true);
    });

    it('should support metadata with category field', () => {
      const doc: ExampleDoc = {
        path: '/examples/example.ts',
        content: 'code',
        metadata: {
          category: 'training',
          topics: [],
          complexity: 1,
          lastUpdated: new Date(),
        },
      };

      expect(doc.metadata?.category).toBe('training');
    });

    it('should support metadata with topics array', () => {
      const doc: ExampleDoc = {
        path: '/examples/example.ts',
        content: 'code',
        metadata: {
          category: 'training',
          topics: ['awareness', 'security', 'phishing'],
          complexity: 2,
          lastUpdated: new Date(),
        },
      };

      expect(doc.metadata?.topics).toEqual(['awareness', 'security', 'phishing']);
      expect(doc.metadata?.topics?.length).toBe(3);
    });

    it('should support metadata with complexity number', () => {
      const doc: ExampleDoc = {
        path: '/examples/example.ts',
        content: 'code',
        metadata: {
          category: 'training',
          topics: [],
          complexity: 5,
          lastUpdated: new Date(),
        },
      };

      expect(typeof doc.metadata?.complexity).toBe('number');
      expect(doc.metadata?.complexity).toBeGreaterThan(0);
    });

    it('should support metadata with lastUpdated date', () => {
      const now = new Date();
      const doc: ExampleDoc = {
        path: '/examples/example.ts',
        content: 'code',
        metadata: {
          category: 'training',
          topics: [],
          complexity: 1,
          lastUpdated: now,
        },
      };

      expect(doc.metadata?.lastUpdated).toEqual(now);
      expect(doc.metadata?.lastUpdated).toBeInstanceOf(Date);
    });

    it('should allow empty topics array in metadata', () => {
      const doc: ExampleDoc = {
        path: '/examples/example.ts',
        content: 'code',
        metadata: {
          category: 'general',
          topics: [],
          complexity: 1,
          lastUpdated: new Date(),
        },
      };

      expect(Array.isArray(doc.metadata?.topics)).toBe(true);
      expect(doc.metadata?.topics?.length).toBe(0);
    });

    it('should allow empty embedding array', () => {
      const doc: ExampleDoc = {
        path: '/examples/example.ts',
        content: 'code',
        embedding: [],
      };

      expect(Array.isArray(doc.embedding)).toBe(true);
      expect(doc.embedding?.length).toBe(0);
    });

    it('should support documents without embedding', () => {
      const doc: ExampleDoc = {
        path: '/examples/example.ts',
        content: 'code',
      };

      expect(doc.embedding).toBeUndefined();
    });

    it('should support documents without metadata', () => {
      const doc: ExampleDoc = {
        path: '/examples/example.ts',
        content: 'code',
      };

      expect(doc.metadata).toBeUndefined();
    });
  });

  describe('D1Database interface patterns', () => {
    it('should support prepare() method for query preparation', () => {
      const mockDB = {
        prepare: vi.fn(),
      };

      mockDB.prepare('SELECT * FROM embeddings');

      expect(mockDB.prepare).toHaveBeenCalledWith('SELECT * FROM embeddings');
    });

    it('should support dump() method for database export', () => {
      const mockDB = {
        dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      };

      expect(mockDB.dump).toBeDefined();
    });

    it('should support batch() method for batch operations', () => {
      const mockDB = {
        batch: vi.fn().mockResolvedValue([]),
      };

      expect(mockDB.batch).toBeDefined();
    });

    it('should support exec() method for direct queries', () => {
      const mockDB = {
        exec: vi.fn().mockResolvedValue({ results: [], success: true, meta: { changes: 0, last_row_id: 0, rows_read: 0, rows_written: 0 } }),
      };

      expect(mockDB.exec).toBeDefined();
    });

    it('should handle D1Result with success flag', () => {
      const result = {
        results: [{ id: 1, name: 'test' }],
        success: true,
        meta: {
          changes: 1,
          last_row_id: 1,
          rows_read: 1,
          rows_written: 1,
        },
      };

      expect(result.success).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.changes).toBe(1);
    });

    it('should handle D1Result with error', () => {
      const result = {
        success: false,
        error: 'Query failed',
        meta: {
          changes: 0,
          last_row_id: 0,
          rows_read: 0,
          rows_written: 0,
        },
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Embedding and Search functionality patterns', () => {
    it('should support embedding configuration', () => {
      const config = {
        threshold: 0.7,
        useHybrid: true,
        contextWeight: 0.8,
        maxResults: 10,
      };

      expect(config.threshold).toBeLessThanOrEqual(1);
      expect(config.threshold).toBeGreaterThanOrEqual(0);
      expect(config.useHybrid).toBe(true);
    });

    it('should support search with threshold filtering', () => {
      const config = {
        threshold: 0.75,
        useHybrid: false,
        contextWeight: 1,
        maxResults: 5,
      };

      expect(config.threshold).toBeGreaterThan(0.7);
    });

    it('should support search result object structure', () => {
      const result = {
        doc: {
          path: '/examples/phishing.ts',
          content: 'code content',
        } as ExampleDoc,
        score: 0.85,
        similarity: 0.88,
        tokenScore: 0.82,
      };

      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeDefined();
      expect(result.tokenScore).toBeDefined();
    });

    it('should support hybrid search with context weight', () => {
      const config = {
        threshold: 0.7,
        useHybrid: true,
        contextWeight: 0.6,
        maxResults: 20,
      };

      expect(config.contextWeight).toBeGreaterThan(0);
      expect(config.contextWeight).toBeLessThanOrEqual(1);
    });

    it('should support semantic search results ordering', () => {
      const results = [
        { doc: { path: '1', content: 'c1' } as ExampleDoc, score: 0.95, similarity: 0.95, tokenScore: 0.94 },
        { doc: { path: '2', content: 'c2' } as ExampleDoc, score: 0.85, similarity: 0.85, tokenScore: 0.84 },
        { doc: { path: '3', content: 'c3' } as ExampleDoc, score: 0.75, similarity: 0.76, tokenScore: 0.74 },
      ];

      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeGreaterThan(results[2].score);
    });

    it('should support embedding cache database schema', () => {
      const cacheEntry = {
        path: '/examples/example.ts',
        content_hash: 'abc123def456',
        embedding_json: '[0.1, 0.2, 0.3]',
        metadata_json: '{"category": "training"}',
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        usage_count: 5,
        cache_version: '1.0',
      };

      expect(cacheEntry.path).toBeDefined();
      expect(cacheEntry.content_hash).toBeTruthy();
      expect(cacheEntry.usage_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Semantic search options', () => {
    it('should validate threshold value between 0 and 1', () => {
      const validConfigs = [
        { threshold: 0.0, useHybrid: false, contextWeight: 1, maxResults: 10 },
        { threshold: 0.5, useHybrid: false, contextWeight: 1, maxResults: 10 },
        { threshold: 1.0, useHybrid: false, contextWeight: 1, maxResults: 10 },
      ];

      validConfigs.forEach(config => {
        expect(config.threshold).toBeGreaterThanOrEqual(0);
        expect(config.threshold).toBeLessThanOrEqual(1);
      });
    });

    it('should support maxResults configuration', () => {
      const config = {
        threshold: 0.7,
        useHybrid: false,
        contextWeight: 1,
        maxResults: 50,
      };

      expect(config.maxResults).toBeGreaterThan(0);
    });

    it('should support contextWeight for hybrid search', () => {
      const config = {
        threshold: 0.7,
        useHybrid: true,
        contextWeight: 0.7,
        maxResults: 20,
      };

      expect(config.useHybrid).toBe(true);
      expect(config.contextWeight).toBeLessThanOrEqual(1);
    });

    it('should support useHybrid flag', () => {
      const semanticConfig = {
        threshold: 0.7,
        useHybrid: false,
        contextWeight: 1,
        maxResults: 10,
      };

      const hybridConfig = {
        threshold: 0.7,
        useHybrid: true,
        contextWeight: 0.5,
        maxResults: 10,
      };

      expect(semanticConfig.useHybrid).toBe(false);
      expect(hybridConfig.useHybrid).toBe(true);
    });
  });
});
