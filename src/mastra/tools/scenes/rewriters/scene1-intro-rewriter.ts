import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { Scene1Metadata } from '../../../types/microlearning';

export async function rewriteScene1Intro(scene: Scene1Metadata, context: RewriteContext): Promise<Scene1Metadata> {
    return rewriteSceneWithBase<Scene1Metadata>(scene, 'intro', context);
}
