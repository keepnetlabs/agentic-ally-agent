import { generateText } from 'ai';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';
import { TIMEOUT_VALUES } from '../../constants';
import {
  getSmishingSmsSystemPrompt,
  getSmishingSmsUserPrompt,
  getSmishingLandingPageSystemPrompt,
  getSmishingLandingPageUserPrompt,
} from './smishing-editor-prompts';
import { LandingPageInput } from './phishing-editor-schemas';
import { EDITOR_PARAMS } from '../../utils/config/llm-generation-params';

export type GenerateTextResult = Awaited<ReturnType<typeof generateText>>;
export type AiModel = Parameters<typeof generateText>[0]['model'];

export type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
};

export function createSmsEditPromise(args: {
  aiModel: AiModel;
  sms: { messages: string[] };
  escapedInstruction: string;
  mode: string;
  logger: LoggerLike;
}): Promise<GenerateTextResult> {
  const { aiModel, sms, escapedInstruction, mode, logger } = args;
  const systemPrompt = getSmishingSmsSystemPrompt(mode);
  const userPrompt = getSmishingSmsUserPrompt(sms, escapedInstruction);

  logger.info('Calling LLM for SMS editing');
  return withRetry(
    () =>
      withTimeout(
        generateText({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          ...EDITOR_PARAMS,
        }),
        TIMEOUT_VALUES.PHISHING_EDITOR_EMAIL_TIMEOUT_MS
      ),
    'Smishing SMS editing'
  );
}

export function createLandingEditPromises(args: {
  aiModel: AiModel;
  pages: LandingPageInput[];
  mode: string;
  escapedInstruction: string;
  brandContext: string;
  logger: LoggerLike;
}): Array<Promise<GenerateTextResult>> {
  const { aiModel, pages, mode, escapedInstruction, brandContext, logger } = args;
  if (!pages.length) return [];

  return pages.map((page, idx) => {
    const landingSystemPrompt = getSmishingLandingPageSystemPrompt(mode);
    const landingUserPrompt = getSmishingLandingPageUserPrompt(page, escapedInstruction, brandContext);

    logger.info(`Calling LLM for landing page ${idx + 1} editing`);
    return withRetry(
      () =>
        withTimeout(
          generateText({
            model: aiModel,
            messages: [
              { role: 'system', content: landingSystemPrompt },
              { role: 'user', content: landingUserPrompt },
            ],
            ...EDITOR_PARAMS,
          }),
          TIMEOUT_VALUES.PHISHING_EDITOR_LANDING_TIMEOUT_MS
        ),
      `Smishing landing page ${idx + 1} editing`
    );
  });
}
