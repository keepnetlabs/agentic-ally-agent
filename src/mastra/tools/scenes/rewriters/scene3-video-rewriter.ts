import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene3Metadata } from '../../../types/microlearning';

export async function rewriteScene3Video(scene: Scene3Metadata, context: RewriteContext): Promise<Scene3Metadata> {
    return rewriteSceneWithBase<Scene3Metadata>(scene, 'video', context);
}
