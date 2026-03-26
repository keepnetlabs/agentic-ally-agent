import { describe, it, expect, vi, beforeEach } from 'vitest';

const parseMock = vi.hoisted(() => vi.fn());
const routeToCSAgentMock = vi.hoisted(() => vi.fn());
const createAgentStreamMock = vi.hoisted(() => vi.fn());

const mockMastra = vi.hoisted(() => ({
  getAgent: vi.fn(),
  listAgents: vi.fn(() => []),
  listWorkflows: vi.fn(() => []),
}));

vi.mock('../utils/chat-request-helpers', () => ({
  parseAndValidateRequest: (...args: unknown[]) => parseMock(...args),
}));

vi.mock('../utils/chat-orchestration-helpers', () => ({
  extractAndPrepareThreadId: vi.fn().mockReturnValue('thread-cs'),
  buildFinalPromptWithModelOverride: vi.fn((p: string) => p),
  createAgentStream: (...args: unknown[]) => createAgentStreamMock(...args),
}));

vi.mock('../utils/cs-orchestration-helpers', () => ({
  routeToCSAgent: (...args: unknown[]) => routeToCSAgentMock(...args),
}));

vi.mock('../utils/core/request-storage', () => ({
  requestStorage: { getStore: vi.fn().mockReturnValue({}) },
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    aiModel: vi.fn((msg: string) => ({ message: msg, code: 'ERR_AI' })),
    external: vi.fn((msg: string) => ({ message: msg })),
  },
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  logErrorInfo: vi.fn(),
}));

vi.mock('ai', () => ({
  createUIMessageStream: vi.fn(() => ({})),
  createUIMessageStreamResponse: vi.fn(() => new Response('stream', { status: 200 })),
}));

vi.mock('@mastra/ai-sdk', () => ({
  toAISdkStream: vi.fn(() =>
    (async function* () {
      yield { type: 'text', text: 'x' };
    })()
  ),
}));

import { csChatHandler } from './cs-chat-route';

function createContext() {
  const json = vi.fn();
  return {
    get: (key: string) => (key === 'mastra' ? mockMastra : undefined),
    req: { json: vi.fn().mockResolvedValue({ prompt: 'hi' }) },
    json,
  } as any;
}

describe('csChatHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAgentStreamMock.mockResolvedValue(
      (async function* () {
        yield { type: 'text', text: 'ok' };
      })()
    );
    mockMastra.getAgent.mockReturnValue({ generate: vi.fn() });
  });

  it('returns 400 when parseAndValidateRequest fails', async () => {
    parseMock.mockReturnValue(null);
    const c = createContext();
    await csChatHandler(c);

    expect(c.json).toHaveBeenCalledWith(
      {
        success: false,
        message:
          'Missing prompt. Provide {prompt}, {text}, {input}, or AISDK {messages} with user text.',
      },
      400
    );
  });

  it('returns 500 when routeToCSAgent throws', async () => {
    parseMock.mockReturnValue({ prompt: 'hello', routingContext: undefined });
    routeToCSAgentMock.mockRejectedValue(new Error('cs router failed'));
    const c = createContext();
    await csChatHandler(c);

    expect(c.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'CS agent routing failed',
        message: 'cs router failed',
      },
      500
    );
  });

  it('returns 500 when CS agent is missing', async () => {
    parseMock.mockReturnValue({ prompt: 'hello', routingContext: undefined });
    routeToCSAgentMock.mockResolvedValue({ agentName: 'missingCs', taskContext: undefined });
    mockMastra.getAgent.mockReturnValue(undefined);
    const c = createContext();
    await csChatHandler(c);

    expect(c.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'CS agent not found',
        message: 'Agent "missingCs" is not available',
      },
      500
    );
  });
});
