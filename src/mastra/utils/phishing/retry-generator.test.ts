
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { retryGenerationWithStrongerPrompt } from './retry-generator';
import { generateText } from 'ai';
import * as reasoningStream from '../core/reasoning-stream';

vi.mock('ai', () => ({
    generateText: vi.fn(),
}));

vi.mock('../core/reasoning-stream', () => ({
    streamDirectReasoning: vi.fn(),
}));

vi.mock('../core/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    })
}));

describe('retry-generator', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('retryGenerationWithStrongerPrompt', () => {
        it('retries with stronger system prompt and updated user message', async () => {
            const mockModel = {} as any;
            const messages = [
                { role: 'system', content: 'Base system prompt' },
                { role: 'user', content: 'Base user prompt' }
            ] as any;

            vi.mocked(generateText).mockResolvedValue({
                text: JSON.stringify({ success: true })
            } as any);

            await retryGenerationWithStrongerPrompt(mockModel, 'Base system prompt', messages, 'email');

            expect(generateText).toHaveBeenCalledTimes(1);
            const callArgs = vi.mocked(generateText).mock.calls[0][0];

            // Verify system prompt override
            const systemMsg = (callArgs.messages as any[]).find(m => m.role === 'system');
            expect(systemMsg.content).toContain('CRITICAL OVERRIDE');

            // Verify user message update
            const userMsg = (callArgs.messages as any[]).find(m => m.role === 'user');
            expect(userMsg.content).toContain('IMPORTANT: Generate the JSON output');
        });

        it('streams reasoning if available and writer provided', async () => {
            const mockModel = {} as any;
            const mockWriter = {};
            const messages = [{ role: 'system', content: '' }] as any;

            vi.mocked(generateText).mockResolvedValue({
                text: '{}',
                response: {
                    body: {
                        reasoning: 'Thinking...'
                    }
                }
            } as any);

            await retryGenerationWithStrongerPrompt(mockModel, '', messages, 'email', mockWriter);

            expect(reasoningStream.streamDirectReasoning).toHaveBeenCalledWith('Thinking...', mockWriter);
        });
    });
});
