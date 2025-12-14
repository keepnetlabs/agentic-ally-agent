import { jsonrepair } from 'jsonrepair';
import { getLogger } from '../core/logger';

const logger = getLogger('JsonCleaner');

export function cleanResponse(text: string, sectionName: string): string {
  try {
    logger.debug('Cleaning response', { sectionName, textLength: text.length });

    // Use json-repair to fix all JSON issues automatically
    const clean = jsonrepair(text.trim());
    logger.debug('Applied json-repair', { sectionName });

    logger.debug('Cleaned successfully', { sectionName, cleanLength: clean.length });
    return clean;
  } catch (cleanErr) {
    const err = cleanErr instanceof Error ? cleanErr : new Error(String(cleanErr));
    logger.error('Error cleaning response', { sectionName, error: err.message, stack: err.stack });
    logger.debug('Raw text sample', { sectionName, sample: text.substring(0, 500) });
    throw new Error(`Failed to clean ${sectionName} response: ${cleanErr instanceof Error ? cleanErr.message : String(cleanErr)}`);
  }
}
