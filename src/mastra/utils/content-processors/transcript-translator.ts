import { generateText, LanguageModel } from 'ai';
import { getLanguagePrompt } from '../language/localization-language-rules';
import { TRANSCRIPT_TRANSLATION_PARAMS } from '../config/llm-generation-params';
import { withRetry } from '../core/resilience-utils';
import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('TranscriptTranslator');

/**
 * Translates video transcript to target language if not English
 * Preserves timestamps and line breaks exactly as they are
 */
export async function translateTranscript(
  transcript: string,
  targetLanguage: string,
  model: LanguageModel
): Promise<string> {
  // Return original if English
  if (targetLanguage.toLowerCase().startsWith('en')) {
    return transcript;
  }

  try {
    const languageRules = getLanguagePrompt(targetLanguage);
    const response = await withRetry(
      () => generateText({
        model,
        messages: [
          {
            role: 'system',
            content: `Translate video transcript to ${targetLanguage}. Preserve ALL timestamps (00:00:04.400) and line breaks (\\n) exactly. Translate ONLY the text after timestamps.\n\n${languageRules}`
          },
          {
            role: 'user',
            content: `Translate this transcript:\n\n${transcript}`
          }
        ],
        ...TRANSCRIPT_TRANSLATION_PARAMS,
      }),
      'Transcript translation'
    );
    return response.text.trim();
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('Transcript translation failed, using original', { error: err.message });
    return transcript;
  }
}
