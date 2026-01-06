import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteScene5Quiz(scene: any, context: RewriteContext): Promise<any> {
    return rewriteSceneWithBase(scene, 'quiz', context);
}
