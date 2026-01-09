
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamDirectReasoning, StreamWriter } from './reasoning-stream';

// Mock getModelWithOverride
vi.mock('../../model-providers', () => ({
    getModelWithOverride: vi.fn(),
    Model: { WORKERS_AI_GPT_OSS_120B: 'test-model' }
}));

// Mock ai module for generateText
const mockGenerateText = vi.fn();
vi.mock('ai', () => ({
    generateText: (...args: any[]) => mockGenerateText(...args)
}));

// Mock UUID
vi.mock('uuid', () => ({
    v4: () => 'test-uuid'
}));

describe('Reasoning Stream Utils', () => {
    let mockWriter: StreamWriter;
    let writeSpy: any;

    beforeEach(() => {
        writeSpy = vi.fn().mockResolvedValue(undefined);
        mockWriter = {
            write: writeSpy
        };
        mockGenerateText.mockReset();
    });

    describe('streamDirectReasoning', () => {
        it('should stream direct reasoning without modification', async () => {
            const reasoning = "I am thinking directly";
            await streamDirectReasoning(reasoning, mockWriter);

            expect(writeSpy).toHaveBeenCalledTimes(3);
            expect(writeSpy).toHaveBeenNthCalledWith(1, { type: 'reasoning-start', id: 'test-uuid' });
            expect(writeSpy).toHaveBeenNthCalledWith(2, { type: 'reasoning-delta', id: 'test-uuid', delta: reasoning });
            expect(writeSpy).toHaveBeenNthCalledWith(3, { type: 'reasoning-end', id: 'test-uuid' });
        });

        it('should do nothing if reasoning is empty', async () => {
            await streamDirectReasoning('', mockWriter);
            expect(writeSpy).not.toHaveBeenCalled();
        });

        it('should handle writer errors gracefully', async () => {
            mockWriter.write = vi.fn().mockRejectedValue(new Error('Stream closed'));
            await expect(streamDirectReasoning('test', mockWriter)).resolves.not.toThrow();
        });
    });
});
