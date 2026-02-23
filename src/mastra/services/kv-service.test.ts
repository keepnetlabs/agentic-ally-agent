import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KVService } from './kv-service';
import { getLogger } from '../utils/core/logger';
import '../../../src/__tests__/setup';

vi.mock('../utils/core/logger', async () => {
  const actual = (await vi.importActual('../utils/core/logger')) as any;
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return {
    ...actual,
    getLogger: vi.fn().mockReturnValue(mockLogger),
  };
});

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

    it('should warn when CLOUDFLARE_ACCOUNT_ID is missing', () => {
      const logger = getLogger('KVService');
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _service = new KVService();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('CLOUDFLARE_ACCOUNT_ID'));
    });

    it('should warn when CLOUDFLARE_KV_TOKEN is missing', () => {
      const logger = getLogger('KVService');
      delete process.env.CLOUDFLARE_KV_TOKEN;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _service = new KVService();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('CLOUDFLARE_KV_TOKEN'));
    });
  });

  describe('PUT operation', () => {
    it('should successfully store a value', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
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
      const fetchMock = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }));
      global.fetch = fetchMock;

      await kvService.put('test-key', 'string-value');

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1]?.body).toBe('string-value');
    });

    it('should return false on PUT failure', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
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
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockData), { status: 200 }));
      global.fetch = fetchMock;

      const result = await kvService.get('test-key');

      expect(result).toEqual(mockData);
    });

    it('should return string values as-is', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('plain-text-value', { status: 200 }));
      global.fetch = fetchMock;

      const result = await kvService.get('test-key');

      expect(result).toBe('plain-text-value');
    });

    it('should return null for 404 responses', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }));
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
      const fetchMock = vi.fn().mockResolvedValue(new Response('not-valid-json{', { status: 200 }));
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
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
      global.fetch = fetchMock;

      const result = await kvService.delete('non-existent-key');

      expect(result).toBe(false);
    });
  });

  describe('LIST operation', () => {
    it('should return list of keys', async () => {
      const mockList = {
        result: [{ name: 'ml:key1:base' }, { name: 'ml:key2:base' }, { name: 'ml:key3:lang:en' }],
      };

      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockList), { status: 200 }));
      global.fetch = fetchMock;

      const result = await kvService.list('ml:', 100);

      expect(result).toEqual(['ml:key1:base', 'ml:key2:base', 'ml:key3:lang:en']);
    });

    it('should handle empty list', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: [] }), { status: 200 }));
      global.fetch = fetchMock;

      const result = await kvService.list('ml:nonexistent:');

      expect(result).toEqual([]);
    });

    it('should include prefix and limit in URL params', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: [] }), { status: 200 }));
      global.fetch = fetchMock;

      await kvService.list('ml:phishing:', 50);

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('prefix=ml%3Aphishing%3A');
      expect(url).toContain('limit=50');
    });
  });

  describe('saveMicrolearning', () => {
    it('should save all microlearning components', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
      global.fetch = fetchMock;

      const microlearningData = {
        microlearning: { id: 'test-id', title: 'Test' },
        languageContent: { scenes: [] },
        inboxContent: { emails: [] },
      };

      const result = await kvService.saveMicrolearning('test-microlearning-id', microlearningData, 'en', 'IT');

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(3); // base, lang, inbox
    });

    it('should return false if any save fails', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 200 })) // base success
        .mockResolvedValueOnce(new Response('', { status: 500 })) // lang fail
        .mockResolvedValueOnce(new Response('', { status: 200 })); // inbox

      global.fetch = fetchMock;

      const microlearningData = {
        microlearning: { id: 'test-id' },
        languageContent: { scenes: [] },
        inboxContent: { emails: [] },
      };

      const result = await kvService.saveMicrolearning('test-id', microlearningData, 'en', 'IT');

      expect(result).toBe(false);
    });

    it('should normalize language code to lowercase', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
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

      const fetchMock = vi
        .fn()
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
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
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

      const fetchMock = vi
        .fn()
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

      const fetchMock = vi
        .fn()
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

  describe('getNamespaceId', () => {
    it('should return namespace from override', () => {
      const svc = new KVService('custom-namespace-id');
      expect(svc.getNamespaceId()).toBe('custom-namespace-id');
    });

    it('should return unknown when empty', () => {
      const orig = process.env.MICROLEARNING_KV_NAMESPACE_ID;
      delete process.env.MICROLEARNING_KV_NAMESPACE_ID;
      const svc = new KVService();
      expect(svc.getNamespaceId()).toBe('unknown');
      if (orig) process.env.MICROLEARNING_KV_NAMESPACE_ID = orig;
    });
  });

  describe('savePhishing / getPhishing', () => {
    it('should save and retrieve phishing components', async () => {
      const baseData = { id: 'p1', language_availability: ['en-us'] };
      const emailData = { subject: 'Test', template: '<p>Hi</p>' };
      const landingData = { html: '<div>Landing</div>' };

      const fetchMock = vi.fn().mockImplementation(async (_url: string, opts?: { method?: string; body?: string }) => {
        const method = opts?.method || 'GET';
        if (method === 'PUT') return new Response('', { status: 200 });
        if (method === 'GET') {
          if (_url.includes('phishing:phish-1:base')) return new Response(JSON.stringify(baseData), { status: 200 });
          if (_url.includes('phishing:phish-1:email')) return new Response(JSON.stringify(emailData), { status: 200 });
          if (_url.includes('phishing:phish-1:landing')) return new Response(JSON.stringify(landingData), { status: 200 });
        }
        return new Response('', { status: 404 });
      });

      global.fetch = fetchMock;

      const phishingData = {
        analysis: { name: 'Test', scenario: 'Topic', difficulty: 'Medium', method: 'Click-Only' },
        subject: 'Test',
        template: '<p>Hi</p>',
        fromAddress: 'test@example.com',
        fromName: 'Test',
        landingPage: { html: '<div>Landing</div>' },
      };

      const saveResult = await kvService.savePhishing('phish-1', phishingData, 'en-us');
      expect(saveResult).toBe(true);

      const getResult = await kvService.getPhishing('phish-1', 'en-us');
      expect(getResult).toBeDefined();
      expect(getResult.base).toEqual(baseData);
      expect(getResult.email).toEqual(emailData);
      expect(getResult.landing).toEqual(landingData);
    });

    it('should return null when phishing base not found', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
      global.fetch = fetchMock;

      const result = await kvService.getPhishing('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('saveSmishing / getSmishing', () => {
    it('should save and retrieve smishing components', async () => {
      const baseData = { id: 's1', language_availability: ['en-us'] };
      const smsData = { messages: ['SMS 1'] };
      const landingData = { html: '<div>Landing</div>' };

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 200 }))
        .mockResolvedValueOnce(new Response('', { status: 200 }))
        .mockResolvedValueOnce(new Response('', { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(baseData), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(smsData), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(landingData), { status: 200 }));

      global.fetch = fetchMock;

      const smishingData = {
        analysis: { name: 'Test', scenario: 'Topic', difficulty: 'Medium' },
        messages: ['SMS 1'],
        landingPage: { html: '<div>Landing</div>' },
      };

      const saveResult = await kvService.saveSmishing('smish-1', smishingData, 'en-us');
      expect(saveResult).toBe(true);

      const getResult = await kvService.getSmishing('smish-1', 'en-us');
      expect(getResult).toBeDefined();
      expect(getResult.base).toEqual(baseData);
      expect(getResult.sms).toEqual(smsData);
      expect(getResult.landing).toEqual(landingData);
    });

    it('should skip landing page when data.landingPage is missing', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
      global.fetch = fetchMock;

      const smishingData = {
        analysis: { name: 'Test' },
        messages: ['SMS 1'],
      };

      const result = await kvService.saveSmishing('smish-2', smishingData, 'en-us');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2); // base + sms only
    });
  });

  describe('saveMicrolearning without inbox', () => {
    it('should save base and language only when inboxContent is undefined', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
      global.fetch = fetchMock;

      const data = {
        microlearning: { id: 'ml-1' },
        languageContent: { scenes: [] },
      };

      const result = await kvService.saveMicrolearning('ml-1', data, 'en', 'IT');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2); // base + lang only
    });
  });

  describe('storeLanguageContent / storeInboxContent / getInboxContent', () => {
    it('should store and retrieve language content', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
      global.fetch = fetchMock;

      const result = await kvService.storeLanguageContent('ml-1', 'en-us', { scenes: [] });
      expect(result).toBe(true);
    });

    it('should store and retrieve inbox content', async () => {
      const inboxPayload = { emails: [] };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(inboxPayload), { status: 200 }));
      global.fetch = fetchMock;

      const storeResult = await kvService.storeInboxContent('ml-1', 'IT', 'en-us', inboxPayload);
      expect(storeResult).toBe(true);

      const getResult = await kvService.getInboxContent('ml-1', 'IT', 'en-us');
      expect(getResult).toEqual(inboxPayload);
    });
  });

  describe('updateMicrolearning', () => {
    it('should update microlearning base', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
      global.fetch = fetchMock;

      const microlearning = {
        microlearning_id: 'ml-1',
        microlearning_metadata: { title: 'Updated' },
      };

      const result = await kvService.updateMicrolearning(microlearning);
      expect(result).toBe(true);
    });

    it('should return false when microlearning_id is missing', async () => {
      const result = await kvService.updateMicrolearning({ microlearning_metadata: {} });
      expect(result).toBe(false);
    });
  });

  describe('searchMicrolearnings', () => {
    it('should return matching microlearnings', async () => {
      const listResult = { result: [{ name: 'ml:ml-1:base' }, { name: 'ml:ml-2:base' }] };
      const ml1 = {
        microlearning_id: 'ml-1',
        microlearning_metadata: { title: 'Phishing Awareness' },
      };
      const ml2 = {
        microlearning_id: 'ml-2',
        microlearning_metadata: { title: 'Ransomware' },
      };

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(listResult), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(ml1), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(ml2), { status: 200 }));

      global.fetch = fetchMock;

      const result = await kvService.searchMicrolearnings('phishing');
      expect(result).toHaveLength(1);
      expect(result[0].microlearning_metadata.title).toBe('Phishing Awareness');
    });
  });

  describe('checkNamespace', () => {
    it('should return true when namespace is accessible', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
      global.fetch = fetchMock;

      const result = await kvService.checkNamespace();
      expect(result).toBe(true);
    });

    it('should return false when namespace check fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403 }));
      global.fetch = fetchMock;

      const result = await kvService.checkNamespace();
      expect(result).toBe(false);
    });
  });

  describe('LIST error handling', () => {
    it('should return empty array when list fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
      global.fetch = fetchMock;

      const result = await kvService.list('ml:');
      expect(result).toEqual([]);
    });

    it('should return empty array when list throws', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = fetchMock;

      const result = await kvService.list('ml:');
      expect(result).toEqual([]);
    });
  });

  describe('health check', () => {
    it('should return true when KV is accessible', async () => {
      let storedValue: any = null;

      const fetchMock = vi.fn().mockImplementation(async (url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          storedValue = JSON.parse(options.body);
          return new Response('', { status: 200 });
        }

        if (method === 'GET') {
          // Check if it's a value retrieval or namespace check
          // list() uses /keys
          // checkNamespace() uses .../namespaces/ID (no trailing slash usually, or no further path)
          // get() uses .../values/KEY

          if (url.includes('/values/')) {
            if (storedValue) {
              return new Response(JSON.stringify(storedValue), { status: 200 });
            }
            return new Response('', { status: 404 }); // Correctly return 404 if not found?
            // But for healthCheck first run, put hasn't happened? No, put happens first.
            // healthCheck sequence: checkNamespace -> put -> get -> delete.
            // So get should succeed.
          }

          // Default for namespace check or list
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (method === 'DELETE') {
          storedValue = null;
          return new Response('', { status: 200 });
        }

        return new Response('', { status: 200 });
      });

      global.fetch = fetchMock;

      const result = await kvService.healthCheck();

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('should return false if namespace is inaccessible', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403 }));
      global.fetch = fetchMock;

      const result = await kvService.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when PUT fails during health check', async () => {
      const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const method = options?.method || 'GET';
        if (method === 'GET' && url.includes('/namespaces/')) return new Response('', { status: 200 });
        if (method === 'PUT') return new Response('', { status: 500 });
        return new Response('', { status: 200 });
      });
      global.fetch = fetchMock;

      const result = await kvService.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false when GET returns wrong value during health check', async () => {
      const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const method = options?.method || 'GET';
        if (method === 'GET' && url.includes('/namespaces/')) return new Response('', { status: 200 });
        if (method === 'PUT') return new Response('', { status: 200 });
        if (method === 'GET' && url.includes('/values/')) {
          return new Response(JSON.stringify({ timestamp: 'wrong-timestamp' }), { status: 200 });
        }
        if (method === 'DELETE') return new Response('', { status: 200 });
        return new Response('', { status: 200 });
      });
      global.fetch = fetchMock;

      const result = await kvService.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false when health check throws', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = fetchMock;

      const result = await kvService.healthCheck();
      expect(result).toBe(false);
    });
  });
});
