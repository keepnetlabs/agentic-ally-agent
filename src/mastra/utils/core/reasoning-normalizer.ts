import { trackedGenerateText } from './tracked-generate';
import { getModel, ModelProvider, Model, reasoningHeaders } from '../../model-providers';

/**
 * Normalizes reasoning text to professional English for manager/auditor consumption.
 * Uses a lightweight LLM call. If the text is already English, returns it as-is.
 * On failure, returns the original text unchanged (non-blocking).
 */
export async function normalizeReasoningToEnglish(reasoning: string): Promise<string> {
  if (!reasoning || reasoning.trim().length === 0) return reasoning;

  // Quick heuristic: if mostly ASCII, skip the LLM call
  const asciiRatio = reasoning.replace(/[^\x00-\x7F]/g, '').length / reasoning.length;
  if (asciiRatio > 0.9) return reasoning;

  try {
    const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_4_MINI);

    const result = await trackedGenerateText('reasoning-normalize', {
      model,
      messages: [
        {
          role: 'system',
          content: `You are a professional English technical writer for a cybersecurity awareness platform.

TASK: Translate the AI-generated reasoning below into clear, native-level professional English.

RULES:
- Write for a security manager or compliance auditor audience.
- Preserve the original meaning, structure, and all technical details.
- Use natural business English — no robotic phrasing, no filler.
- Output ONLY the English text. No labels, no commentary, no markdown.`,
        },
        { role: 'user', content: reasoning },
      ],
      temperature: 0.2,
      headers: reasoningHeaders(),
    });

    return result.text?.trim() || reasoning;
  } catch {
    return reasoning;
  }
}
