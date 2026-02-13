import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  kvGet: vi.fn(),
  kvPut: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  loggerDebug: vi.fn(),
  cleanResponse: vi.fn(),
  uuidv4: vi.fn(),
}));

vi.mock('../../services/kv-service', () => ({
  KVService: class KVService {
    get(key: string) {
      return mocks.kvGet(key);
    }
    put(key: string, value: unknown) {
      return mocks.kvPut(key, value);
    }
  },
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
    debug: mocks.loggerDebug,
  }),
}));

vi.mock('../../utils/content-processors/json-cleaner', () => ({
  cleanResponse: mocks.cleanResponse,
}));

vi.mock('../../utils/core/id-utils', () => ({
  uuidv4: mocks.uuidv4,
}));

import {
  loadSmishingContent,
  parseAndValidateSmsResponse,
  streamEditResultsToUI,
  saveSmishingContent,
} from './smishing-editor-helpers';

describe('smishing-editor-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uuidv4.mockReturnValue('msg-1');
    mocks.cleanResponse.mockImplementation((v: string) => v);
  });

  it('returns failure when sms and landing are both missing', async () => {
    mocks.kvGet.mockResolvedValue(null);

    const result = await loadSmishingContent('sid-1', 'EN-GB');

    expect(result.success).toBe(false);
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('returns landing-only content and warns when sms is missing', async () => {
    mocks.kvGet
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ pages: [{ type: 'login', template: '<html></html>' }] });

    const result = await loadSmishingContent('sid-2', 'en-gb');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.content.sms).toBeNull();
      expect(result.content.landing?.pages).toHaveLength(1);
    }
    expect(mocks.loggerWarn).toHaveBeenCalled();
  });

  it('returns sms content and logs info when sms exists', async () => {
    mocks.kvGet
      .mockResolvedValueOnce({ messages: ['m1'] })
      .mockResolvedValueOnce(null);

    const result = await loadSmishingContent('sid-3', 'en-gb');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.content.sms?.messages).toEqual(['m1']);
      expect(result.content.landing).toBeNull();
    }
    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      'Loaded existing smishing SMS',
      expect.objectContaining({ messageCount: 1 })
    );
  });

  it('handles rejected kv read as missing payload', async () => {
    mocks.kvGet
      .mockRejectedValueOnce(new Error('kv down'))
      .mockResolvedValueOnce({ pages: [{ type: 'info', template: '<html>ok</html>' }] });

    const result = await loadSmishingContent('sid-3b', 'en-gb');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.content.sms).toBeNull();
      expect(result.content.landing?.pages).toHaveLength(1);
    }
  });

  it('handles rejected landing kv read while sms exists', async () => {
    mocks.kvGet
      .mockResolvedValueOnce({ messages: ['sms-ok'] })
      .mockRejectedValueOnce(new Error('landing down'));

    const result = await loadSmishingContent('sid-3c', 'en-gb');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.content.sms?.messages).toEqual(['sms-ok']);
      expect(result.content.landing).toBeNull();
    }
  });

  it('parses and validates sms response', () => {
    const result = parseAndValidateSmsResponse(
      JSON.stringify({ messages: ['a', 'b'], summary: 'ok summary' })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.sms.messages).toEqual(['a', 'b']);
    }
  });

  it('returns parse error when response is invalid', () => {
    mocks.cleanResponse.mockImplementation(() => '{invalid-json');
    const result = parseAndValidateSmsResponse('ignored');

    expect(result.success).toBe(false);
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('converts non-Error thrown values into string error', () => {
    mocks.cleanResponse.mockImplementation(() => {
      throw 'bad-parse';
    });
    const result = parseAndValidateSmsResponse('ignored');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('bad-parse');
    }
  });

  it('streams sms and landing payloads to ui writer', async () => {
    const write = vi.fn().mockResolvedValue(undefined);

    await streamEditResultsToUI(
      { write },
      'sid-4',
      'sms-key',
      'landing-key',
      'en-gb',
      { messages: ['hello'], summary: 'sms edited' },
      {
        pages: [{ type: 'login', template: '<html>landing</html>', edited: true, summary: 'ok' }],
        summary: 'landing edited',
      },
      { name: 'Landing', description: 'Desc', method: 'x', difficulty: 'easy' }
    );

    expect(write).toHaveBeenCalledWith({ type: 'text-start', id: 'msg-1' });
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text-delta', delta: expect.stringContaining('::ui:smishing_sms::') })
    );
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text-delta',
        delta: expect.stringContaining('::ui:smishing_landing_page::'),
      })
    );
    expect(write).toHaveBeenCalledWith({ type: 'text-end', id: 'msg-1' });
  });

  it('swallows stream writer failures and logs warning', async () => {
    const write = vi.fn().mockRejectedValue(new Error('write failed'));

    await streamEditResultsToUI(
      { write },
      'sid-5',
      null,
      null,
      'en-gb',
      null,
      null,
      null
    );

    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Failed to stream updated components to UI',
      expect.objectContaining({ message: 'write failed' })
    );
  });

  it('logs stringified warning when writer throws non-Error', async () => {
    const write = vi.fn().mockRejectedValue('write-failed-string');

    await streamEditResultsToUI(
      { write },
      'sid-5b',
      null,
      null,
      'en-gb',
      null,
      null,
      null
    );

    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Failed to stream updated components to UI',
      expect.objectContaining({ message: 'write-failed-string' })
    );
  });

  it('streams landing payload without metadata when meta is null', async () => {
    const write = vi.fn().mockResolvedValue(undefined);

    await streamEditResultsToUI(
      { write },
      'sid-6',
      null,
      'landing-key',
      'en-gb',
      null,
      { pages: [{ type: 'info', template: '<html>x</html>', edited: false, summary: 'noop' }], summary: 'x' },
      null
    );

    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text-delta',
        delta: expect.stringContaining('::ui:smishing_landing_page::'),
      })
    );
  });

  it('still emits text-start/end when there is no sms and no landing payload', async () => {
    const write = vi.fn().mockResolvedValue(undefined);

    await streamEditResultsToUI(
      { write },
      'sid-6b',
      null,
      null,
      'en-gb',
      null,
      { pages: [], summary: 'none' },
      null
    );

    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenNthCalledWith(1, { type: 'text-start', id: 'msg-1' });
    expect(write).toHaveBeenNthCalledWith(2, { type: 'text-end', id: 'msg-1' });
  });

  it('saves sms and landing updates into kv', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await saveSmishingContent(
      'sms-key',
      'landing-key',
      { messages: ['new'], lastModified: 1700000000000 },
      { pages: [{ type: 'login', template: '<html></html>' }], name: 'Old' },
      {
        pages: [{ type: 'success', template: '<html>new</html>', edited: true, summary: 'done' }],
        summary: 'done',
      }
    );

    expect(mocks.kvPut).toHaveBeenCalledTimes(2);
    expect(mocks.kvPut).toHaveBeenNthCalledWith(
      1,
      'sms-key',
      expect.objectContaining({ messages: ['new'] })
    );
    expect(mocks.kvPut).toHaveBeenNthCalledWith(
      2,
      'landing-key',
      expect.objectContaining({
        pages: [{ type: 'success', template: '<html>new</html>', edited: true, summary: 'done' }],
        lastModified: 1700000000000,
      })
    );

    nowSpy.mockRestore();
  });

  it('does not write to kv when both update payloads are null/empty', async () => {
    await saveSmishingContent(
      'sms-key',
      'landing-key',
      null,
      null,
      { pages: [], summary: 'none' }
    );

    expect(mocks.kvPut).not.toHaveBeenCalled();
  });
});
