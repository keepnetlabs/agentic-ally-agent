import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';

export async function rewriteAppTexts(appTexts: any, context: RewriteContext): Promise<any> {
    // topic is not used for app-texts, so we pass empty string
    return rewriteSceneWithBase(appTexts, 'app-texts', { ...context, topic: '' });
}
