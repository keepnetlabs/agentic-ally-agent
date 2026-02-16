import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene5Metadata } from '../../../types/microlearning';

export async function rewriteScene5Quiz(scene: Scene5Metadata, context: RewriteContext): Promise<Scene5Metadata> {
  return rewriteSceneWithBase<Scene5Metadata>(scene, 'quiz', context);
}
