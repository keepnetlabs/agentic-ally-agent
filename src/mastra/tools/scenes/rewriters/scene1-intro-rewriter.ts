import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteScene1Intro(scene: any, context: RewriteContext): Promise<any> {
    return rewriteSceneWithBase(scene, 'intro', context);
}
