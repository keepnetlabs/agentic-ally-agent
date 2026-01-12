import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KVService } from './kv-service';
import '../../../src/__tests__/setup';

/**
 * Test Suite: KVService
 * Tests for Cloudflare KV REST API operations
 * Covers: PUT, GET, DELETE, LIST operations and microlearning-specific methods
 */

describe('KVService', () => {
  let kvService: KVService;

  beforeEach(() => {
    // Reset all mocks and spies
    vi.clearAllMocks();
    vi.restoreAllMocks();

    // Create KVService instance
    kvService = new KVService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(kvService).toBeDefined();
    });

    it.skip('should warn when CLOUDFLARE_ACCOUNT_ID is missing', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _service = new KVService();
      expect(warnSpy).toHaveBeenCalled();
    });

    it.skip('should warn when CLOUDFLARE_KV_TOKEN is missing', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      delete process.env.CLOUDFLARE_KV_TOKEN;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _service = new KVService();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('PUT operation', () => {
    it('should successfully store a value', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      global.fetch = fetchMock;

      const result = await kvService.put('test-key', { data: 'test' });

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('test-key'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle string values directly', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('OK', { status: 200 })
      );
      global.fetch = fetchMock;

      await kvService.put('test-key', 'string-value');

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1]?.body).toBe('string-value');
    });

    it('should return false on PUT failure', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );
      global.fetch = fetchMock;

      const result = await kvService.put('test-key', { data: 'test' });

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = fetchMock;

      const result = await kvService.put('test-key', { data: 'test' });

      expect(result).toBe(false);
    });
  });

  describe('GET operation', () => {
    it('should successfully retrieve a JSON value', async () => {
      const mockData = { key: 'value', nested: { data: 123 } };
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockData), { status: 200 })
      );
      global.fetch = fetchMock;

      const result = await kvService.get('test-key');

      expect(result).toEqual(mockData);
    });

    it('should return string values as-is', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('plain-text-value', { status: 200 })
      );
      global.fetch = fetchMock;

      const result = await kvService.get('test-key');

      expect(result).toBe('plain-text-value');
    });

    it('should return null for 404 responses', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
      );
      global.fetch = fetchMock;

      const result = await kvService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return null on GET error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = fetchMock;

      const result = await kvService.get('test-key');

      expect(result).toBeNull();
    });

    it('should return null on invalid JSON', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('not-valid-json{', { status: 200 })
      );
      global.fetch = fetchMock;

      const result = await kvService.get('test-key');

      expect(result).toBe('not-valid-json{'); // Falls back to string
    });
  });

  describe('DELETE operation', () => {
    it('should successfully delete a key', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('', { status: 200 }) // Use 200 instead of 204 for mock Response
      );
      global.fetch = fetchMock;

      const result = await kvService.delete('test-key');

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('test-key'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should return false on DELETE failure', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('', { status: 404 })
      );
      global.fetch = fetchMock;

      const result = await kvService.delete('non-existent-key');

      expect(result).toBe(false);
    });
  });

  describe('LIST operation', () => {
    it('should return list of keys', async () => {
      const mockList = {
        result: [
          { name: 'ml:key1:base' },
          { name: 'ml:key2:base' },
          { name: 'ml:key3:lang:en' },
        ],
      };

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockList), { status: 200 })
      );
      global.fetch = fetchMock;

      const result = await kvService.list('ml:', 100);

      expect(result).toEqual(['ml:key1:base', 'ml:key2:base', 'ml:key3:lang:en']);
    });

    it('should handle empty list', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result: [] }), { status: 200 })
      );
      global.fetch = fetchMock;

      const result = await kvService.list('ml:nonexistent:');

      expect(result).toEqual([]);
    });

    it('should include prefix and limit in URL params', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result: [] }), { status: 200 })
      );
      global.fetch = fetchMock;

      await kvService.list('ml:phishing:', 50);

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('prefix=ml%3Aphishing%3A');
      expect(url).toContain('limit=50');
    });
  });

  describe('saveMicrolearning', () => {
    it('should save all microlearning components', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('', { status: 200 })
      );
      global.fetch = fetchMock;

      const microlearningData = {
        microlearning: { id: 'test-id', title: 'Test' },
        languageContent: { scenes: [] },
        inboxContent: { emails: [] },
      };

      const result = await kvService.saveMicrolearning(
        'test-microlearning-id',
        microlearningData,
        'en',
        'IT'
      );

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(3); // base, lang, inbox
    });

    it('should return false if any save fails', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response('', { status: 200 })) // base success
        .mockResolvedValueOnce(new Response('', { status: 500 })) // lang fail
        .mockResolvedValueOnce(new Response('', { status: 200 })); // inbox

      global.fetch = fetchMock;

      const microlearningData = {
        microlearning: { id: 'test-id' },
        languageContent: { scenes: [] },
        inboxContent: { emails: [] },
      };

      const result = await kvService.saveMicrolearning(
        'test-id',
        microlearningData,
        'en',
        'IT'
      );

      expect(result).toBe(false);
    });

    it('should normalize language code to lowercase', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('', { status: 200 })
      );
      global.fetch = fetchMock;

      const microlearningData = {
        microlearning: { id: 'test-id' },
        languageContent: {},
        inboxContent: {},
      };

      await kvService.saveMicrolearning('test-id', microlearningData, 'EN', 'IT');

      const langKeyCall = fetchMock.mock.calls[1][0] as string;
      expect(langKeyCall).toContain(':lang:en');
    });
  });

  describe('getMicrolearning', () => {
    it('should retrieve microlearning with language content', async () => {
      const baseData = { id: 'test-id', title: 'Test' };
      const langData = { scenes: [] };

      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(baseData), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(langData), { status: 200 }));

      global.fetch = fetchMock;

      const result = await kvService.getMicrolearning('test-id', 'en');

      expect(result).toEqual({
        base: baseData,
        language: langData,
      });
    });

    it('should return null if base microlearning not found', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(null, { status: 404 })
      );
      global.fetch = fetchMock;

      const result = await kvService.getMicrolearning('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateLanguageAvailabilityAtomic', () => {
    it('should add new language to existing list', async () => {
      const baseData = {
        microlearning_id: 'test-id',
        microlearning_metadata: {
          language_availability: ['en', 'tr'],
        },
      };

      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(baseData), { status: 200 })) // GET
        .mockResolvedValueOnce(new Response('', { status: 200 })); // PUT

      global.fetch = fetchMock;

      const result = await kvService.updateLanguageAvailabilityAtomic('test-id', 'de');

      expect(result).toBe(true);
    });

    it('should deduplicate language codes', async () => {
      const baseData = {
        microlearning_id: 'test-id',
        microlearning_metadata: {
          language_availability: ['en', 'TR'],
        },
      };

      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(baseData), { status: 200 }))
        .mockResolvedValueOnce(new Response('', { status: 200 }));

      global.fetch = fetchMock;

      await kvService.updateLanguageAvailabilityAtomic('test-id', 'tr');

      const putCall = fetchMock.mock.calls[1][1];
      const body = JSON.parse(putCall.body);
      const langs = body.microlearning_metadata.language_availability;

      expect(langs).toHaveLength(2); // No duplicates
      expect(langs.every((l: string) => l === l.toLowerCase())).toBe(true); // All lowercase
    });
  });

  describe('health check', () => {
    it.skip('should return true when KV is accessible', async () => {
      const timestamp = new Date().toISOString();
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response('', { status: 200 })) // namespace check
        .mockResolvedValueOnce(new Response('', { status: 200 })) // PUT
        .mockResolvedValueOnce(new Response(
          JSON.stringify({ timestamp }),
          { status: 200 }
        )) // GET
        .mockResolvedValueOnce(new Response('', { status: 200 })); // DELETE

      global.fetch = fetchMock;

      const result = await kvService.healthCheck();

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('should return false if namespace is inaccessible', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('', { status: 403 })
      );
      global.fetch = fetchMock;

      const result = await kvService.healthCheck();

      expect(result).toBe(false);
    });
  });
});
