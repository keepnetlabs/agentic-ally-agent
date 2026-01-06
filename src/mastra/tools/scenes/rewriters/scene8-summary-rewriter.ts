import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteScene8Summary(scene: any, context: RewriteContext): Promise<any> {
    return rewriteSceneWithBase(scene, 'summary', context);
}
