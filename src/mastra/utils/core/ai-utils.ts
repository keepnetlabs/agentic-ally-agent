/** Workers AI / custom providers may attach reasoning to the response body */
interface ResponseWithReasoning {
  response?: { body?: { reasoning?: string } };
}

/**
 * Safely extracts reasoning from an AI response if available.
 * Currently supports Workers AI reasoning field.
 *
 * @param response - The response from generateText
 * @returns The reasoning string or undefined
 */
export function extractReasoning(response: unknown): string | undefined {
  return (response as ResponseWithReasoning)?.response?.body?.reasoning;
}
