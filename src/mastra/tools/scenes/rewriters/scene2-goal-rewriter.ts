import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene2Metadata } from '../../../types/microlearning';

export async function rewriteScene2Goal(scene: Scene2Metadata, context: RewriteContext): Promise<Scene2Metadata> {
    return rewriteSceneWithBase<Scene2Metadata>(scene, 'goal', context);
}
