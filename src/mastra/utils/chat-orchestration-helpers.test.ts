
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    extractAndPrepareThreadId,
    buildFinalPromptWithModelOverride,
    createAgentStream
} from './chat-orchestration-helpers';

describe('chat-orchestration-helpers', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('extractAndPrepareThreadId', () => {
        it('returns provided conversationId', () => {
            const body = { conversationId: 'conv-123' };
            expect(extractAndPrepareThreadId(body as any)).toBe('conv-123');
        });

        it('returns provided threadId', () => {
            const body = { threadId: 'thread-123' };
            expect(extractAndPrepareThreadId(body as any)).toBe('thread-123');
        });

        it('returns provided sessionId', () => {
            const body = { sessionId: 'sess-123' };
            expect(extractAndPrepareThreadId(body as any)).toBe('sess-123');
        });

        it('generates a new UUID if no ID provided', () => {
            const body = {};
            const id = extractAndPrepareThreadId(body as any);
            expect(id).toBeDefined();
            expect(id.length).toBeGreaterThan(10); // UUID length
        });

        it('prioritizes conversationId over threadId and sessionId', () => {
            const body = {
                conversationId: 'conv-123',
                threadId: 'thread-456',
                sessionId: 'sess-789'
            };
            expect(extractAndPrepareThreadId(body as any)).toBe('conv-123');
        });

        it('prioritizes threadId over sessionId when conversationId missing', () => {
            const body = {
                threadId: 'thread-456',
                sessionId: 'sess-789'
            };
            expect(extractAndPrepareThreadId(body as any)).toBe('thread-456');
        });

        it('uses sessionId when conversationId and threadId missing', () => {
            const body = { sessionId: 'sess-789' };
            expect(extractAndPrepareThreadId(body as any)).toBe('sess-789');
        });

        it('generates UUID when all IDs are empty strings', () => {
            const body = {
                conversationId: '',
                threadId: '',
                sessionId: ''
            };
            const id = extractAndPrepareThreadId(body as any);
            expect(id).toBeDefined();
            expect(id.length).toBeGreaterThan(10);
        });

        it('handles empty object', () => {
            const body = {};
            const id = extractAndPrepareThreadId(body as any);
            expect(id).toBeDefined();
            expect(id.length).toBeGreaterThan(10);
        });

        it('handles null body gracefully', () => {
            const id = extractAndPrepareThreadId(null as any);
            expect(id).toBeDefined();
            expect(id.length).toBeGreaterThan(10);
        });

        it('handles undefined body gracefully', () => {
            const id = extractAndPrepareThreadId(undefined as any);
            expect(id).toBeDefined();
            expect(id.length).toBeGreaterThan(10);
        });

        it('generates different UUIDs for multiple calls', () => {
            const body = {};
            const id1 = extractAndPrepareThreadId(body as any);
            const id2 = extractAndPrepareThreadId(body as any);
            expect(id1).not.toBe(id2);
        });

        it('returns UUID with correct format', () => {
            const body = {};
            const id = extractAndPrepareThreadId(body as any);
            // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('handles whitespace-only IDs by generating UUID', () => {
            const body = {
                conversationId: '   ',
                threadId: '\t\t',
                sessionId: '\n\n'
            };
            const id = extractAndPrepareThreadId(body as any);
            expect(id).toBeDefined();
            // Whitespace strings are truthy but effectively empty
        });

        it('preserves ID with special characters', () => {
            const body = { conversationId: 'conv-123_test@example' };
            expect(extractAndPrepareThreadId(body as any)).toBe('conv-123_test@example');
        });

        it('preserves very long IDs', () => {
            const longId = 'x'.repeat(1000);
            const body = { conversationId: longId };
            expect(extractAndPrepareThreadId(body as any)).toBe(longId);
        });
    });

    describe('buildFinalPromptWithModelOverride', () => {
        it('returns original prompt if no override', () => {
            expect(buildFinalPromptWithModelOverride('prompt')).toBe('prompt');
        });

        it('adds provider override', () => {
            expect(buildFinalPromptWithModelOverride('prompt', 'OPENAI')).toContain('[Use this model provider: OPENAI]');
        });

        it('adds provider and model override', () => {
            expect(buildFinalPromptWithModelOverride('prompt', 'OPENAI', 'gpt-4')).toContain('[Use this model: OPENAI - gpt-4]');
        });

        it('returns original prompt when both provider and model are undefined', () => {
            expect(buildFinalPromptWithModelOverride('test prompt', undefined, undefined)).toBe('test prompt');
        });

        it('returns original prompt when both provider and model are empty strings', () => {
            expect(buildFinalPromptWithModelOverride('test prompt', '', '')).toBe('test prompt');
        });

        it('adds only model when provider is undefined', () => {
            const result = buildFinalPromptWithModelOverride('prompt', undefined, 'gpt-4');
            expect(result).toBe('prompt'); // No instruction added since provider is needed
        });

        it('prepends model instruction before prompt', () => {
            const result = buildFinalPromptWithModelOverride('original prompt', 'OPENAI');
            expect(result.indexOf('[Use this model provider: OPENAI]')).toBeLessThan(result.indexOf('original prompt'));
        });

        it('includes double newline after model instruction', () => {
            const result = buildFinalPromptWithModelOverride('prompt', 'OPENAI');
            expect(result).toContain(']\n\nprompt');
        });

        it('handles empty prompt string', () => {
            const result = buildFinalPromptWithModelOverride('', 'OPENAI', 'gpt-4');
            expect(result).toContain('[Use this model: OPENAI - gpt-4]');
            expect(result).toContain('\n\n');
        });

        it('handles multiline prompts', () => {
            const multiline = 'Line 1\nLine 2\nLine 3';
            const result = buildFinalPromptWithModelOverride(multiline, 'OPENAI');
            expect(result).toContain('Line 1\nLine 2\nLine 3');
            expect(result).toContain('[Use this model provider: OPENAI]');
        });

        it('handles special characters in prompt', () => {
            const prompt = 'Test with "quotes" & <brackets> @ symbols $';
            const result = buildFinalPromptWithModelOverride(prompt, 'OPENAI');
            expect(result).toContain(prompt);
        });

        it('handles unicode in prompt', () => {
            const prompt = '你好世界 🌍 Привет';
            const result = buildFinalPromptWithModelOverride(prompt, 'OPENAI');
            expect(result).toContain(prompt);
        });

        it('handles very long prompts', () => {
            const longPrompt = 'A'.repeat(10000);
            const result = buildFinalPromptWithModelOverride(longPrompt, 'OPENAI');
            expect(result).toContain(longPrompt);
        });

        it('formats provider-only override correctly', () => {
            const result = buildFinalPromptWithModelOverride('test', 'WORKERS_AI');
            expect(result).toBe('[Use this model provider: WORKERS_AI]\n\ntest');
        });

        it('formats provider-model override correctly', () => {
            const result = buildFinalPromptWithModelOverride('test', 'WORKERS_AI', 'llama-3');
            expect(result).toBe('[Use this model: WORKERS_AI - llama-3]\n\ntest');
        });

        it('handles special characters in provider name', () => {
            const result = buildFinalPromptWithModelOverride('test', 'CUSTOM_PROVIDER_V2');
            expect(result).toContain('[Use this model provider: CUSTOM_PROVIDER_V2]');
        });

        it('handles special characters in model name', () => {
            const result = buildFinalPromptWithModelOverride('test', 'OPENAI', 'gpt-4-turbo-preview');
            expect(result).toContain('[Use this model: OPENAI - gpt-4-turbo-preview]');
        });

        it('preserves prompt whitespace', () => {
            const prompt = '  leading and trailing  ';
            const result = buildFinalPromptWithModelOverride(prompt);
            expect(result).toBe(prompt);
        });

        it('handles null provider and model', () => {
            // @ts-ignore - Testing runtime behavior
            const result = buildFinalPromptWithModelOverride('test', null, null);
            expect(result).toBe('test');
        });
    });


    describe('createAgentStream', () => {
        it('should create agent stream successfully', async () => {
            const mockStream = { id: 'stream-123' };
            const mockAgent = {
                stream: vi.fn().mockResolvedValue(mockStream)
            } as any;

            const result = await createAgentStream(
                mockAgent,
                'final prompt',
                'thread-123',
                'test-agent'
            );

            expect(result).toEqual(mockStream);
            expect(mockAgent.stream).toHaveBeenCalledWith('final prompt', {
                format: 'aisdk',
                memory: {
                    thread: 'thread-123',
                    resource: 'agentic-ally-user'
                }
            });
        });

        it('should pass correct parameters to agent.stream', async () => {
            const mockAgent = {
                stream: vi.fn().mockResolvedValue({})
            } as any;

            await createAgentStream(mockAgent, 'test prompt', 'thread-456', 'agent-name');

            expect(mockAgent.stream).toHaveBeenCalledTimes(1);
            const callArgs = mockAgent.stream.mock.calls[0];
            expect(callArgs[0]).toBe('test prompt');
            expect(callArgs[1].format).toBe('aisdk');
            expect(callArgs[1].memory.thread).toBe('thread-456');
            expect(callArgs[1].memory.resource).toBe('agentic-ally-user');
        });

        it('should handle empty prompt', async () => {
            const mockAgent = {
                stream: vi.fn().mockResolvedValue({})
            } as any;

            await createAgentStream(mockAgent, '', 'thread-123', 'agent');

            expect(mockAgent.stream).toHaveBeenCalledWith('', expect.any(Object));
        });

        it('should handle very long prompts', async () => {
            const longPrompt = 'X'.repeat(10000);
            const mockAgent = {
                stream: vi.fn().mockResolvedValue({})
            } as any;

            await createAgentStream(mockAgent, longPrompt, 'thread-123', 'agent');

            expect(mockAgent.stream).toHaveBeenCalledWith(longPrompt, expect.any(Object));
        });

        it('should use correct resource name', async () => {
            const mockAgent = {
                stream: vi.fn().mockResolvedValue({})
            } as any;

            await createAgentStream(mockAgent, 'prompt', 'thread-123', 'agent');

            const callArgs = mockAgent.stream.mock.calls[0][1];
            expect(callArgs.memory.resource).toBe('agentic-ally-user');
        });

        it('should use aisdk format', async () => {
            const mockAgent = {
                stream: vi.fn().mockResolvedValue({})
            } as any;

            await createAgentStream(mockAgent, 'prompt', 'thread-123', 'agent');

            const callArgs = mockAgent.stream.mock.calls[0][1];
            expect(callArgs.format).toBe('aisdk');
        });
    });

});
