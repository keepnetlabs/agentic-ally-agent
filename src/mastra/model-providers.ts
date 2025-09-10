import { createOpenAI } from '@ai-sdk/openai';

/**
 * Enum for the supported model providers
 */
export const enum ModelProvider {
    OPENAI = 'openai',
    CLOUDFLARE = 'cloudflare',
}

export const enum Model {
    OPENAI_GPT_4O_MINI = 'gpt-4o-mini',
    OPENAI_GPT_5_NANO = 'gpt-5-nano',
    OPENAI_GPT_5_MINI = 'gpt-5-mini',
    CLOUDFLARE_GPT_OSS_120B = 'workers-ai/@cf/openai/gpt-oss-120b',
}

/**
 * Gets or creates a model instance using the specified provider and model
 * Uses singleton pattern to cache model providers
 * @param provider The model provider to use
 * @param model The specific model to retrieve
 * @returns The model instance
 */
export function getModel(provider: ModelProvider, model: Model) {
    // Check if provider is already cached
    if (!modelProviderCache.has(provider)) {
        const modelProvider = getModelProvider(provider);
        modelProviderCache.set(provider, modelProvider);
    }

    const modelProvider = modelProviderCache.get(provider);

    // Return the specific model from the provider
    return modelProvider(model);
}

// Singleton cache for model providers
const modelProviderCache = new Map<ModelProvider, any>();

/**
 * Creates a model provider factory that can be called at runtime
 * This avoids accessing environment variables at module initialization time
 * @returns A function that creates model providers with runtime configuration
 */
function getModelProvider(provider: ModelProvider) {
    const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY;
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const cloudflareGatewayAuthKey = process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY;
    switch (provider) {
        case 'openai':
            // Use Cloudflare AI Gateway if configured, otherwise OpenAI directly
            if (cloudflareAccountId && cloudflareApiKey && openAIApiKey) {
                const cloudflareGatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID;
                if (cloudflareGatewayId) {
                    const cfBaseURL = `https://gateway.ai.cloudflare.com/v1/${cloudflareAccountId}/${cloudflareGatewayId}/openai`;
                    const cfHeaders = {
                        'cf-aig-authorization': 'Bearer ' + cloudflareGatewayAuthKey,
                    };
                    return createOpenAI({
                        baseURL: cfBaseURL,
                        apiKey: openAIApiKey,
                        headers: cfHeaders,
                    });
                }
            }
            // Fallback to direct OpenAI
            if (!openAIApiKey) {
                throw new Error('OPENAI_API_KEY is required');
            }
            return createOpenAI({ apiKey: openAIApiKey });

        case 'cloudflare':
            // Use Cloudflare AI Gateway as per official docs
            if (!cloudflareAccountId || !cloudflareApiKey) {
                throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY are required for Cloudflare AI');
            }

            const cloudflareGatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID;
            if (cloudflareGatewayId) {
                // Through AI Gateway (recommended for caching and analytics)
                console.log('🔧 Using AI Gateway:', {
                    accountId: cloudflareAccountId,
                    gatewayId: cloudflareGatewayId,
                    apiKeyLength: cloudflareApiKey?.length
                });

                return createOpenAI({
                    baseURL: `https://gateway.ai.cloudflare.com/v1/${cloudflareAccountId}/${cloudflareGatewayId}/workers-ai/v1/chat/completions`,
                    apiKey: cloudflareApiKey,
                    headers: {
                        'Authorization': `Bearer ${cloudflareApiKey}`,
                        'cf-aig-authorization': 'Bearer ' + cloudflareGatewayAuthKey
                    },
                });
            } else {
                // Direct Workers AI (fallback) - also using compat endpoint
                console.log('🔧 Using Direct Workers AI:', {
                    accountId: cloudflareAccountId,
                    apiKeyLength: cloudflareApiKey?.length
                });

                return createOpenAI({
                    baseURL: `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1`,
                    apiKey: cloudflareApiKey,
                    headers: {
                        'Authorization': `Bearer ${cloudflareApiKey}`,
                    },
                });
            }

        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}