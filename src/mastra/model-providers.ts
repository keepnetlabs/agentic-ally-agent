import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';


/**
 * Enum for the supported model providers
 */
export enum ModelProvider {
    OPENAI = 'openai',
    WORKERS_AI = 'workers-ai',
    GOOGLE = 'google',
}

export enum Model {
    OPENAI_GPT_4O = 'gpt-4o',
    OPENAI_GPT_4O_MINI = 'gpt-4o-mini',
    OPENAI_GPT_4_1 = 'gpt-4.1',
    OPENAI_GPT_4_1_MINI = 'gpt-4.1-mini',
    OPENAI_GPT_5_NANO = 'gpt-5-nano',
    OPENAI_GPT_5_MINI = 'gpt-5-mini',
    WORKERS_AI_GPT_OSS_120B = '@cf/openai/gpt-oss-120b',
    GOOGLE_GEMINI_2_5_PRO = 'gemini-2.5-pro',
    GOOGLE_GEMINI_2_5_FLASH = 'gemini-2.5-flash',
    GOOGLE_GEMINI_3_PRO = 'gemini-3-pro',
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
    const cloudflareGatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID;
    switch (provider) {
        case 'openai':
            // Use Cloudflare AI Gateway if configured, otherwise OpenAI directly
            if (cloudflareAccountId && cloudflareApiKey && openAIApiKey) {
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

        case 'workers-ai':
            // Workers AI provider - using OpenAI SDK with Workers AI endpoint
            if (!cloudflareAccountId || !cloudflareApiKey) {
                throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY are required for Workers AI');
            }
            if (!cloudflareGatewayId) {
                throw new Error('CLOUDFLARE_AI_GATEWAY_ID is required for Workers AI');
            }

            const workerApiToken = process.env.CLOUDFLARE_WORKERS_API_TOKEN || cloudflareApiKey;
            // Use Workers AI OpenAI-compatible endpoint through AI Gateway
            // Note: @ai-sdk/openai automatically appends /chat/completions to baseURL
            const baseURL = `https://gateway.ai.cloudflare.com/v1/${cloudflareAccountId}/${cloudflareGatewayId}/workers-ai/v1`;

            console.log('🔧 Using Workers AI (via AI Gateway):', {
                accountId: cloudflareAccountId,
                gatewayId: cloudflareGatewayId,
                baseURL: baseURL,
                model: '@cf/openai/gpt-oss-120b',
                apiKeyLength: workerApiToken?.length,
            });

            // Custom fetch to transform Cloudflare response format to OpenAI format
            const customFetch = async (url: string, options: any) => {
                const response = await fetch(url, options);
                const data = await response.json();

                // Store raw Cloudflare response for reasoning extraction
                if (data.output) {
                    const reasoningItem = data.output.find((item: any) => item.type === 'reasoning');
                    if (reasoningItem?.content?.[0]?.text) {
                        (data as any)._reasoning = reasoningItem.content[0].text;
                        //console.log('🧠 Reasoning from Workers AI:', reasoningItem.content[0].text);
                    }
                }

                // Transform Cloudflare format to OpenAI format
                if (data.usage) {
                    if (data.usage.prompt_tokens !== undefined && data.usage.input_tokens === undefined) {
                        data.usage.input_tokens = data.usage.prompt_tokens;
                    }
                    if (data.usage.completion_tokens !== undefined && data.usage.output_tokens === undefined) {
                        data.usage.output_tokens = data.usage.completion_tokens;
                    }
                }

                return new Response(JSON.stringify(data), {
                    status: response.status,
                    headers: response.headers,
                });
            };

            return createOpenAI({
                baseURL: baseURL,
                apiKey: workerApiToken,
                headers: {
                    'cf-aig-authorization': 'Bearer ' + cloudflareGatewayAuthKey,
                },
                fetch: customFetch as any,
            });

        case 'google':
            // Google Gemini provider
            if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
                throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for Google Gemini');
            }
            const googleProvider = createGoogleGenerativeAI({
                apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            });
            return (modelId: string) => googleProvider(modelId);

        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

/**
 * Default models used across the application
 */
export function getDefaultAgentModel() {
    return getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_4O);
}

export function getDefaultGenerationModel() {
    return getModel(ModelProvider.WORKERS_AI, Model.WORKERS_AI_GPT_OSS_120B);
}

/**
 * Get model with override support from frontend/backend
 * If modelProvider and modelName provided, use them; otherwise use default
 * @param modelProvider - Optional model provider (OPENAI, WORKERS_AI, GOOGLE)
 * @param modelName - Optional model name (e.g., OPENAI_GPT_4O, WORKERS_AI_GPT_OSS_120B)
 * @param defaultFunc - Function to call if no override provided (default: getDefaultGenerationModel)
 * @returns Model instance
 */
export function getModelWithOverride(
    modelProvider?: string,
    modelName?: string,
    defaultFunc = getDefaultGenerationModel
) {
    if (!modelProvider || !modelName) {
        return defaultFunc();
    }

    try {
        const provider = ModelProvider[modelProvider as keyof typeof ModelProvider];
        if (!provider) {
            console.warn(`Invalid model provider: ${modelProvider}, using default`);
            return defaultFunc();
        }

        const model = getModel(provider, Model[modelName as keyof typeof Model]);
        console.log(`🔧 Using model override: ${modelProvider}/${modelName}`);
        return model;
    } catch (error) {
        console.warn(`Failed to load model ${modelProvider}/${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}, using default`);
        return defaultFunc();
    }
}