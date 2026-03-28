import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene3Metadata } from '../../../types/microlearning';
import { getLogger } from '../../../utils/core/logger';

const logger = getLogger('Scene3VideoRewriter');

/**
 * Timestamp pattern: HH:MM:SS at the start of each transcript line
 */
const TIMESTAMP_REGEX = /^\d{2}:\d{2}:\d{2}/;

/**
 * Extract timestamps from a transcript string.
 * Each line starts with HH:MM:SS followed by text.
 * Returns ordered array of timestamps.
 */
function extractTimestamps(transcript: string): string[] {
  if (!transcript) return [];
  return transcript
    .split('\n')
    .map(line => {
      const match = line.match(TIMESTAMP_REGEX);
      return match ? match[0] : null;
    })
    .filter((ts): ts is string => ts !== null);
}

/**
 * Restore original timestamps into a translated transcript.
 * The AI may corrupt timestamps (e.g., 00:01:01 → 01:00:01).
 * This function replaces each translated line's timestamp with the
 * corresponding source timestamp, preserving the translated text.
 */
function restoreTimestamps(sourceTranscript: string, translatedTranscript: string): string {
  const sourceTimestamps = extractTimestamps(sourceTranscript);

  if (sourceTimestamps.length === 0) return translatedTranscript;

  const translatedLines = translatedTranscript.split('\n');
  let tsIndex = 0;
  let restoredCount = 0;

  const restoredLines = translatedLines.map(line => {
    const match = line.match(TIMESTAMP_REGEX);
    if (match && tsIndex < sourceTimestamps.length) {
      const originalTs = sourceTimestamps[tsIndex];
      const currentTs = match[0];
      tsIndex++;

      if (currentTs !== originalTs) {
        restoredCount++;
        return line.replace(currentTs, originalTs);
      }
    }
    return line;
  });

  if (restoredCount > 0) {
    logger.info('Restored corrupted timestamps in transcript', {
      restoredCount,
      totalTimestamps: sourceTimestamps.length,
    });
  }

  return restoredLines.join('\n');
}

export async function rewriteScene3Video(scene: Scene3Metadata, context: RewriteContext): Promise<Scene3Metadata> {
  // Capture source transcript before AI rewrite
  const sourceTranscript = scene?.video?.transcript || '';

  const rewritten = await rewriteSceneWithBase<Scene3Metadata>(scene, 'video', context);

  // Post-process: restore original timestamps if transcript exists
  try {
    if (sourceTranscript && rewritten?.video?.transcript) {
      rewritten.video.transcript = restoreTimestamps(sourceTranscript, rewritten.video.transcript);
    }
  } catch (err) {
    logger.warn('Timestamp restoration failed, using AI output as-is', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return rewritten;
}
