
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

        it('should return undefined if response is null', () => {
            // @ts-ignore
            expect(extractReasoning(null)).toBeUndefined();
        });

        it('should return undefined if response.response is null', () => {
            const response = {
                text: 'some text',
                response: null
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should return undefined if response.response.body is null', () => {
            const response = {
                text: 'some text',
                response: {
                    body: null
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should return undefined if response.response.body.reasoning is explicitly undefined', () => {
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: undefined
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should return null if response.response.body.reasoning is null', () => {
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: null
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeNull();
        });

        it('should return empty string if reasoning is empty string', () => {
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: ''
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe('');
        });

        it('should handle reasoning with special characters', () => {
            const specialReasoning = 'Thinking: "quoted text" & <markup> $ symbols \\n newlines';
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: specialReasoning
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(specialReasoning);
        });

        it('should handle very long reasoning strings', () => {
            const longReasoning = 'A'.repeat(10000);
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: longReasoning
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(longReasoning);
        });

        it('should handle multiline reasoning', () => {
            const multilineReasoning = 'Line 1\nLine 2\nLine 3';
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: multilineReasoning
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(multilineReasoning);
        });

        it('should return undefined if response is empty object', () => {
            // @ts-ignore
            expect(extractReasoning({})).toBeUndefined();
        });

        it('should return undefined if response.response exists but body does not', () => {
            const response = {
                text: 'some text',
                response: {}
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should return undefined if response.response.body exists but reasoning does not', () => {
            const response = {
                text: 'some text',
                response: {
                    body: {
                        otherField: 'value'
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should handle response with nested empty objects', () => {
            const response = {
                text: 'some text',
                response: {
                    body: {}
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should return number if reasoning is a number', () => {
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: 123
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(123);
        });

        it('should return boolean if reasoning is a boolean', () => {
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: false
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(false);
        });

        it('should return array if reasoning is an array', () => {
            const reasoningArray = ['thought1', 'thought2'];
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: reasoningArray
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toEqual(reasoningArray);
        });

        it('should return object if reasoning is an object', () => {
            const reasoningObject = { step1: 'think', step2: 'act' };
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: reasoningObject
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toEqual(reasoningObject);
        });

        it('should handle response with additional nested properties', () => {
            const mockReasoning = 'Complex reasoning';
            const response = {
                text: 'some text',
                toolCalls: [{ id: '1', name: 'tool' }],
                toolResults: [{ result: 'data' }],
                usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
                finishReason: 'stop',
                request: { model: 'gpt-4' },
                response: {
                    body: {
                        reasoning: mockReasoning,
                        otherField: 'ignored',
                        nested: {
                            deep: 'value'
                        }
                    },
                    headers: {},
                    status: 200
                }
            };

            // @ts-ignore
            expect(extractReasoning(response)).toBe(mockReasoning);
        });

        it('should handle whitespace-only reasoning', () => {
            const whitespaceReasoning = '   \t\n   ';
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: whitespaceReasoning
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(whitespaceReasoning);
        });

        it('should handle unicode characters in reasoning', () => {
            const unicodeReasoning = '思考中... 🤔 Размышление';
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: unicodeReasoning
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(unicodeReasoning);
        });

        it('should handle JSON-like string in reasoning', () => {
            const jsonLikeReasoning = '{"thought": "process", "action": "decide"}';
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: jsonLikeReasoning
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(jsonLikeReasoning);
        });

        it('should handle response where response property is not an object', () => {
            const response = {
                text: 'some text',
                response: 'not an object'
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should handle response where body property is not an object', () => {
            const response = {
                text: 'some text',
                response: {
                    body: 'not an object'
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBeUndefined();
        });

        it('should return zero if reasoning is 0', () => {
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: 0
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(0);
        });

        it('should handle reasoning with escape sequences', () => {
            const escapedReasoning = 'Line\\nwith\\ttabs\\rand\\x20hex';
            const response = {
                text: 'some text',
                response: {
                    body: {
                        reasoning: escapedReasoning
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(escapedReasoning);
        });

        it('should handle deeply nested valid reasoning', () => {
            const deepReasoning = 'Deep thought';
            const response = {
                extra: {
                    nested: {
                        data: 'ignored'
                    }
                },
                response: {
                    headers: {},
                    status: 200,
                    body: {
                        data: 'other',
                        reasoning: deepReasoning,
                        meta: {
                            version: '1.0'
                        }
                    }
                }
            };
            // @ts-ignore
            expect(extractReasoning(response)).toBe(deepReasoning);
        });
    });
});
