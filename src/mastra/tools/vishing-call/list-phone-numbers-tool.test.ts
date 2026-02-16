/**
 * Unit tests for list-phone-numbers-tool
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listPhoneNumbersTool } from './list-phone-numbers-tool';

const expectedUrl = 'https://api.elevenlabs.io/v1/convai/phone-numbers';

describe('listPhoneNumbersTool', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ELEVENLABS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('should return error when ELEVENLABS_API_KEY is not set', async () => {
    delete process.env.ELEVENLABS_API_KEY;

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('ELEVENLABS_API_KEY');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return phone numbers when API returns array directly', async () => {
    const mockData = [
      {
        phone_number: '+15551234567',
        phone_number_id: 'pn-1',
        label: 'US Main',
        provider: 'twilio',
      },
      {
        phone_number: '+15559876543',
        phone_number_id: 'pn-2',
        label: 'US Backup',
        provider: 'sip_trunk',
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(true);
    expect(result.phoneNumbers).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(result.phoneNumbers?.[0]).toEqual({
      phone_number: '+15551234567',
      phone_number_id: 'pn-1',
      label: 'US Main',
      provider: 'twilio',
    });
    expect(result.phoneNumbers?.[1]).toEqual({
      phone_number: '+15559876543',
      phone_number_id: 'pn-2',
      label: 'US Backup',
      provider: 'sip_trunk',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'xi-api-key': 'test-api-key',
        }),
      })
    );
  });

  it('should return phone numbers when API returns object with phone_numbers', async () => {
    const mockData = {
      phone_numbers: [
        {
          phone_number: '+441234567890',
          phone_number_id: 'pn-uk',
          label: 'UK',
          provider: 'twilio',
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(true);
    expect(result.phoneNumbers).toHaveLength(1);
    expect(result.phoneNumbers?.[0]?.phone_number).toBe('+441234567890');
    expect(result.phoneNumbers?.[0]?.provider).toBe('twilio');
  });

  it('should default provider to twilio when not sip_trunk', async () => {
    const mockData = [
      {
        phone_number: '+15550000000',
        phone_number_id: 'pn-x',
        label: 'Unknown',
        provider: 'other',
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(true);
    expect(result.phoneNumbers?.[0]?.provider).toBe('twilio');
  });

  it('should use default label when missing', async () => {
    const mockData = [
      {
        phone_number: '+15550000000',
        phone_number_id: 'pn-x',
        provider: 'twilio',
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(true);
    expect(result.phoneNumbers?.[0]?.label).toBe('Unlabeled');
  });

  it('should return error when API returns non-ok status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key',
    });

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
    expect(result.error).toContain('Unauthorized');
  });

  it('should handle fetch text error when reading error body', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => {
        throw new Error('Read failed');
      },
    });

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });

  it('should return timeout error on AbortError', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('should return generic error on other fetch failures', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should return empty array when API returns empty', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(true);
    expect(result.phoneNumbers).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('should handle refresh input (schema validation)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await listPhoneNumbersTool.execute({
      context: { refresh: true },
    } as never);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should retry on 5xx and succeed when API recovers', async () => {
    const mockData = [{ phone_number: '+15551234567', phone_number_id: 'pn-1', label: 'US', provider: 'twilio' }];
    (global.fetch as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Temporary outage',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

    const result = await listPhoneNumbersTool.execute({ context: {} } as never);

    expect(result.success).toBe(true);
    expect(result.phoneNumbers).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
