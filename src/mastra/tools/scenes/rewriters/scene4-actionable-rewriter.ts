import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteScene4Actionable(scene: any, context: RewriteContext): Promise<any> {
    return rewriteSceneWithBase(scene, 'actionable', context);
}
