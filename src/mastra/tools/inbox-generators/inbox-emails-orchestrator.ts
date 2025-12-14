import { generateText } from 'ai';
import { buildInboxEmailBaseSystem } from './inbox-email-base';
import { EmailVariant, variantDeltaBuilder, buildHintsFromInsights } from './inbox-email-variants';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { INBOX_GENERATION_PARAMS } from '../../utils/config/llm-generation-params';
import { getLogger } from '../../utils/core/logger';

type OrchestratorArgs = {
    topic: string;
    languageCode: string;
    category: string;
    riskArea: string;
    level: string;
    department: string;  // NEW: Department context for topic-specific emails
    additionalContext?: string; // NEW: User context, vulnerabilities, or specific requirements
    model: any;
};

const VARIANTS: EmailVariant[] = [
    EmailVariant.ObviousPhishing,
    EmailVariant.SophisticatedPhishing,
    EmailVariant.CasualLegit,
    EmailVariant.FormalLegit,
];

// Timestamp pool for email realism - ensures no repeats
const TIMESTAMP_POOL = [
    '15 minutes ago',
    '30 minutes ago',
    '1 hour ago',
    '2 hours ago',
    '3 hours ago',
    '4 hours ago',
    'This morning',
    '1 day ago',
    '2 days ago',
    'Yesterday',
    'This week',
    '3 days ago',
];

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Timestamp ordering for realistic inbox display (newest first)
const TIMESTAMP_ORDER = {
    '15 minutes ago': 12,
    '30 minutes ago': 11,
    '1 hour ago': 10,
    '2 hours ago': 9,
    '3 hours ago': 8,
    'This morning': 7,
    '4 hours ago': 6,
    '1 day ago': 5,
    'This week': 4,
    '2 days ago': 3,
    '3 days ago': 2,
    'Yesterday': 1,
};

// Get unique timestamps for N emails (no repeats), ordered newest first
function getUniqueTimestamps(count: number): string[] {
    const shuffled = shuffleArray(TIMESTAMP_POOL);
    const selected = shuffled.slice(0, Math.min(count, TIMESTAMP_POOL.length));

    // Sort by TIMESTAMP_ORDER (newest first) for realistic inbox display
    return selected.sort((a, b) => (TIMESTAMP_ORDER[b as keyof typeof TIMESTAMP_ORDER] || 0) - (TIMESTAMP_ORDER[a as keyof typeof TIMESTAMP_ORDER] || 0));
}

async function generateOneEmail(
    index: number,
    systemPrompt: string,
    model: any,
    topic: string,
    department: string,
    variant: EmailVariant,
    timestamp: string,
    additionalContext?: string // New parameter
): Promise<any> {
    const timestampInstruction = `CRITICAL:Use timestamp "${timestamp}" for this email.`;
    // Pass additionalContext to buildHintsFromInsights
    const delta = variantDeltaBuilder[variant](buildHintsFromInsights(topic, index, department, additionalContext)) + ` ${timestampInstruction}`;

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
        const res = await generateText({
            model,
            messages: messages,
            ...INBOX_GENERATION_PARAMS,
        });

        const cleaned = cleanResponse(res.text, `inbox-email-${index + 1}`);
        const parsed = JSON.parse(cleaned);
        parsed.id = String(index + 1);
        return parsed;
    } catch (err) {
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

        const res2 = await generateText({
            model,
            messages: retryMessages,
            ...INBOX_GENERATION_PARAMS,
        });
        const cleaned2 = cleanResponse(res2.text, `inbox-email-retry-${index + 1}`);
        const parsed2 = JSON.parse(cleaned2);
        parsed2.id = String(index + 1);
        return parsed2;
    }
}

export async function generateInboxEmailsParallel(args: OrchestratorArgs): Promise<any[]> {
    const logger = getLogger('InboxEmailsOrchestrator');

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

    // Generate randomized, unique timestamps for each email variant
    const uniqueTimestamps = getUniqueTimestamps(variantPlan.length);

    logger.info('Generating emails', { topic: args.topic, department: args.department });
    logger.info('Using timestamps', { timestamps: uniqueTimestamps.join(', ') });
    if (args.additionalContext) {
        logger.info('Applying user context to phishing variants', { variants: 'ObviousPhishing + SophisticatedPhishing' });
    }

    const tasks = variantPlan.map((variant, i) => {
        // Apply targeted context to both phishing variants (realistic - attackers research targets)
        // Legit emails don't need vulnerability context (they're normal workplace communication)
        const useTargetedPrompt = variant === EmailVariant.SophisticatedPhishing ||
                                  variant === EmailVariant.ObviousPhishing;
        const contextForVariant = useTargetedPrompt ? args.additionalContext : undefined;

        return generateOneEmail(i, system, args.model, args.topic, args.department, variant, uniqueTimestamps[i], contextForVariant);
    });
    const emails = await Promise.all(tasks);
    return emails;
}


