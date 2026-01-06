import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteScene6Survey(scene: any, context: RewriteContext): Promise<any> {
    return rewriteSceneWithBase(scene, 'survey', context);
}
