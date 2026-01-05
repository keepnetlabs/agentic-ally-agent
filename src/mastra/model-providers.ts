import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getLogger } from './utils/core/logger';
import { normalizeError } from './utils/core/error-utils';

const logger = getLogger('ModelProviders');

/**
 * Enum for the supported model providers
 */
export enum ModelProvider {
    OPENAI = 'openai',
    WORKERS_AI = 'workers-ai',
    GOOGLE = 'google',
}

/**
 * Validates if a string is a valid ModelProvider
 */
function isValidModelProvider(provider: string): provider is ModelProvider {
    return Object.values(ModelProvider).includes(provider as ModelProvider);
}

/**
 * Validates if a string is a valid Model
 */
function isValidModel(model: string): model is Model {
    return Object.values(Model).includes(model as Model);
}

export enum Model {
    OPENAI_GPT_4O = 'gpt-4o',
    OPENAI_GPT_4O_MINI = 'gpt-4o-mini',
    OPENAI_GPT_4_1 = 'gpt-4.1',
    OPENAI_GPT_4_1_MINI = 'gpt-4.1-mini',
    OPENAI_GPT_4_1_NANO = 'gpt-4.1-nano',
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
    // Initialize provider if not already cached
    if (!modelProviderCache.has(provider)) {
        const modelProvider = getModelProvider(provider);
        modelProviderCache.set(provider, modelProvider);
        return modelProvider(model);
    }

    // Return from cache (guaranteed to exist at this point)
    const cachedProvider = modelProviderCache.get(provider);
    if (!cachedProvider) {
        // This should never happen, but fail gracefully if logic changes
        throw new Error(`Internal error: model provider ${provider} not found in cache after initialization`);
    }
    return cachedProvider(model);
}

// Singleton cache for model providers
const modelProviderCache = new Map<ModelProvider, ReturnType<typeof getModelProvider>>();

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
                throw new Error('Failed to initialize ModelProvider.OPENAI: OPENAI_API_KEY environment variable is not set');
            }
            return createOpenAI({ apiKey: openAIApiKey });

        case 'workers-ai':
            // Workers AI provider - using OpenAI SDK with Workers AI endpoint
            if (!cloudflareAccountId || !cloudflareApiKey) {
                throw new Error('Failed to initialize ModelProvider.WORKERS_AI: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_KEY environment variables');
            }
            if (!cloudflareGatewayId) {
                throw new Error('Failed to initialize ModelProvider.WORKERS_AI: CLOUDFLARE_AI_GATEWAY_ID environment variable is not set');
            }

            const workerApiToken = process.env.CLOUDFLARE_WORKERS_API_TOKEN || cloudflareApiKey;
            // Use Workers AI OpenAI-compatible endpoint through AI Gateway
            // Note: @ai-sdk/openai automatically appends /chat/completions to baseURL
            const baseURL = `https://gateway.ai.cloudflare.com/v1/${cloudflareAccountId}/${cloudflareGatewayId}/workers-ai/v1`;

            logger.info('Using Workers AI (via AI Gateway)', {
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
                        data.reasoning = reasoningItem.content[0].text;
                    }
                }

                // Transform Cloudflare format to AI SDK v5 format
                // Cloudflare: prompt_tokens, completion_tokens (snake_case)
                // AI SDK v5: inputTokens, outputTokens (camelCase)
                if (data.usage) {
                    if (data.usage.prompt_tokens !== undefined) {
                        data.usage.inputTokens = data.usage.prompt_tokens;  // AI SDK v5 format
                        data.usage.input_tokens = data.usage.prompt_tokens;  // Backward compat
                    }
                    if (data.usage.completion_tokens !== undefined) {
                        data.usage.outputTokens = data.usage.completion_tokens;  // AI SDK v5 format
                        data.usage.output_tokens = data.usage.completion_tokens;  // Backward compat
                    }
                    if (data.usage.prompt_tokens !== undefined && data.usage.completion_tokens !== undefined) {
                        data.usage.totalTokens = data.usage.prompt_tokens + data.usage.completion_tokens;
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
                throw new Error('Failed to initialize ModelProvider.GOOGLE: GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
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
    // Using GPT-4.1-mini for better prompt following (especially for STOP instructions)
    // GPT-4o-mini had issues with not stopping after upload/assign operations
    return getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_4O);
}

// Lightweight model for simple agents (routing, policy summary)
export function getLightAgentModel() {
    return getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_4O_MINI);
}

export function getDefaultGenerationModel() {
    logger.info('Using default generation model', { model: Model.WORKERS_AI_GPT_OSS_120B });
    return getModel(ModelProvider.WORKERS_AI, Model.WORKERS_AI_GPT_OSS_120B);
}

/**
 * Normalize model provider string to enum format
 * Converts uppercase/underscore format (e.g., WORKERS_AI) to lowercase/hyphen (e.g., workers-ai)
 * @param provider - Raw provider string from input
 * @returns Normalized provider string
 */
function normalizeModelProvider(provider: string): string {
    return provider
        .toLowerCase()
        .replace(/_/g, '-');
}

/**
 * Normalize model name string to enum format
 * Converts uppercase/underscore format (e.g., OPENAI_GPT_4O) to lowercase/hyphen (e.g., openai-gpt-4o)
 * @param model - Raw model name from input
 * @returns Normalized model string
 */
function normalizeModelName(model: string): string {
    return model
        .toLowerCase()
        .replace(/_/g, '-');
}

/**
 * Get model with override support from frontend/backend
 * If modelProvider and modelName provided, use them; otherwise use default
 * Supports both uppercase (WORKERS_AI) and lowercase (workers-ai) formats
 * @param modelProvider - Optional model provider (OPENAI, WORKERS_AI, GOOGLE or openai, workers-ai, google)
 * @param modelName - Optional model name (e.g., OPENAI_GPT_4O or openai-gpt-4o)
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
        // Normalize input to enum format
        const normalizedProvider = normalizeModelProvider(modelProvider);
        const normalizedModel = normalizeModelName(modelName);

        if (!isValidModelProvider(normalizedProvider)) {
            logger.warn('Invalid model provider, using default', {
                modelProvider,
                normalizedProvider
            });
            return defaultFunc();
        }

        if (!isValidModel(normalizedModel)) {
            logger.warn('Invalid model name, using default', {
                modelName,
                normalizedModel
            });
            return defaultFunc();
        }

        const model = getModel(normalizedProvider as ModelProvider, normalizedModel as Model);
        logger.info('Using model override', {
            modelProvider,
            modelName,
            normalizedProvider,
            normalizedModel
        });
        return model;
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('Failed to load model, using default', {
            modelProvider,
            modelName,
            error: err.message,
            stack: err.stack
        });
        return defaultFunc();
    }
}