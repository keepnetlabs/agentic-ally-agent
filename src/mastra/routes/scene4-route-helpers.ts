import { KVService } from '../services/kv-service';
import { validateBCP47LanguageCode } from '../utils/language/language-utils';

interface LoadScene4Params {
  microlearningId: string;
  language: string;
}

interface LoadScene4Result {
  hasLanguageContent: boolean;
  normalizedLanguage: string;
  prompt: string | undefined;
  firstMessage: string | undefined;
}

export async function loadScene4RouteData({ microlearningId, language }: LoadScene4Params): Promise<LoadScene4Result> {
  const normalizedLanguage = validateBCP47LanguageCode(language).toLowerCase();
  const kvService = new KVService();
  const microlearning = await kvService.getMicrolearning(microlearningId, normalizedLanguage);

  if (!microlearning?.language) {
    return {
      hasLanguageContent: false,
      normalizedLanguage,
      prompt: undefined,
      firstMessage: undefined,
    };
  }

  const scene4 = microlearning.language?.['4'];

  return {
    hasLanguageContent: true,
    normalizedLanguage,
    prompt: scene4?.prompt,
    firstMessage: scene4?.firstMessage,
  };
}
