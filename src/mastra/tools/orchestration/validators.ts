import { getLogger } from '../../utils/core/logger';
import { CreateMicrolearningResult, AddLanguageResult } from './types';

const logger = getLogger('WorkflowValidators');

/**
 * Validates workflow result structure
 */
export function validateCreateMicrolearningResult(result: CreateMicrolearningResult): boolean {
  if (result.status !== 'success') {
    return false;
  }
  if (!result.result?.metadata) {
    logger.warn('Workflow result missing metadata structure');
    return false;
  }
  const metadata = result.result.metadata;
  if (!metadata.trainingUrl) {
    logger.warn('Workflow metadata missing trainingUrl');
    return false;
  }
  return true;
}

/**
 * Validates add-language result structure
 */
export function validateAddLanguageResult(result: AddLanguageResult): boolean {
  if (result.status !== 'success') {
    return false;
  }
  if (!result.result?.data) {
    logger.warn('Workflow result missing data structure');
    return false;
  }
  const data = result.result.data;
  if (!data.trainingUrl) {
    logger.warn('Workflow data missing trainingUrl');
    return false;
  }
  return true;
}
