
import { describe, it, expect } from 'vitest';
import { extractReasoning } from './ai-utils';

describe('AI Utils', () => {
    describe('extractReasoning', () => {
        it('should return undefined if response is not provided', () => {
            // @ts-ignore
            const reasoning = extractReasoning(undefined);
            expect(reasoning).toBeUndefined();
        });

        it('should return undefined if response has no reasoning', () => {
            const response = {
                text: 'some text',
                toolCalls: [],
                toolResults: [],
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                finishReason: 'stop',
                request: {},
                response: {
                    body: {}
                }
            };
            // @ts-ignore - Partial mock
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should extract reasoning from Workers AI response format', () => {
            const mockReasoning = 'I am thinking...';
            const response = {
                text: 'some text',
                toolCalls: [],
                toolResults: [],
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                finishReason: 'stop',
                request: {},
                response: {
                    body: {
                        reasoning: mockReasoning
                    }
                }
            };

            // @ts-ignore - Partial mock
            expect(extractReasoning(response)).toBe(mockReasoning);
        });
    });
});
