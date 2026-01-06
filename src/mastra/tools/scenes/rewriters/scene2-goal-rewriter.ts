import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteScene2Goal(scene: any, context: RewriteContext): Promise<any> {
    return rewriteSceneWithBase(scene, 'goal', context);
}
