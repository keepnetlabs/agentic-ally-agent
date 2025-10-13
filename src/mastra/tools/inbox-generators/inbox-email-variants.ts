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
        const impersonationHint = d.topicHint?.includes('executive') || d.topicHint?.includes('CEO') || d.topicHint?.includes('authority')
            ? 'SENDER pretends to BE the executive. Example: From ceo@executive-portal.net, Subject "Urgent Wire Transfer", Content "I need you to process this payment immediately - CEO". Write as if CEO is directly sending email. '
            : '';
        return `OBVIOUS PHISHING: Believable business request with urgency. ${d.topicHint ? `Scenario: ${d.topicHint}.` : ''} ${impersonationHint}Use ${d.greetingHint} + external domain ${d.domainHint} + failing ${d.headerHint}. ${!impersonationHint ? 'Sender must match topic (billing@ for invoices).' : ''} Attachment: ${d.attachmentHint} matching scenario. Authoritative tone with red flags.`;
    },

    [EmailVariant.SophisticatedPhishing]: (d) => {
        const impersonationHint = d.topicHint?.includes('executive') || d.topicHint?.includes('CEO') || d.topicHint?.includes('colleague') || d.topicHint?.includes('authority')
            ? 'SENDER pretends to BE a colleague/authority. Example: From sarah@company-services.com, Content "Hi, this is Sarah from Marketing. Director is stuck in meeting and urgently needs the Q3 budget file. Can you send it to me ASAP? Keep this between us - time sensitive." Write as if colleague is directly asking. '
            : '';
        return `SOPHISTICATED PHISHING: Professional, subtle threats. ${d.topicHint ? `Scenario: ${d.topicHint}.` : ''} ${impersonationHint} Near-legit domain ${d.domainHint} + mixed ${d.headerHint} + ${d.greetingHint}. MAY mismatch department-topic. Attachment: ${d.attachmentHint} matching email. Act as internal colleague - harder to detect.`;
    },

    [EmailVariant.CasualLegit]: (d) => {
        const contextHint = d.topicHint?.includes('IT support') || d.topicHint?.includes('helpdesk')
            ? 'Legitimate IT support follow-up. SENDER must be IT@company.com or support@company.com. Show ticket number, resolution steps. Example: From support@company.com, Subject "Ticket #12345 Resolved".'
            : d.topicHint?.includes('executive') || d.topicHint?.includes('HR policy')
            ? 'Legitimate HR/team update. SENDER must match topic (HR@ for employee topics, operations@ for projects).'
            : '';
        return `CASUAL LEGIT: Normal workplace email. ${contextHint} Internal ${d.domainHint} + ${d.greetingHint} + clean ${d.headerHint}. SENDER department must match email topic. Topics: ${d.topicHint || 'meetings, office events, schedules'}. Attachment: ${d.attachmentHint} matching scenario.`;
    },

    [EmailVariant.FormalLegit]: (d) => {
        const contextHint = d.topicHint?.includes('executive') || d.topicHint?.includes('CEO')
            ? 'Legitimate executive announcement from actual leadership (exec@company.com). Formal corporate communication.'
            : d.topicHint?.includes('HR policy')
            ? 'Legitimate HR policy update from HR department.'
            : '';
        return `FORMAL LEGIT: Corporate communication. ${contextHint} Company ${d.domainHint} + ${d.greetingHint} + clean ${d.headerHint}. Sender matches content. Topics: ${d.topicHint || 'policy updates, quarterly reports'}. Attachment: ${d.attachmentHint} matching topic.`;
    },
};

export function diversityPlan(index: number): DiversityHints {
    const plans = [
        {
            domainHint: 'billing@invoice-systems.net, accounts@payments-center.org',
            attachmentHint: '1 quality pdf/xlsx with comprehensive details (e.g., invoice_details.pdf)',
            greetingHint: 'Pick ONE: "Dear Client" OR "Valued Customer"',
            headerHint: 'SPF: fail, DMARC: fail',
        },
        {
            domainHint: 'hr@company-services.com, training@company-services.com, compliance@company-services.com (near miss to company.com)',
            attachmentHint: '1 detailed xlsx/pdf with specific data (e.g., contract_review.xlsx)',
            greetingHint: 'Pick ONE: "Hello" OR "Good morning"',
            headerHint: 'SPF: pass, DMARC: fail (mixed)',
        },
        {
            domainHint: 'facilities@company.com, operations@company.com, projects@company.com',
            attachmentHint: '1 comprehensive pdf/jpg with realistic content (e.g., floor_plan.pdf) or none',
            greetingHint: 'Pick ONE: "Hey team" OR "Hi everyone"',
            headerHint: 'SPF: pass, DMARC: pass',
        },
        {
            domainHint: 'finance@company.com, legal@company.com, exec@company.com',
            attachmentHint: '1 detailed pdf/xlsx with business data (e.g., quarterly_report.pdf)',
            greetingHint: 'Pick ONE: "Dear colleagues" OR "Team"',
            headerHint: 'SPF: pass, DMARC: pass',
        },
    ];

    return plans[index % plans.length];
}

function getTopicHint(topic: string, index: number): string {
    const t = topic.toLowerCase();

    // Index-based scenario rotation for diversity - each email gets different scenario
    if (t.includes('deepfake') || t.includes('video') || t.includes('synthetic media')) {
        const scenarios = [
            'urgent CEO announcement video, quarterly update message',
            'mandatory compliance training completion, quarterly course enrollment',
            'team meeting invitation, project kickoff video call',
            'recorded meeting review, action items and budget approval'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('phishing') || t.includes('email') || t.includes('spoofing')) {
        const scenarios = [
            'urgent account verification, access renewal required',
            'invoice payment request, vendor payment due',
            'unusual account activity detected, verification needed',
            'payment approval required, financial authorization'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('ransomware')) {
        const scenarios = [
            'urgent system maintenance, scheduled backup verification',
            'critical file access issue, IT support ticket',
            'backup restoration required, file recovery request',
            'system access configuration, permission update needed'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('malware') || t.includes('file') || t.includes('virus')) {
        const scenarios = [
            'critical software update, system patch available',
            'system performance alert, diagnostic report attached',
            'application update package, installation required',
            'shared document review, file approval needed'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('password') || t.includes('mfa') || t.includes('authentication') || t.includes('2fa')) {
        const scenarios = [
            'password expiration notice, credential update required',
            'account access setup, verification method enrollment',
            'unusual login activity, account verification needed',
            'policy update notification, authentication method change'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('remote') || t.includes('wfh') || t.includes('work from home') || t.includes('hybrid')) {
        const scenarios = [
            'remote access renewal, VPN credentials expiring',
            'home office equipment setup, IT support request',
            'network configuration update, connectivity check required',
            'hybrid work policy update, remote work guidelines'
        ];
        return scenarios[index % scenarios.length];
    }

    if ((t.includes('social') && t.includes('engineering')) || t.includes('impersonation') || t.includes('authority')) {
        const scenarios = [
            'urgent executive request, CEO immediate action needed',
            'colleague urgent assistance, team member request',
            'IT support ticket, helpdesk verification request',
            'HR policy change, employee information update'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('data') || t.includes('privacy') || t.includes('gdpr') || t.includes('compliance')) {
        const scenarios = [
            'policy update notification, data handling guidelines',
            'mandatory compliance training, regulatory certification',
            'confidential information sharing, document classification',
            'quarterly audit preparation, compliance documentation'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('backup') || t.includes('recovery') || t.includes('disaster')) {
        const scenarios = [
            'scheduled maintenance verification, system backup confirmation',
            'data recovery test, business continuity drill',
            'business continuity plan update, emergency procedure review',
            'file restoration request, archived data retrieval'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('cloud') || t.includes('saas')) {
        const scenarios = [
            'storage quota exceeded, upgrade required',
            'platform migration notice, application update required',
            'access permission update, configuration change needed',
            'subscription renewal reminder, service update'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('mobile') || t.includes('smartphone') || t.includes('tablet') || t.includes('app')) {
        const scenarios = [
            'new mobile app available, installation required',
            'device registration required, enrollment deadline',
            'mobile device update, system patch available',
            'device configuration required, setup instructions'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('supply') || t.includes('vendor') || t.includes('third party') || t.includes('supplier')) {
        const scenarios = [
            'vendor questionnaire required, supplier assessment',
            'third-party access request, partner onboarding process',
            'supplier documentation review, vendor information update',
            'contract renewal notice, partner verification required'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('incident') || t.includes('breach') || t.includes('security event') || t.includes('alert')) {
        const scenarios = [
            'urgent system notification, immediate attention required',
            'system event response, investigation underway',
            'incident report required, documentation needed',
            'critical alert notification, advisory update'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('encryption') || t.includes('certificate') || t.includes('ssl') || t.includes('tls')) {
        const scenarios = [
            'certificate expiration notice, renewal required',
            'system credential update, key management change',
            'certificate installation required, configuration update',
            'secure connection setup, communication configuration'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('byod') || t.includes('bring your own')) {
        const scenarios = [
            'device enrollment deadline, registration required',
            'personal device policy update, usage guidelines',
            'approved device list, compatibility requirements',
            'device requirements update, compliance check needed'
        ];
        return scenarios[index % scenarios.length];
    }

    // Intelligent multi-tier fallback with rotation
    if (t.includes('security') || t.includes('cyber') || t.includes('threat')) {
        const scenarios = [
            'mandatory awareness training, annual course enrollment',
            'policy compliance update, guideline changes',
            'best practices bulletin, procedural update',
            'important update notification, policy bulletin'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('awareness') || t.includes('training') || t.includes('education')) {
        const scenarios = [
            'employee training session, enrollment deadline',
            'quarterly awareness campaign, participation required',
            'educational resources available, training materials',
            'course completion deadline, certification reminder'
        ];
        return scenarios[index % scenarios.length];
    }

    if (t.includes('information') || t.includes('infosec')) {
        const scenarios = [
            'information policy update, procedural changes',
            'data handling guidelines, operational standards',
            'access control update, permission changes',
            'procedural update, operational guidelines'
        ];
        return scenarios[index % scenarios.length];
    }

    const genericScenarios = [
        'business update, quarterly announcement',
        'project coordination, team collaboration',
        'policy change, operational update',
        'system maintenance, scheduled downtime'
    ];
    return genericScenarios[index % genericScenarios.length];
}

export function buildHintsFromInsights(topic: string, index: number, insights?: {
    attachmentTypes?: string[];
    mustInclude?: string[];
    domainHints?: string[];
    headerHints?: string[];
    greetings?: string[];
}): DiversityHints {
    const base = diversityPlan(index);
    const topicHint = getTopicHint(topic, index);

    if (!insights) return { ...base, topicHint };

    const pick = <T>(arr?: T[], fallback?: T): T | undefined => (arr && arr.length ? arr[index % arr.length] : fallback);

    return {
        ...base,
        attachmentHint: String(pick(insights.attachmentTypes, base.attachmentHint) || base.attachmentHint),
        domainHint: String(pick(insights.domainHints, base.domainHint) || base.domainHint),
        headerHint: String(pick(insights.headerHints, base.headerHint) || base.headerHint),
        greetingHint: String(pick(insights.greetings, base.greetingHint) || base.greetingHint),
        mustInclude: insights.mustInclude && insights.mustInclude.length ? insights.mustInclude : base.mustInclude,
        topicHint,
    };
}


