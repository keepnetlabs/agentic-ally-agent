import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteScene3Video(scene: any, context: RewriteContext): Promise<any> {
    return rewriteSceneWithBase(scene, 'video', context);
}
