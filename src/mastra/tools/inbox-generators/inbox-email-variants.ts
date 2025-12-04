export enum EmailVariant {
    ObviousPhishing = 'ObviousPhishing',
    SophisticatedPhishing = 'SophisticatedPhishing',
    CasualLegit = 'CasualLegit',
    FormalLegit = 'FormalLegit',
}

// Obviously fake domains for obvious phishing (red flags are clear)
const OBVIOUS_DOMAINS = [
    'billing@invoice-systems.net',
    'accounting@payments-hub.org',
    'support@update-portal.net',
    'admin@verify-account.org',
    'security@confirm-identity.net',
    'finance@process-payment.io',
    'compliance@check-status.com',
];

// Realistic-looking fake domains for sophisticated phishing (lookalike effect)
const SOPHISTICATED_DOMAINS = [
    'acme-solutions.net',
    'global-services.com',
    'corporate-group.io',
    'enterprise-hub.org',
    'business-portal.net',
    'professional-systems.com',
    'allied-services.org',
    'integrated-solutions.io',
    'premier-consulting.net',
    'universal-group.com',
];

export type DiversityHints = {
    domainHint: string;
    attachmentHint: string;
    greetingHint: string;
    headerHint: string;
    topicHint?: string;
    departmentHint?: string;  // NEW: Department context for topic-specific emails
    additionalContext?: string; // NEW: User context override
    mustInclude?: string[];
};

export const variantDeltaBuilder: Record<EmailVariant, (d: DiversityHints) => string> = {
    [EmailVariant.ObviousPhishing]: (d) => {
        const departmentContext = d.departmentHint ? `Department scenario: Someone from ${d.departmentHint} who would realistically contact recipient.` : '';
        const domainContext = `SENDER DOMAIN: Use OBVIOUSLY FAKE external domain with red flags. Candidates: ${d.domainHint}. Domains with keywords like "invoice-systems", "verify-account", "confirm-identity", "process-payment" signal phishing. Domain should be EXTERNAL, NOT official company.com.`;
        const impersonationHint = d.topicHint?.includes('executive') || d.topicHint?.includes('CEO') || d.topicHint?.includes('authority')
            ? 'SENDER pretends to BE the executive. Example: From ceo@verify-authority.net or finance@confirm-payment.io, Subject "Urgent Wire Transfer", Content "I need you to process this payment immediately - CEO". Write as if CEO is directly sending email. '
            : '';
        return `OBVIOUS PHISHING: Believable business request with CLEAR red flags. ${d.topicHint ? `Scenario: ${d.topicHint}.` : ''} ${departmentContext} ${domainContext} ${impersonationHint}Use ${d.greetingHint} + failing ${d.headerHint}. ${!impersonationHint ? 'Sender must match topic (billing@ for invoices).' : ''} Attachment: ${d.attachmentHint} matching scenario. Authoritative tone but obvious domain gives it away.`;
    },

    [EmailVariant.SophisticatedPhishing]: (d) => {
        const departmentContext = d.departmentHint ? `Department context: ${d.departmentHint}. Impersonate colleague/authority from this department who would realistically interact with recipient.` : '';
        const domainContext = `SENDER DOMAIN: Use a REALISTIC-LOOKING but FAKE corporate domain that could pass as a partner/vendor. Candidates: ${d.domainHint}. Must look legitimate and corporate, NOT obviously fake like "invoice-systems". Department matches threat type (Finance→payments, IT→tech, Security→auth, Exec→CEO).`;
        console.log('d.additionalContext', d.additionalContext);
        // TARGETED CONTEXT OVERRIDE
        const targetContext = d.additionalContext
            ? `CRITICAL TARGET CONTEXT: User Vulnerability: "${d.additionalContext}". OVERRIDE standard topic hints. You MUST construct the scenario around this specific vulnerability (e.g., if 'Spotify', make it a Spotify Premium update; if 'CEO Fraud', make it a direct CEO request).`
            : d.topicHint ? `Scenario: ${d.topicHint}.` : '';

        const impersonationHint = d.topicHint?.includes('executive') || d.topicHint?.includes('CEO') || d.topicHint?.includes('colleague') || d.topicHint?.includes('authority')
            ? 'SENDER pretends to BE a colleague/authority. Example: From sarah@acme-solutions.net, Content "Hi, this is Sarah from Marketing. Director is stuck in meeting and urgently needs the Q3 budget file. Can you send it to me ASAP? Keep this between us - time sensitive." Write as if colleague/partner is directly asking. '
            : '';
        return `SOPHISTICATED PHISHING: Professional, subtle threats. ${targetContext} ${departmentContext} ${domainContext} ${impersonationHint} Mixed ${d.headerHint} + ${d.greetingHint}. CRITICAL: Sender department matches threat type (Finance→payments, IT→tech, Security→auth, Exec→CEO). CRITICAL: Return-Path MUST match sender domain. Attachment: ${d.attachmentHint} matching email. Act as internal colleague/partner - harder to detect.`;
    },

    [EmailVariant.CasualLegit]: (d) => {
        const departmentContext = d.departmentHint ? `From ${d.departmentHint} department. Use friendly, informal tone typical of this department's internal communications.` : '';
        const domainContext = `SENDER DOMAIN: Use REAL internal domain @company.com. Examples: support@company.com, it@company.com, operations@company.com, finance@company.com, security@company.com. Domain MUST match real company domain, not external or spoofed.`;

        // Context-specific email patterns for legitimate scenarios
        const contextHint = d.topicHint?.includes('account verification') || d.topicHint?.includes('login activity')
            ? 'Legitimate IT security alert. SENDER must be IT@company.com or security@company.com. Content: Mention unusual activity detected. Crucially: Direct user to LOGIN TO INTERNAL PORTAL (NOT asking for sensitive data via form/attachment). Example: "Please log in to the security portal to review the activity." NO form attachments, NO password requests via email.'
            : d.topicHint?.includes('IT support') || d.topicHint?.includes('helpdesk')
                ? 'Legitimate IT support follow-up. SENDER must be IT@company.com or support@company.com. Show ticket number, resolution steps. NO risky attachments. Example: "Your ticket #12345 has been resolved. Log in to portal for details."'
                : d.topicHint?.includes('executive') || d.topicHint?.includes('HR policy')
                    ? 'Legitimate HR/team update. SENDER must match topic (HR@ for employee topics, operations@ for projects). NO forms requesting sensitive data.'
                    : 'Legitimate workplace communication. All requests go through official channels (portal, system), NOT via attachments or forms.';

        return `CASUAL LEGIT: Friendly internal workplace email. ${departmentContext} ${domainContext} ${contextHint} ${d.greetingHint} + clean ${d.headerHint} (both PASS). SENDER department matches topic for authenticity. KEY: For security alerts, direct to PORTAL not forms. Attachment: ${d.attachmentHint} but NO sensitive data collection forms. Topics: ${d.topicHint || 'meetings, office events, security alerts'}. CRITICAL: Never ask for passwords/IDs via email - legitimate IT uses portals.`;
    },

    [EmailVariant.FormalLegit]: (d) => {
        const departmentContext = d.departmentHint ? `From ${d.departmentHint} department leadership/authority. Use formal, professional, policy-focused tone typical of this department's official announcements.` : '';
        const domainContext = `SENDER DOMAIN: Use OFFICIAL internal domain @company.com. Examples: exec@company.com, finance@company.com, legal@company.com, hr@company.com. Domain MUST be exact company domain for authority/credibility.`;
        const contextHint = d.topicHint?.includes('executive') || d.topicHint?.includes('CEO')
            ? 'Legitimate executive announcement from actual leadership (exec@company.com). Formal corporate communication.'
            : d.topicHint?.includes('HR policy')
                ? 'Legitimate HR policy update from HR department.'
                : '';
        return `FORMAL LEGIT: Corporate communication. ${departmentContext} ${domainContext} ${contextHint} ${d.greetingHint} + clean ${d.headerHint}. Sender department automatically matches topic for authenticity. Topics: ${d.topicHint || 'policy updates, quarterly reports'}. Attachment: ${d.attachmentHint} matching topic.`;
    },
};

export function diversityPlan(index: number): DiversityHints {
    const plans = [
        {
            // Index 0: ObviousPhishing - OBVIOUS fake domains (red flags clear)
            domainHint: 'billing@invoice-systems.net, accounting@payments-hub.org, support@verify-account.net, admin@confirm-identity.net, security@process-payment.io',
            attachmentHint: '1 quality pdf/xlsx with comprehensive details (e.g., invoice_details.pdf)',
            greetingHint: 'Pick ONE: "Dear Client" OR "Valued Customer"',
            headerHint: 'SPF: fail, DMARC: fail',
        },
        {
            // Index 1: SophisticatedPhishing - REALISTIC fake domains (near-miss lookalike)
            domainHint: 'finance@acme-solutions.net, support@global-services.com, hr@corporate-group.io, operations@business-portal.net, compliance@allied-services.org',
            attachmentHint: '1 detailed xlsx/pdf with specific data (e.g., contract_review.xlsx)',
            greetingHint: 'Pick ONE: "Hello" OR "Good morning"',
            headerHint: 'SPF: pass, DMARC: fail (mixed)',
        },
        {
            // Index 2: CasualLegit - Official internal domains (DIFFERENT departments from FormalLegit)
            domainHint: 'Pick ONE: it@company.com, communications@company.com, operations@company.com, facilities@company.com, marketing@company.com',
            attachmentHint: '1 comprehensive pdf/jpg with realistic content (e.g., floor_plan.pdf) or none',
            greetingHint: 'Pick ONE: "Hey team" OR "Hi everyone"',
            headerHint: 'SPF: pass, DMARC: pass',
        },
        {
            // Index 3: FormalLegit - Official internal domains (DIFFERENT departments from CasualLegit)
            domainHint: 'Pick ONE: compliance@company.com, security@company.com, legal@company.com, finance@company.com, audit@company.com',
            attachmentHint: '1 detailed pdf/xlsx with business data (e.g., quarterly_report.pdf)',
            greetingHint: 'Pick ONE: "Dear colleagues" OR "Team"',
            headerHint: 'SPF: pass, DMARC: pass',
        },
    ];

    return plans[index % plans.length];
}

function getTopicHint(topic: string, index: number): string {
    const t = topic.toLowerCase();

    // ============================================================================
    // SOCIAL ENGINEERING ATTACKS
    // ============================================================================

    // Vishing (Voice Phishing) - Email-based calendar invite / video call exploitation
    if (t.includes('vishing') || t.includes('voice phishing') || (t.includes('phone') && (t.includes('scam') || t.includes('fraud')))) {
        const scenarios = [
            'urgent video conference call, meeting link join required',
            'bank security briefing video call, executive discussion',
            'executive all-hands video meeting, calendar invite',
            'IT support video troubleshooting, remote assistance call link',
            'payroll update video meeting, employee verification call',
            'security audit video briefing, compliance discussion call',
            'system maintenance video conference, technical discussion',
            'contractor onboarding video call, orientation meeting link'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Smishing (SMS Phishing) - Email-based SMS notification simulation / text message forwarding
    if (t.includes('smishing') || t.includes('sms phishing') || (t.includes('text') && (t.includes('scam') || t.includes('fraud')))) {
        const scenarios = [
            'SMS notification forwarded, package delivery tracking link',
            'text message alert received, account security verification link',
            'SMS text notification, prize winner claim reward link',
            'text message warning, service suspension immediate action',
            'SMS alert forwarded, bank transaction confirm payment link',
            'text notification received, utility bill payment verification',
            'SMS appointment update, reschedule appointment link',
            'text message notification, workplace approval action required'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Spear Phishing - Targeted phishing attacks
    if (t.includes('spear phishing') || (t.includes('targeted') && t.includes('phishing'))) {
        const scenarios = [
            'personalized vendor invoice, targeted payment request',
            'colleague project collaboration, specific file request',
            'partner organization communication, tailored access request',
            'industry conference invitation, personalized registration',
            'customer data review request, account-specific file',
            'team meeting notes, project-specific information',
            'client proposal submission, targeted negotiation',
            'professional networking connection, industry resource'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // BEC (Business Email Compromise) - CEO fraud
    if (t.includes('bec') || t.includes('business email compromise') || t.includes('ceo fraud')) {
        const scenarios = [
            'CEO urgent payment authorization, wire transfer required',
            'CFO vendor payment change, bank account update',
            'executive confidential acquisition, immediate action',
            'legal counsel urgent matter, payment authorization',
            'board director urgent request, investor funds transfer',
            'COO contract review, supplier payment approval',
            'financial officer travel expense, immediate reimbursement',
            'executive assistant urgent task, confidential transaction'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Whaling - C-level executive targeting
    if (t.includes('whaling') || (t.includes('executive') && t.includes('attack'))) {
        const scenarios = [
            'board meeting confidential document, executive review',
            'merger acquisition confidential, leadership decision',
            'shareholder communication urgent, executive response',
            'strategic planning confidential, C-suite approval',
            'investor relations update, portfolio review',
            'competitive analysis urgent, executive summary',
            'regulatory compliance briefing, leadership action',
            'executive compensation review, board decision'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Baiting - Physical or digital bait attacks
    if (t.includes('baiting') || (t.includes('bait') && t.includes('attack'))) {
        const scenarios = [
            'free software download offer, premium tool available',
            'conference promotional giveaway, free resource download',
            'limited time offer notification, exclusive access',
            'free trial upgrade available, premium features',
            'webinar registration freebie, bonus materials included',
            'industry report download, research summary',
            'contest entry free ticket, prize announcement',
            'certification exam prep resource, study materials'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // ============================================================================
    // QUISHING ATTACKS (QR CODE PHISHING)
    // ============================================================================

    // Quishing - QR Code based phishing attacks
    if (t.includes('quishing') || t.includes('qr code') || (t.includes('qr') && t.includes('phishing'))) {
        const scenarios = [
            'urgent payment verification QR code, invoice approval required',
            'wifi network connection QR code, guest access setup',
            'security update QR code scan, software patch verification',
            'visitor check-in QR code, registration confirmation',
            'event attendance QR code, conference badge generation',
            'delivery package QR code, shipment tracking link',
            'MFA setup QR code, authenticator app enrollment',
            'compliance certification QR code, mandatory training completion',
            'health screening QR code, vaccination record verification',
            'parking access QR code, visitor permit issuance',
            'IT support ticket QR code, helpdesk ticket status',
            'expense report QR code, reimbursement approval'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Social Engineering / Pretexting / Impersonation / Authority
    if ((t.includes('social') && t.includes('engineering')) || t.includes('impersonation') || t.includes('pretext') || t.includes('authority')) {
        const scenarios = [
            'urgent executive request, CEO immediate action needed',
            'colleague urgent assistance, team member request',
            'IT support ticket, helpdesk verification request',
            'HR policy change, employee information update',
            'vendor support urgent, technical issue resolution',
            'partner organization request, collaboration needed',
            'department head directive, policy implementation',
            'compliance officer notification, audit participation'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // ============================================================================
    // TECHNICAL ATTACKS
    // ============================================================================

    // Deepfake / Synthetic Media / Video manipulation
    if (t.includes('deepfake') || t.includes('video') || t.includes('synthetic media')) {
        const scenarios = [
            'urgent CEO announcement video, quarterly update message',
            'mandatory compliance training completion, quarterly course enrollment',
            'team meeting invitation, project kickoff video call',
            'recorded meeting review, action items and budget approval',
            'investor presentation video, financial review required',
            'customer testimonial recording, case study submission',
            'security briefing video message, urgent viewing',
            'product demo video link, feature review needed'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('phishing') || t.includes('email') || t.includes('spoofing')) {
        const scenarios = [
            'urgent account verification, access renewal required',
            'invoice payment request, vendor payment due',
            'unusual account activity detected, verification needed',
            'payment approval required, financial authorization',
            'credential reset notification, security update',
            'system access confirmation, login verification',
            'tax form submission required, employee information',
            'benefits enrollment deadline, HR submission'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Watering Hole Attacks - Compromised legitimate sites
    if (t.includes('watering hole') || (t.includes('compromised') && t.includes('website'))) {
        const scenarios = [
            'industry news update notification, sector bulletin',
            'professional association announcement, member resources',
            'partner portal maintenance notice, service update',
            'vendor system update notification, portal access',
            'regulatory body update, compliance information',
            'industry conference announcement, event details',
            'professional development resources, training portal',
            'standards organization notification, certification update'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Credential Stuffing / Account Takeover
    if (t.includes('credential stuffing') || t.includes('account takeover') || (t.includes('password') && t.includes('reuse'))) {
        const scenarios = [
            'multiple login attempts detected, security alert',
            'unusual access pattern notification, account review',
            'password breach notification, credential compromise',
            'account security upgrade, password policy update',
            'unauthorized access attempt, confirm activity',
            'suspicious login location detected, verification needed',
            'account recovery request, identity confirmation',
            'compromised credential alert, immediate password change'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('ransomware')) {
        const scenarios = [
            'urgent system maintenance, scheduled backup verification',
            'critical file access issue, IT support ticket',
            'backup restoration required, file recovery request',
            'system access configuration, permission update needed',
            'data encryption status check, security scan required',
            'infrastructure health alert, system diagnostics',
            'file storage migration notice, data transition',
            'system security update notification, mandatory installation'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('malware') || t.includes('file') || t.includes('virus')) {
        const scenarios = [
            'critical software update, system patch available',
            'system performance alert, diagnostic report attached',
            'application update package, installation required',
            'shared document review, file approval needed',
            'antivirus definition update, security patch',
            'suspicious file detection alert, scan results',
            'system cleanup notification, performance optimization',
            'quarantine alert review, threat assessment'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // MFA / Multi-Factor Authentication / 2FA - Separate branch (PRIORITY)
    if (t.includes('mfa') || t.includes('multi-factor') || t.includes('2fa') || t.includes('two-factor')) {
        const scenarios = [
            'multi-factor authentication enrollment required, setup instructions',
            'two-factor authentication activation needed, verification method',
            'MFA account security confirmation, enable protection',
            'authentication upgrade required, MFA enrollment deadline',
            'authenticator app installation, security token setup',
            'backup verification codes generated, account recovery',
            'biometric enrollment available, authentication option',
            'security key registration, hardware authentication'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Password - Separate from MFA
    if (t.includes('password') || (t.includes('authentication') && !t.includes('mfa') && !t.includes('2fa'))) {
        const scenarios = [
            'password expiration notice, credential update required',
            'account access setup, verification method enrollment',
            'unusual login activity, account verification needed',
            'policy update notification, authentication method change',
            'password strength check, credential improvement needed',
            'legacy system migration, password reset required',
            'account lockout notification, verification needed',
            'security policy compliance, password update deadline'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // ============================================================================
    // PHYSICAL SECURITY
    // ============================================================================

    // USB / Removable Media / Flash Drive
    if (t.includes('usb') || t.includes('removable media') || t.includes('flash drive') || t.includes('external drive')) {
        const scenarios = [
            'found USB drive announcement, lost and found notification',
            'conference promotional USB distribution, event giveaway',
            'external drive policy update, approved devices list',
            'file transfer guidelines, USB vs cloud storage',
            'removable media tracking update, compliance check',
            'portable device security alert, encryption notice',
            'conference giveaway collection, branded materials',
            'data transfer security briefing, approved methods'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Shoulder Surfing / Visual Hacking / Physical Privacy
    if (t.includes('shoulder surfing') || t.includes('visual hacking') || (t.includes('physical') && t.includes('privacy'))) {
        const scenarios = [
            'privacy screen distribution, equipment availability',
            'workspace security reminder, clean desk policy',
            'visitor area security guidelines, confidential workspace',
            'public space work policy, cafe security guidelines',
            'office layout adjustment, privacy zone setup',
            'confidentiality agreement reminder, workspace guidelines',
            'security camera notification, office monitoring',
            'desk organization audit, document protection'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Tailgating / Piggybacking - Physical access control
    if (t.includes('tailgating') || t.includes('piggybacking') || (t.includes('physical') && t.includes('access'))) {
        const scenarios = [
            'badge access policy reminder, security protocol',
            'visitor escort requirements, guest access rules',
            'door security guidelines, entry procedures',
            'facility access audit, badge verification',
            'secure entry verification, access control update',
            'visitor management procedure, check-in process',
            'badge renewal notification, access update required',
            'facility security drill, access protocol review'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // ============================================================================
    // NETWORK & INFRASTRUCTURE SECURITY
    // ============================================================================

    // Public Wi-Fi / Network Security
    if (t.includes('public wifi') || t.includes('wi-fi security') || t.includes('public wi-fi') || (t.includes('network') && t.includes('public'))) {
        const scenarios = [
            'guest network access policy, visitor connectivity',
            'coffee shop wifi guidelines, open network warning',
            'VPN requirement notification, remote network access',
            'network security update, connection best practices',
            'public hotspot usage advisory, security warning',
            'network encryption reminder, connection security',
            'wireless security audit, network assessment',
            'bandwidth monitoring alert, network performance'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // IoT Security / Smart Devices / Connected Devices
    if (t.includes('iot') || t.includes('smart device') || t.includes('connected device') || t.includes('internet of things')) {
        const scenarios = [
            'smart office device policy, approved equipment list',
            'printer security update, firmware patch available',
            'conference room system maintenance, device configuration',
            'network-connected device inventory, asset management',
            'smart device enrollment requirement, device registration',
            'device firmware update notification, security patch',
            'office IoT device audit, compliance verification',
            'connected equipment policy review, usage guidelines'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // API Security - Developer focused
    if (t.includes('api') && (t.includes('security') || t.includes('key'))) {
        const scenarios = [
            'API key rotation policy, credential refresh required',
            'developer security guidelines, secure coding practices',
            'third-party API review, integration security audit',
            'API access audit notification, permission review',
            'API endpoint security scan, vulnerability assessment',
            'authentication token expiration, credential renewal',
            'API rate limiting policy, usage guidelines',
            'integration security update, deployment procedure'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('remote') || t.includes('wfh') || t.includes('work from home') || t.includes('hybrid')) {
        const scenarios = [
            'remote access renewal, VPN credentials expiring',
            'home office equipment setup, IT support request',
            'network configuration update, connectivity check required',
            'hybrid work policy update, remote work guidelines',
            'remote security training reminder, compliance requirement',
            'VPN reconnection urgent, access issue resolution',
            'home network security check, home office audit',
            'remote device inventory, equipment assignment'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if ((t.includes('social') && t.includes('engineering')) || t.includes('impersonation') || t.includes('pretext') || t.includes('authority')) {
        const scenarios = [
            'urgent executive request, CEO immediate action needed',
            'colleague urgent assistance, team member request',
            'IT support ticket, helpdesk verification request',
            'HR policy change, employee information update'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // ============================================================================
    // DATA & COMPLIANCE SECURITY
    // ============================================================================

    if (t.includes('data') || t.includes('privacy') || t.includes('gdpr') || t.includes('compliance')) {
        const scenarios = [
            'policy update notification, data handling guidelines',
            'mandatory compliance training, regulatory certification',
            'confidential information sharing, document classification',
            'quarterly audit preparation, compliance documentation',
            'data classification review, sensitivity label update',
            'privacy impact assessment, policy compliance check',
            'regulatory requirement notification, deadline reminder',
            'data retention schedule, archival procedure'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Insider Threat / Internal Risk
    if (t.includes('insider threat') || t.includes('internal risk') || t.includes('employee security')) {
        const scenarios = [
            'data access audit notification, permission review',
            'suspicious activity report guidelines, incident escalation',
            'exit interview checklist, access revocation process',
            'security policy acknowledgment, annual compliance',
            'access rightsizing audit, permission cleanup',
            'unusual data access alert, activity investigation',
            'employee transition security checklist, offboarding procedure',
            'privileged access review, compliance verification'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('backup') || t.includes('recovery') || t.includes('disaster')) {
        const scenarios = [
            'scheduled maintenance verification, system backup confirmation',
            'data recovery test, business continuity drill',
            'business continuity plan update, emergency procedure review',
            'file restoration request, archived data retrieval',
            'backup retention policy, archive scheduling',
            'disaster recovery drill, failover testing',
            'backup verification report, recovery readiness check',
            'recovery point objective update, RTO review'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('cloud') || t.includes('saas')) {
        const scenarios = [
            'storage quota exceeded, upgrade required',
            'platform migration notice, application update required',
            'access permission update, configuration change needed',
            'subscription renewal reminder, service update',
            'cloud service security audit, configuration review',
            'API integration compliance, security check',
            'data residency policy update, location requirement',
            'multi-cloud strategy briefing, vendor evaluation'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('mobile') || t.includes('smartphone') || t.includes('tablet') || t.includes('app')) {
        const scenarios = [
            'new mobile app available, installation required',
            'device registration required, enrollment deadline',
            'mobile device update, system patch available',
            'device configuration required, setup instructions',
            'mobile device management enrollment, compliance requirement',
            'app security policy update, usage guidelines',
            'mobile access control change, authentication update',
            'device inventory audit, compliance verification'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('supply') || t.includes('vendor') || t.includes('third party') || t.includes('supplier')) {
        const scenarios = [
            'vendor questionnaire required, supplier assessment',
            'third-party access request, partner onboarding process',
            'supplier documentation review, vendor information update',
            'contract renewal notice, partner verification required',
            'vendor security assessment, compliance checklist',
            'third-party integration audit, security review',
            'supplier contract amendment, terms update',
            'partner access credential renewal, authentication update'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Security Protocols / Procedures / Decision Trees / Playbooks / Checklists (CHECK FIRST - more specific)
    if (t.includes('protocol') || t.includes('procedure') || t.includes('decision tree') || t.includes('playbook') || t.includes('checklist') || (t.includes('security') && (t.includes('procedure') || t.includes('protocol') || t.includes('process') || t.includes('playbook') || t.includes('checklist')))) {
        const scenarios = [
            'security protocol compliance review, policy verification',
            'remote work procedures update, guidelines implementation',
            'incident response playbook training, procedure implementation',
            'security checklist completion reminder, compliance verification',
            'access control review, permission audit required',
            'security procedures assessment, compliance report',
            'protocol violation notice, corrective action needed',
            'procedure update acknowledgment, training completion required'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('incident') || t.includes('breach') || t.includes('security event') || t.includes('alert')) {
        const scenarios = [
            'urgent system notification, immediate attention required',
            'system event response, investigation underway',
            'incident report required, documentation needed',
            'critical alert notification, advisory update',
            'security incident escalation, urgent action needed',
            'breach notification alert, affected user notification',
            'incident timeline verification, evidence collection',
            'post-incident review, lessons learned analysis'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('encryption') || t.includes('certificate') || t.includes('ssl') || t.includes('tls')) {
        const scenarios = [
            'certificate expiration notice, renewal required',
            'system credential update, key management change',
            'certificate installation required, configuration update',
            'secure connection setup, communication configuration',
            'encryption key rotation policy, security update',
            'end-to-end encryption deployment, implementation procedure',
            'data encryption audit, encryption status check',
            'cryptographic algorithm update, security standard'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('byod') || t.includes('bring your own')) {
        const scenarios = [
            'device enrollment deadline, registration required',
            'personal device policy update, usage guidelines',
            'approved device list, compatibility requirements',
            'device requirements update, compliance check needed',
            'personal device security audit, compliance verification',
            'BYOD policy refresh, terms and conditions update',
            'device wipe procedure notification, mobile device management',
            'personal device insurance option, coverage details'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    // Intelligent multi-tier fallback with rotation
    if (t.includes('security') || t.includes('cyber') || t.includes('threat')) {
        const scenarios = [
            'mandatory awareness training, annual course enrollment',
            'policy compliance update, guideline changes',
            'best practices bulletin, procedural update',
            'important update notification, policy bulletin',
            'security advisory alert, threat notification',
            'vulnerability disclosure update, mitigation steps',
            'security posture assessment, risk evaluation',
            'threat landscape briefing, industry update'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('awareness') || t.includes('training') || t.includes('education')) {
        const scenarios = [
            'employee training session, enrollment deadline',
            'quarterly awareness campaign, participation required',
            'educational resources available, training materials',
            'course completion deadline, certification reminder',
            'security simulation exercise, phishing drill',
            'workshop registration open, skill development',
            'online course module available, self-paced learning',
            'certification exam scheduling, testing window'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    if (t.includes('information') || t.includes('infosec')) {
        const scenarios = [
            'information policy update, procedural changes',
            'data handling guidelines, operational standards',
            'access control update, permission changes',
            'procedural update, operational guidelines',
            'information classification reminder, sensitivity levels',
            'document retention policy, archival schedule',
            'classification review notification, labeling update',
            'information security baseline, standards compliance'
        ];
        return scenarios[(index * 7) % scenarios.length];
    }

    const genericScenarios = [
        'business update, quarterly announcement',
        'project coordination, team collaboration',
        'policy change, operational update',
        'system maintenance, scheduled downtime',
        'department meeting notification, team gathering',
        'resource request approval, procurement process',
        'schedule change notification, calendar update',
        'general administration notice, informational update'
    ];
    return genericScenarios[(index * 7) % genericScenarios.length];
}

// ============================================================================
// DOMAIN SELECTION FOR ALL EMAIL VARIANTS
// Maps topic context to appropriate internal department for sender authenticity
//
// NOTE: Domain selection now AI-generated via variantDeltaBuilder prompts
// These functions kept as BACKUP reference - not currently used
// ============================================================================

/**
 * BACKUP: Converts phishing domain to legitimate domain
 * company-services.com → company.com
 * Used for legitimate email variants (CasualLegit, FormalLegit)
 *
 * Kept for reference - domain selection now handled by AI in prompts
 */
/*
function convertToLegitimateDomaın(domain: string): string {
    return domain.replace('company-services.com', 'company.com')
                .replace('company-services', 'company')
                .replace('-services', '');
}
*/

/**
 * BACKUP: Legacy domain selection based on topic
 *
 * Kept for reference only - now using AI-generated domains via prompts
 * each variant (ObviousPhishing, SophisticatedPhishing, CasualLegit, FormalLegit)
 * includes domain instruction for AI to generate realistic, contextual domains
 */
/*
function getDomainForTopic(topicHint: string | undefined, defaultDomain: string, isLegitimate: boolean = false): string {
    if (!topicHint) return defaultDomain;
    const t = topicHint.toLowerCase();

    let domain: string;

    // Financial/Payment attacks → Finance department
    if (t.includes('payment') || t.includes('invoice') || t.includes('vendor') || t.includes('financial') || t.includes('purchase')) {
        domain = 'finance@company-services.com';
    }
    // Executive/CEO attacks → Executive department
    else if (t.includes('ceo') || t.includes('executive') || t.includes('c-suite') || t.includes('whaling') || t.includes('bec') || t.includes('business email compromise') || t.includes('authority')) {
        domain = 'exec@company-services.com';
    }
    // Technical/Infrastructure attacks → IT department
    else if (t.includes('ransomware') || t.includes('malware') || t.includes('backup') || t.includes('recovery') || t.includes('file') || t.includes('virus') || t.includes('patch') ||
        t.includes('cloud') || t.includes('saas') || t.includes('api') || t.includes('remote') || t.includes('vpn') || t.includes('wfh') || t.includes('work from home') ||
        t.includes('device') || t.includes('mobile') || t.includes('iot') || t.includes('network')) {
        domain = 'IT@company-services.com';
    }
    // Security/Authentication attacks → Security department
    else if (t.includes('password') || t.includes('mfa') || t.includes('authentication') || t.includes('2fa') || t.includes('credential') ||
        t.includes('phishing') || t.includes('email') || t.includes('spoofing') || t.includes('vishing') || t.includes('smishing') ||
        t.includes('social engineering') || t.includes('impersonation') || t.includes('pretext') || t.includes('account takeover')) {
        domain = 'security@company-services.com';
    }
    // Deepfake/Video content → Executive/Communications department
    else if (t.includes('deepfake') || t.includes('video') || t.includes('synthetic media') || t.includes('recording')) {
        domain = 'exec@company-services.com';
    }
    // Compliance/Data → Compliance department
    else if (t.includes('compliance') || t.includes('data') || t.includes('privacy') || t.includes('gdpr')) {
        domain = 'compliance@company-services.com';
    }
    // HR/Policy attacks → HR department
    else if (t.includes('hr') || t.includes('human resources') || t.includes('employee') || t.includes('policy')) {
        domain = 'hr@company-services.com';
    }
    // Default fallback
    else {
        domain = defaultDomain;
    }

    // Convert to legitimate domain if needed (for CasualLegit, FormalLegit variants)
    return isLegitimate ? convertToLegitimateDomaın(domain) : domain;
}
*/
export function buildHintsFromInsights(topic: string, index: number, department?: string, additionalContext?: string, insights?: {
    attachmentTypes?: string[];
    mustInclude?: string[];
    domainHints?: string[];
    headerHints?: string[];
    greetings?: string[];
}): DiversityHints {
    const base = diversityPlan(index);
    const topicHint = getTopicHint(topic, index);
    const departmentHint = department || undefined;  // NEW: Pass department context

    if (!insights) return { ...base, topicHint, departmentHint, additionalContext };

    const pick = <T>(arr?: T[], fallback?: T): T | undefined => (arr && arr.length ? arr[index % arr.length] : fallback);

    return {
        ...base,
        attachmentHint: String(pick(insights.attachmentTypes, base.attachmentHint) || base.attachmentHint),
        domainHint: String(pick(insights.domainHints, base.domainHint) || base.domainHint),
        headerHint: String(pick(insights.headerHints, base.headerHint) || base.headerHint),
        greetingHint: String(pick(insights.greetings, base.greetingHint) || base.greetingHint),
        mustInclude: insights.mustInclude && insights.mustInclude.length ? insights.mustInclude : base.mustInclude,
        topicHint,
        departmentHint,  // NEW: Include department hint
        additionalContext, // NEW: Include context
    };
}

