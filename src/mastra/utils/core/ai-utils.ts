import { GenerateTextResult } from 'ai';

/**
 * Safely extracts reasoning from an AI response if available.
 * Currently supports Workers AI reasoning field.
 * 
 * @param response - The response from generateText
 * @returns The reasoning string or undefined
 */
export function extractReasoning(response: GenerateTextResult<any, any>): string | undefined {

    return (response as any)?.response?.body?.reasoning;
}
