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
        return `OBVIOUS PHISHING: Create believable business request with urgency. Use ${d.greetingHint} + suspicious external domain ${d.domainHint} + failing ${d.headerHint} + ${d.attachmentHint}. Make content realistic and detailed. Be authoritative - sound legitimate but with red flags.`;
    },

    [EmailVariant.SophisticatedPhishing]: (d) => {
        return `SOPHISTICATED PHISHING: Professional business communication with subtle threats. Near-legitimate domain ${d.domainHint} + mixed ${d.headerHint} + ${d.attachmentHint}. Make attachments comprehensive and specific. Act as legitimate internal colleague with authority - harder to detect.`;
    },

    [EmailVariant.CasualLegit]: (d) => {
        return `CASUAL LEGIT: Everyday business communication. Internal domain ${d.domainHint} + friendly ${d.greetingHint} + clean ${d.headerHint}. Random topics: team lunch, meeting rooms, office events, holiday schedules, system maintenance, project updates. Optional ${d.attachmentHint}. Completely normal workplace communication.`;
    },

    [EmailVariant.FormalLegit]: (d) => {
        return `FORMAL LEGIT: Corporate communication style. Company domain ${d.domainHint} + formal tone + clean ${d.headerHint}. Topics: policy updates, compliance announcements, quarterly reports, facility updates, benefits information. Optional ${d.attachmentHint}. Standard business operations.`;
    },
};

export function diversityPlan(index: number): DiversityHints {
    const plans = [
        {
            domainHint: 'invoice-systems.net, payments-center.org',
            attachmentHint: '1 quality pdf/xlsx with comprehensive details (e.g., invoice_details.pdf)',
            greetingHint: '"Dear Client", "Valued Customer"',
            headerHint: 'SPF: fail, DMARC: fail',
        },
        {
            domainHint: 'company-services.com (near miss to company.com)',
            attachmentHint: '1 detailed xlsx/pdf with specific data (e.g., contract_review.xlsx)',
            greetingHint: '"Hello", "Good morning"',
            headerHint: 'SPF: pass, DMARC: fail (mixed)',
        },
        {
            domainHint: 'facilities@company.com, operations@company.com',
            attachmentHint: '1 comprehensive pdf/jpg with realistic content (e.g., floor_plan.pdf) or none',
            greetingHint: '"Hey team", "Hi everyone"',
            headerHint: 'SPF: pass, DMARC: pass',
        },
        {
            domainHint: 'finance@company.com, legal@company.com',
            attachmentHint: '1 detailed pdf/xlsx with business data (e.g., quarterly_report.pdf)',
            greetingHint: '"Dear colleagues", "Team"',
            headerHint: 'SPF: pass, DMARC: pass',
        },
    ];

    return plans[index % plans.length];
}

// Removed topic-specific awareness - now generating topic-independent, dynamic emails

export function buildHintsFromInsights(topic: string, index: number, insights?: {
    attachmentTypes?: string[];
    mustInclude?: string[];
    domainHints?: string[];
    headerHints?: string[];
    greetings?: string[];
}): DiversityHints {
    const base = diversityPlan(index);

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


