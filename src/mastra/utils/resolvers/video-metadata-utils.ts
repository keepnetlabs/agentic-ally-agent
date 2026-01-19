import { generateText } from 'ai';
import { z } from 'zod';
import { getLogger } from '../core/logger';
import { normalizeError, logErrorInfo } from '../core/error-utils';
import { errorService } from '../../services/error-service';

const logger = getLogger('VideoMetadataUtils');

export interface VideoMetadata {
  title: string;
  subtitle: string;
}

export const VideoMetadataSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1)
});

export async function generateVideoMetadataFromPrompt(
  model: Parameters<typeof generateText>[0]['model'],
  generationPrompt: string,
  topic: string,
  language: string
): Promise<VideoMetadata> {
  const result = await generateText({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a video metadata expert. Generate engaging, contextual titles and subtitles for security awareness videos. Return ONLY valid JSON with no markdown or backticks.'
      },
      {
        role: 'user',
        content: generationPrompt
      }
    ]
  });

  const cleanedResponse = result.text.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedResponse);
  } catch (parseError) {
    const parseErr = normalizeError(parseError);
    const errorInfo = errorService.validation(`Video metadata JSON parsing failed: ${parseErr.message}`, {
      topic,
      language,
      responsePreview: cleanedResponse.substring(0, 200)
    });
    logErrorInfo(logger, 'warn', '⚠️ Video metadata JSON parsing failed, using fallback', errorInfo);
    throw parseErr;
  }

  const validated = VideoMetadataSchema.safeParse(parsed);
  if (!validated.success) {
    const errorInfo = errorService.validation('Video metadata schema validation failed', {
      topic,
      language,
      issues: validated.error.issues
    });
    logErrorInfo(logger, 'warn', '⚠️ Video metadata schema validation failed, using fallback', errorInfo);
    throw new Error('Video metadata schema validation failed');
  }

  return validated.data;
}
