import { generateText } from 'ai';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';
import { TIMEOUT_VALUES } from '../../constants';
import {
  getPhishingEditorSystemPrompt,
  getPhishingEmailUserPrompt,
  getLandingPageSystemPrompt,
  getLandingPageUserPrompt,
} from './phishing-editor-prompts';
import { ExistingEmail } from './phishing-editor-helpers';
import { LandingPageInput } from './phishing-editor-schemas';

export type GenerateTextResult = Awaited<ReturnType<typeof generateText>>;
export type AiModel = Parameters<typeof generateText>[0]['model'];

export type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
};

export function createEmailEditPromise(args: {
  aiModel: AiModel;
  email: ExistingEmail;
  escapedInstruction: string;
  brandContext: string;
  logger: LoggerLike;
}): Promise<GenerateTextResult> {
  const { aiModel, email, escapedInstruction, brandContext, logger } = args;

  const systemPrompt = getPhishingEditorSystemPrompt();
  const emailUserPrompt = getPhishingEmailUserPrompt(
    email as Parameters<typeof getPhishingEmailUserPrompt>[0],
    escapedInstruction,
    brandContext
  );

  logger.info('Calling LLM for email editing');
  return withRetry(
    () =>
      withTimeout(
        generateText({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: emailUserPrompt },
          ],
          temperature: 0.3,
        }),
        TIMEOUT_VALUES.PHISHING_EDITOR_EMAIL_TIMEOUT_MS
      ),
    'Phishing email editing'
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
    const landingSystemPrompt = getLandingPageSystemPrompt(mode);
    const landingUserPrompt = getLandingPageUserPrompt(page, escapedInstruction, brandContext);

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
            temperature: 0.3,
          }),
          TIMEOUT_VALUES.PHISHING_EDITOR_LANDING_TIMEOUT_MS
        ),
      `Phishing landing page ${idx + 1} editing`
    );
  });
}
