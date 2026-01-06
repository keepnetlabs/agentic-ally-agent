import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteScene7Nudge(scene: any, context: RewriteContext): Promise<any> {
    return rewriteSceneWithBase(scene, 'nudge', context);
}
