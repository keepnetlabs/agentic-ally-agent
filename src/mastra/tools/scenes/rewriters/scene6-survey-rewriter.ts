import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene6Metadata } from '../../../types/microlearning';

export async function rewriteScene6Survey(scene: Scene6Metadata, context: RewriteContext): Promise<Scene6Metadata> {
    return rewriteSceneWithBase<Scene6Metadata>(scene, 'survey', context);
}
