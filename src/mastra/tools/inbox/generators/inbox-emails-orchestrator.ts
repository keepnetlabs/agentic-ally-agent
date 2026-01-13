import { generateText } from 'ai';
import { LanguageModel } from '../../../types/language-model';
import { SimulatedEmail } from '../../../types/microlearning';
import { buildInboxEmailBaseSystem } from './inbox-email-base';
import { EmailVariant, variantDeltaBuilder, buildHintsFromInsights } from './inbox-email-variants';
import { cleanResponse } from '../../../utils/content-processors/json-cleaner';
import { INBOX_GENERATION_PARAMS } from '../../../utils/config/llm-generation-params';
import { getLogger } from '../../../utils/core/logger';
import { errorService } from '../../../services/error-service';
import { logErrorInfo } from '../../../utils/core/error-utils';
import { withRetry } from '../../../utils/core/resilience-utils';

const logger = getLogger('InboxEmailsOrchestrator');

export type OrchestratorArgs = {
    topic: string;
    languageCode: string;
    category: string;
    riskArea: string;
    level: string;
    department: string;  // NEW: Department context for topic-specific emails
    additionalContext?: string; // NEW: User context, vulnerabilities, or specific requirements
    model: LanguageModel;
};

// Get unique timestamp instructions for N emails (AI will generate timestamps in target language)
// We use semantic descriptors instead of hard-coded English strings
function getUniqueTimestampInstructions(count: number, languageCode: string): string[] {
    // Define timestamp options as semantic descriptors (relative time concepts)
    // AI will translate these to natural expressions in the target language
    const timestampOptions = [
        { key: 'very_recent', order: 12 },      // ~15-30 minutes ago
        { key: 'recent_short', order: 11 },     // ~30-60 minutes ago  
        { key: 'recent_medium', order: 10 },    // ~1-2 hours ago
        { key: 'recent_long', order: 9 },       // ~2-3 hours ago
        { key: 'today_morning', order: 8 },     // This morning / Earlier today
        { key: 'today_afternoon', order: 7 },   // ~4-6 hours ago
        { key: 'yesterday', order: 6 },         // Yesterday
        { key: 'one_day_ago', order: 5 },       // 1 day ago
        { key: 'two_days_ago', order: 4 },      // 2 days ago
        { key: 'few_days_ago', order: 3 },      // 3 days ago
        { key: 'this_week', order: 2 },         // This week
        { key: 'older', order: 1 },             // Older options
    ];

    // Select unique timestamps and sort by order (newest first)
    const selected = timestampOptions
        .slice(0, Math.min(count, timestampOptions.length))
        .sort((a, b) => b.order - a.order);

    // Return instructions that tell AI to generate timestamps in target language
    // Format: instruction that AI can interpret and translate naturally
    return selected.map((opt) => {
        // Create a natural instruction for AI to generate timestamp in target language
        // AI will produce natural expressions like "15 dakika önce" (tr), "منذ 15 دقيقة" (ar), etc.
        return `generate_timestamp_${opt.key}_in_${languageCode}`;
    });
}

async function generateOneEmail(
    index: number,
    systemPrompt: string,
    model: LanguageModel,
    topic: string,
    department: string,
    variant: EmailVariant,
    timestampInstruction: string,
    languageCode: string,
    additionalContext?: string // New parameter
): Promise<SimulatedEmail> {
    // Parse timestamp instruction and create natural language instruction for AI
    // Extract the semantic key (e.g., "very_recent", "yesterday") from instruction
    const timestampMatch = timestampInstruction.match(/generate_timestamp_(\w+)_in_/);
    const timestampKey = timestampMatch ? timestampMatch[1] : 'recent_medium';

    // Create natural instruction for AI to generate timestamp in target language
    // Note: languageCode is BCP-47 format (e.g., "tr-tr", "ar-sa", "en-gb") but we want AI to produce natural expressions
    const timestampInstructions: Record<string, string> = {
        'very_recent': `CRITICAL: Use timestamp meaning "15-30 minutes ago" in ${languageCode} (write naturally as a native speaker would, e.g., Turkish: "15 dakika önce", Arabic: "منذ 15 دقيقة").`,
        'recent_short': `CRITICAL: Use timestamp meaning "30-60 minutes ago" in ${languageCode} (write naturally as a native speaker would).`,
        'recent_medium': `CRITICAL: Use timestamp meaning "1-2 hours ago" in ${languageCode} (write naturally as a native speaker would).`,
        'recent_long': `CRITICAL: Use timestamp meaning "2-3 hours ago" in ${languageCode} (write naturally as a native speaker would).`,
        'today_morning': `CRITICAL: Use timestamp meaning "this morning" or "earlier today" in ${languageCode} (write naturally as a native speaker would, e.g., Turkish: "bu sabah", Arabic: "هذا الصباح").`,
        'today_afternoon': `CRITICAL: Use timestamp meaning "4-6 hours ago" in ${languageCode} (write naturally as a native speaker would).`,
        'yesterday': `CRITICAL: Use timestamp meaning "yesterday" in ${languageCode} (write naturally as a native speaker would, e.g., Turkish: "dün", Arabic: "أمس").`,
        'one_day_ago': `CRITICAL: Use timestamp meaning "1 day ago" in ${languageCode} (write naturally as a native speaker would).`,
        'two_days_ago': `CRITICAL: Use timestamp meaning "2 days ago" in ${languageCode} (write naturally as a native speaker would).`,
        'few_days_ago': `CRITICAL: Use timestamp meaning "3 days ago" in ${languageCode} (write naturally as a native speaker would).`,
        'this_week': `CRITICAL: Use timestamp meaning "this week" in ${languageCode} (write naturally as a native speaker would).`,
        'older': `CRITICAL: Use timestamp meaning "several days ago" in ${languageCode} (write naturally as a native speaker would).`,
    };

    const timestampInstructionText = timestampInstructions[timestampKey] || timestampInstructions['recent_medium'];

    // Pass additionalContext to buildHintsFromInsights
    const delta = variantDeltaBuilder[variant](buildHintsFromInsights(topic, index, department, additionalContext)) + ` ${timestampInstructionText}`;

    // Build messages array with multi-message pattern for consistency with scenes
    const messages: any[] = [
        { role: 'system', content: systemPrompt }
    ];

    // If phishing variant + additionalContext exists, add dedicated context message
    // Both ObviousPhishing and SophisticatedPhishing benefit from user vulnerability intelligence
    const isPhishingVariant = variant === EmailVariant.SophisticatedPhishing ||
        variant === EmailVariant.ObviousPhishing;
    if (isPhishingVariant && additionalContext) {
        messages.push({
            role: 'user',
            content: `🔴 CRITICAL USER VULNERABILITY - Targeted Attack Context:

${additionalContext}`
        });
    }

    // Add main email generation request
    messages.push({
        role: 'user',
        content: delta
    });

    try {
        const res = await withRetry(
            () => generateText({
                model,
                messages: messages,
                ...INBOX_GENERATION_PARAMS,
            }),
            `[InboxEmailsOrchestrator] email-generation-${variant}-${index + 1}`
        );

        const cleaned = cleanResponse(res.text, `inbox-email-${index + 1}`);
        const parsed = JSON.parse(cleaned) as SimulatedEmail;
        parsed.id = String(index + 1);
        logger.debug('Email generated successfully', { variant, index: index + 1 });
        return parsed;
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.warn('Email generation failed, retrying with fixed prompt', {
            variant,
            index: index + 1,
            error: errorMessage,
        });

        // minimal per-variant retry once - rebuild messages with retry instruction
        const retryMessages: any[] = [
            { role: 'system', content: systemPrompt }
        ];

        // Apply same phishing variant check for retry
        if (isPhishingVariant && additionalContext) {
            retryMessages.push({
                role: 'user',
                content: `🔴 CRITICAL USER VULNERABILITY - Targeted Attack Context:

${additionalContext}`
            });
        }

        retryMessages.push({
            role: 'user',
            content: delta + '\nIf previous output was not valid JSON, fix and resend as a single JSON object.'
        });

        try {
            const res2 = await withRetry(
                () => generateText({
                    model,
                    messages: retryMessages,
                    ...INBOX_GENERATION_PARAMS,
                }),
                `[InboxEmailsOrchestrator] email-generation-retry-${variant}-${index + 1}`
            );
            const cleaned2 = cleanResponse(res2.text, `inbox-email-retry-${index + 1}`);
            const parsed2 = JSON.parse(cleaned2) as SimulatedEmail;
            parsed2.id = String(index + 1);
            logger.debug('Email generated successfully after retry', { variant, index: index + 1 });
            return parsed2;
        } catch (retryErr) {
            const retryErrorMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
            const errorInfo = errorService.aiModel(`Email generation failed for ${variant} after retry`, {
                variant,
                index: index + 1,
                originalError: errorMessage,
                retryError: retryErrorMessage,
                topic,
            });
            logErrorInfo(logger, 'error', 'Email generation failed after retry', errorInfo);
            throw retryErr;
        }
    }
}

export async function generateInboxEmailsParallel(args: OrchestratorArgs): Promise<SimulatedEmail[]> {
    // Base system prompt (generic) for ALL emails
    // Context is now injected purely via variant hints in generateOneEmail
    const system = buildInboxEmailBaseSystem(
        args.topic,
        args.languageCode,
        args.category,
        args.riskArea,
        args.level
    );

    const variantPlan: EmailVariant[] = [
        EmailVariant.ObviousPhishing,
        EmailVariant.SophisticatedPhishing, // Targeted one (if context exists)
        EmailVariant.CasualLegit,
        EmailVariant.FormalLegit,
    ];

    // Generate randomized, unique timestamp instructions for each email variant
    // AI will translate these to natural expressions in the target language
    const uniqueTimestampInstructions = getUniqueTimestampInstructions(variantPlan.length, args.languageCode);

    logger.info('Generating emails', {
        topic: args.topic,
        department: args.department,
        languageCode: args.languageCode,
        timestampCount: uniqueTimestampInstructions.length,
        hasAdditionalContext: !!args.additionalContext
    });

    const tasks = variantPlan.map((variant, i) => {
        // Apply targeted context to both phishing variants (realistic - attackers research targets)
        // Legit emails don't need vulnerability context (they're normal workplace communication)
        const useTargetedPrompt = variant === EmailVariant.SophisticatedPhishing ||
            variant === EmailVariant.ObviousPhishing;
        const contextForVariant = useTargetedPrompt ? args.additionalContext : undefined;

        return generateOneEmail(i, system, args.model, args.topic, args.department, variant, uniqueTimestampInstructions[i], args.languageCode, contextForVariant);
    });

    // Use allSettled to continue even if some emails fail
    const results = await Promise.allSettled(tasks);
    const emails = results
        .map((result, i) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            // Log failed emails
            logger.error('Email generation failed', {
                variant: variantPlan[i],
                index: i + 1,
                error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
            return null;
        })
        .filter((email): email is SimulatedEmail => email !== null);

    // Ensure at least one email was generated
    if (emails.length === 0) {
        const errorInfo = errorService.aiModel('All email generation attempts failed', {
            topic: args.topic,
            department: args.department,
            attemptedVariants: variantPlan.length,
        });
        logErrorInfo(logger, 'error', 'All email generation failed', errorInfo);
        // Throw error with errorInfo message - this is a utility function, not a tool
        throw new Error(errorInfo.message);
    }

    logger.info('Email generation completed', {
        topic: args.topic,
        successful: emails.length,
        attempted: variantPlan.length,
        failed: variantPlan.length - emails.length,
    });

    return emails;
}


