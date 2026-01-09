import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene7Metadata } from '../../../types/microlearning';

export async function rewriteScene7Nudge(scene: Scene7Metadata, context: RewriteContext): Promise<Scene7Metadata> {
    return rewriteSceneWithBase<Scene7Metadata>(scene, 'nudge', context);
}
