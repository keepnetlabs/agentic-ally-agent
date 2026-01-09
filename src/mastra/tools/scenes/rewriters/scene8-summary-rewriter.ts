import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene8Metadata } from '../../../types/microlearning';

export async function rewriteScene8Summary(scene: Scene8Metadata, context: RewriteContext): Promise<Scene8Metadata> {
    return rewriteSceneWithBase<Scene8Metadata>(scene, 'summary', context);
}
