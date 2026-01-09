import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene4Metadata } from '../../../types/microlearning';

export async function rewriteScene4Actionable(scene: Scene4Metadata, context: RewriteContext): Promise<Scene4Metadata> {
    return rewriteSceneWithBase<Scene4Metadata>(scene, 'actionable', context);
}
