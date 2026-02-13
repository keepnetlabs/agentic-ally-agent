import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { AppContent } from '../../../types/microlearning';

export async function rewriteAppTexts(appTexts: AppContent, context: RewriteContext): Promise<AppContent> {
  // topic is not used for app-texts, so we pass empty string
  return rewriteSceneWithBase<AppContent>(appTexts, 'app-texts', { ...context, topic: '' });
}
