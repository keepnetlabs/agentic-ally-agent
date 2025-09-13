export enum EmailVariant {
    ObviousPhishing = 'ObviousPhishing',
    SophisticatedPhishing = 'SophisticatedPhishing',
    CasualLegit = 'CasualLegit',
    FormalLegit = 'FormalLegit',
}

export type DiversityHints = {
    domainHint: string;
    attachmentHint: string;
    greetingHint: string;
    headerHint: string;
    topicHint?: string;
    mustInclude?: string[];
};

export const variantDeltaBuilder: Record<EmailVariant, (d: DiversityHints) => string> = {
    [EmailVariant.ObviousPhishing]: (d) => {
        const topicLine = d.topicHint ? `\n- Topic context: ${d.topicHint}` : '';
        const mustLine = d.mustInclude && d.mustInclude.length ? `\n- Ensure to include: ${d.mustInclude.join(', ')}` : '';
        return `
TYPE: Obvious phishing (isPhishing: true).
- Urgent time pressure and generic greeting (${d.greetingHint})
- Suspicious external/look-alike domains (${d.domainHint})
- Headers show clear failures (${d.headerHint})
- Pushy call-to-action; prefer risky attachment (${d.attachmentHint}). Attachment content must be multi-line and topic-aligned (e.g., doc/xlsx table or steps).
- Email HTML: at least 2 paragraphs + a small details list (ul/li). Vary greeting and sign-off.
- Do NOT label the email as suspicious in text${topicLine}${mustLine}
`;
    },

    [EmailVariant.SophisticatedPhishing]: (d) => {
        const topicLine = d.topicHint ? `\n- Topic context: ${d.topicHint}` : '';
        const mustLine = d.mustInclude && d.mustInclude.length ? `\n- Ensure to include: ${d.mustInclude.join(', ')}` : '';
        return `
TYPE: Sophisticated phishing (isPhishing: true).
- Professional tone with subtle red flags
- Almost-correct domain (${d.domainHint}); mixed headers (${d.headerHint})
- Gentle, gradual ask; realistic but risky attachment (${d.attachmentHint}) with structured multi-line HTML (e.g., agenda slots, review notes).${topicLine}${mustLine}
`;
    },

    [EmailVariant.CasualLegit]: (d) => {
        const topicLine = d.topicHint ? `\n- Topic context: ${d.topicHint}` : '';
        const mustLine = d.mustInclude && d.mustInclude.length ? `\n- Ensure to include: ${d.mustInclude.join(', ')}` : '';
        return `
TYPE: Legitimate casual (isPhishing: false).
- Internal domain (${d.domainHint}); personal greeting (${d.greetingHint})
- Conversational tone; clean headers (${d.headerHint})
- Optional benign attachment (${d.attachmentHint}). Attachment preview must be topic-relevant and multi-line (e.g., short receipt, image caption).${topicLine}${mustLine}
`;
    },

    [EmailVariant.FormalLegit]: (d) => {
        const topicLine = d.topicHint ? `\n- Topic context: ${d.topicHint}` : '';
        const mustLine = d.mustInclude && d.mustInclude.length ? `\n- Ensure to include: ${d.mustInclude.join(', ')}` : '';
        return `
TYPE: Legitimate formal (HR/compliance) (isPhishing: false).
- Corporate professional tone; internal domain (${d.domainHint})
- Structured business content; clean headers (${d.headerHint})
- Optional benign attachment (${d.attachmentHint}) with structured multi-line HTML (e.g., policy PDF summary: sections and effective date).${topicLine}${mustLine}
`;
    },
};

export function diversityPlan(index: number): DiversityHints {
    const plans = [
        {
            domainHint: 'security-center.net, account-help.org',
            attachmentHint: 'zip/doc/xlsx (e.g., reset_form.docx)',
            greetingHint: '"Dear User", "Account Holder"',
            headerHint: 'SPF: fail, DMARC: fail',
        },
        {
            domainHint: 'company-security.com (near miss to company.com)',
            attachmentHint: 'xlsx/doc (e.g., quarterly_review.xlsx)',
            greetingHint: '"Hi there", "Valued employee"',
            headerHint: 'SPF: pass, DMARC: fail (mixed)',
        },
        {
            domainHint: 'manager@company.com, team@company.com',
            attachmentHint: 'jpg/png (e.g., team_photo.jpg) or none',
            greetingHint: '"Hey team", "Hi everyone"',
            headerHint: 'SPF: pass, DMARC: pass',
        },
        {
            domainHint: 'hr@company.com, compliance@company.com',
            attachmentHint: 'pdf (e.g., updated_policy.pdf)',
            greetingHint: '"Dear all", formal salutation',
            headerHint: 'SPF: pass, DMARC: pass',
        },
    ];

    return plans[index % plans.length];
}

function applyTopicAwareness(topic: string, base: DiversityHints): DiversityHints {
    // Default: pass-through base without static heuristics
    return { ...base };
}

export function buildHintsFromInsights(topic: string, index: number, insights?: {
    attachmentTypes?: string[];
    mustInclude?: string[];
    domainHints?: string[];
    headerHints?: string[];
    greetings?: string[];
}): DiversityHints {
    const base = applyTopicAwareness(topic, diversityPlan(index));

    if (!insights) return base;

    const pick = <T>(arr?: T[], fallback?: T): T | undefined => (arr && arr.length ? arr[index % arr.length] : fallback);

    return {
        ...base,
        attachmentHint: String(pick(insights.attachmentTypes, base.attachmentHint) || base.attachmentHint),
        domainHint: String(pick(insights.domainHints, base.domainHint) || base.domainHint),
        headerHint: String(pick(insights.headerHints, base.headerHint) || base.headerHint),
        greetingHint: String(pick(insights.greetings, base.greetingHint) || base.greetingHint),
        mustInclude: insights.mustInclude && insights.mustInclude.length ? insights.mustInclude : base.mustInclude,
    };
}


