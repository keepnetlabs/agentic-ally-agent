import { generateText } from 'ai';
import { buildInboxEmailBaseSystem } from './inbox-email-base';
import { EmailVariant, variantDeltaBuilder, buildHintsFromInsights } from './inbox-email-variants';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';

type OrchestratorArgs = {
    topic: string;
    languageCode: string;
    category: string;
    riskArea: string;
    level: string;
    department: string;  // NEW: Department context for topic-specific emails
    model: any;
};

const VARIANTS: EmailVariant[] = [
    EmailVariant.ObviousPhishing,
    EmailVariant.SophisticatedPhishing,
    EmailVariant.CasualLegit,
    EmailVariant.FormalLegit,
];

async function generateOneEmail(
    index: number,
    systemPrompt: string,
    model: any,
    topic: string,
    department: string,
    variant: EmailVariant
): Promise<any> {
    const timestampOptions = ['30 minutes ago', '2 hours ago', 'This morning', 'Yesterday'];
    const timestampInstruction = `CRITICAL: Use timestamp "${timestampOptions[index % timestampOptions.length]}" for this email.`;
    // Department context now baked into variantDeltaBuilder via buildHintsFromInsights
    const delta = variantDeltaBuilder[variant](buildHintsFromInsights(topic, index, department, undefined)) + ` ${timestampInstruction}`;

    try {
        const res = await generateText({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: delta },
            ],
        });

        const cleaned = cleanResponse(res.text, `inbox-email-${index + 1}`);
        const parsed = JSON.parse(cleaned);
        parsed.id = String(index + 1);
        return parsed;
    } catch (err) {
        // minimal per-variant retry once
        const res2 = await generateText({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: delta + '\nIf previous output was not valid JSON, fix and resend as a single JSON object.' },
            ],
        });
        const cleaned2 = cleanResponse(res2.text, `inbox-email-retry-${index + 1}`);
        const parsed2 = JSON.parse(cleaned2);
        parsed2.id = String(index + 1);
        return parsed2;
    }
}

export async function generateInboxEmailsParallel(args: OrchestratorArgs): Promise<any[]> {
    const system = buildInboxEmailBaseSystem(
        args.topic,
        args.languageCode,
        args.category,
        args.riskArea,
        args.level
    );

    const variantPlan: EmailVariant[] = [
        EmailVariant.ObviousPhishing,
        EmailVariant.SophisticatedPhishing,
        EmailVariant.CasualLegit,
        EmailVariant.FormalLegit,
    ];

    console.log(`📧 Generating emails for topic="${args.topic}", department="${args.department}"`);

    const tasks = variantPlan.map((variant, i) => generateOneEmail(i, system, args.model, args.topic, args.department, variant));
    const emails = await Promise.all(tasks);
    return emails;
}


