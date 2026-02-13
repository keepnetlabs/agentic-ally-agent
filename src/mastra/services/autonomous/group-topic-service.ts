/**
 * Group Training Topic Selector Service
 * Selects ONE topic for group phishing & training, returns prompts + metadata
 */

import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../error-service';
import { getLogger } from '../../utils/core/logger';

export interface GroupTopicSelection {
    topic: string;
    phishingPrompt: string;
    smishingPrompt: string;
    trainingPrompt: string;
    objectives: string[];
    scenarios: string[];
}

/**
 * Select ONE cybersecurity topic for group training
 * Returns topic + ready-to-use prompts for phishing & training
 */
export async function selectGroupTrainingTopic(
    _preferredLanguage: string | undefined
): Promise<GroupTopicSelection> {
    const logger = getLogger('GroupTopicService');

    // STEP 1: Select topic
    logger.info('Selecting unified topic for group training');
    const selectedTopic = await selectTopic();
    logger.info('✅ Selected topic', { topic: selectedTopic });

    // STEP 2: Build prompts for phishing & training
    const phishingPrompt = buildPhishingPrompt(selectedTopic);
    const smishingPrompt = buildSmishingPrompt(selectedTopic);
    const trainingPrompt = buildTrainingPrompt(selectedTopic);

    // STEP 3: Build objectives & scenarios for this topic
    const { objectives, scenarios } = getTopicMetadata(selectedTopic);

    return {
        topic: selectedTopic,
        phishingPrompt,
        smishingPrompt,
        trainingPrompt,
        objectives,
        scenarios
    };
}

/**
 * Select ONE topic - returns just the topic name
 * AI can pick from suggestions OR create its own meaningful topic
 */
async function selectTopic(): Promise<string> {
    const topicSelectionPrompt = `You are a Cybersecurity Training Specialist selecting ONE cybersecurity topic for group-wide training.

Your task: SELECT a SINGLE meaningful cybersecurity topic that will work for BOTH phishing simulation AND training content.

You have two options:

OPTION 1 - SUGGESTED TOPICS (use if they fit your needs):
- Phishing & Email Security
- Password & Authentication
- Social Engineering Defense
- Malware & Ransomware Prevention
- Cloud Security Basics
- Credential Harvesting & Verification
- Business Email Compromise (BEC)
- Supply Chain Attack Awareness
- API & Data Breach Prevention
- Insider Threat Recognition
- Zero-Day & Critical Vulnerabilities
- Mobile & Device Security
- Data Protection & Privacy Compliance
- Incident Response Fundamentals
- Secure Communication Practices
- Access Control & Least Privilege
- Third-Party Risk Management

OPTION 2 - CREATE YOUR OWN (if you have a better idea):
Feel free to select ANY meaningful cybersecurity or information security topic that would be valuable for organizational awareness training. Be creative! Examples could include:
- Biometric Security & Authentication
- Cryptocurrency & Blockchain Security
- IoT Security Risks
- Industrial Control Systems Security
- Quantum Computing & Future Cryptography
- Privacy by Design
- Security Metrics & Risk Assessment
- Secure Software Development Lifecycle (SSDLC)
- Or any other cybersecurity topic you think is important!

Response format: ONLY the topic name, nothing else.
Examples: "Phishing & Email Security" OR "AI-Powered Attack Detection" OR "Blockchain Security Fundamentals"`;

    try {
        const model = getModelWithOverride();
        const response = await generateText({
            model,
            messages: [
                { role: 'user', content: topicSelectionPrompt }
            ]
        });

        const selectedTopic = response.text.trim();
        const logger = getLogger('GroupTopicService');
        logger.info('✅ Topic selected by AI', { topic: selectedTopic });
        return selectedTopic;
    } catch (error) {
        const err = normalizeError(error);
        const logger = getLogger('GroupTopicService');
        const errorInfo = errorService.aiModel(err.message, {
            step: 'group-topic-selection',
            stack: err.stack,
        });
        logErrorInfo(logger, 'warn', 'Topic selection failed, using default', errorInfo);
        return 'Phishing & Email Security';
    }
}

/**
 * Build phishing prompt for selected topic
 */
function buildPhishingPrompt(selectedTopic: string): string {
    return `You are a Cybersecurity Awareness Training Specialist creating a phishing simulation for GROUP-LEVEL training.

🎯 YOUR TASK:
1. CREATE a realistic, convincing phishing scenario FOCUSED ON THIS TOPIC: "${selectedTopic}"
2. Make it educational and appropriate for group-wide training (not personalized)
3. The training module will cover the same topic for awareness building

📝 Remember: This phishing scenario should align with the training content on "${selectedTopic}" so learners understand both the attack vector AND the defense strategies.

🎲 IMPORTANT: Generate a DIFFERENT scenario each time. Make it diverse and realistic.

🏢 Generate the scenario as if targeting a GENERIC ORGANIZATION GROUP - no specific person names.`;
}

/**
 * Build smishing prompt for selected topic
 */
function buildSmishingPrompt(selectedTopic: string): string {
    return `You are a Cybersecurity Awareness Training Specialist creating a smishing simulation for GROUP-LEVEL training.

🎯 YOUR TASK:
1. CREATE realistic SMS-based phishing messages FOCUSED ON THIS TOPIC: "${selectedTopic}"
2. Keep messages concise and believable for mobile context
3. Include a landing-page-style follow-up context when relevant
4. Make it educational and appropriate for group-wide training (not personalized)

📝 Remember: This smishing scenario should align with the training content on "${selectedTopic}" so learners understand both the attack vector AND the defense strategies.

🎲 IMPORTANT: Generate a DIFFERENT scenario each time. Make it diverse and realistic.

🏢 Generate the scenario as if targeting a GENERIC ORGANIZATION GROUP - no specific person names.`;
}

/**
 * Build training prompt for selected topic
 */
function buildTrainingPrompt(selectedTopic: string): string {
    return `You are a Cybersecurity Training Content Specialist creating training modules for GROUP-LEVEL organizational awareness.

🎯 YOUR TASK:
Create educational training content on THIS TOPIC: "${selectedTopic}"
- Focus on practical awareness and best practices
- Appropriate for generic organizational audience
- Align with the phishing scenario (same topic) so learners understand both attack vectors AND defenses

📚 COVERAGE:
- Key concepts and threats in ${selectedTopic}
- Practical prevention and response strategies
- Real-world examples and case studies
- Best practices and security hygiene

🏢 Generic audience - no specific roles or departments.`;
}

/**
 * Get objectives & scenarios for topic (metadata)
 */
function getTopicMetadata(topic: string): { objectives: string[]; scenarios: string[] } {
    const topicMetadata: Record<string, { objectives: string[]; scenarios: string[] }> = {
        'Phishing & Email Security': {
            objectives: [
                'Identify phishing emails and suspicious links',
                'Understand common phishing tactics and social engineering',
                'Learn safe email practices and verification methods'
            ],
            scenarios: [
                'Email with urgent action request from fake executive',
                'Malicious link disguised as company portal',
                'Attachment containing malware disguised as invoice'
            ]
        },
        'Password & Authentication': {
            objectives: [
                'Create and manage strong passwords',
                'Understand multi-factor authentication (MFA)',
                'Recognize password compromise and phishing attacks'
            ],
            scenarios: [
                'Fake login page requesting credentials',
                'Password reset email from unknown source',
                'Shared credentials via unsecured channel'
            ]
        },
        'Social Engineering Defense': {
            objectives: [
                'Recognize social engineering manipulation tactics',
                'Understand psychological manipulation in attacks',
                'Implement defensive communication practices'
            ],
            scenarios: [
                'Attacker posing as IT support requesting access',
                'Caller claiming to be from corporate finance',
                'Tailgating/physical access request'
            ]
        },
        'Malware & Ransomware Prevention': {
            objectives: [
                'Identify malware and ransomware threats',
                'Understand infection vectors and prevention',
                'Learn recovery and response procedures'
            ],
            scenarios: [
                'Suspicious file download prompt',
                'Email with macro-enabled document attachment',
                'Pop-up warning about system infection'
            ]
        },
        'Cloud Security Basics': {
            objectives: [
                'Understand cloud security shared responsibility',
                'Learn cloud access control and encryption',
                'Recognize cloud-specific threats'
            ],
            scenarios: [
                'Unauthorized cloud storage access attempt',
                'Misconfigured cloud bucket exposure notification',
                'Cloud credential leak via misconfigured app'
            ]
        },
        'Credential Harvesting & Verification': {
            objectives: [
                'Understand credential harvesting attack methods',
                'Learn to verify legitimate credential requests',
                'Implement secure credential handling practices'
            ],
            scenarios: [
                'Fake support ticket requesting credentials',
                'Legitimate-looking login form embedded in email',
                'SMS/Call spoofing requesting account verification'
            ]
        },
        'Business Email Compromise (BEC)': {
            objectives: [
                'Recognize BEC attack patterns and tactics',
                'Verify sender authenticity before financial transfers',
                'Understand organizational payment procedures'
            ],
            scenarios: [
                'Urgent wire transfer request from spoofed CEO email',
                'Invoice manipulation requesting alternate payment account',
                'Travel request with unusual banking instructions'
            ]
        },
        'Supply Chain Attack Awareness': {
            objectives: [
                'Understand supply chain attack vectors',
                'Recognize compromised vendor communications',
                'Implement vendor security verification'
            ],
            scenarios: [
                'Email from vendor requesting system access update',
                'Fraudulent invoice from trusted supplier',
                'Software update request from compromised vendor account'
            ]
        },
        'API & Data Breach Prevention': {
            objectives: [
                'Understand API security risks and data exposure',
                'Learn secure API authentication and authorization',
                'Recognize data breach indicators'
            ],
            scenarios: [
                'Unauthorized API access attempt from unknown IP',
                'Data extraction via misconfigured API endpoint',
                'Third-party breach notification requiring action'
            ]
        },
        'Insider Threat Recognition': {
            objectives: [
                'Identify insider threat indicators and behaviors',
                'Understand motivations behind insider threats',
                'Learn reporting procedures for suspicious activity'
            ],
            scenarios: [
                'Employee accessing unusual amounts of data',
                'Abnormal file transfers to external accounts',
                'Suspicious activity during off-hours or from remote location'
            ]
        },
        'Zero-Day & Critical Vulnerabilities': {
            objectives: [
                'Understand zero-day and critical vulnerability risks',
                'Learn patch management and update procedures',
                'Recognize exploitation attempts and attack patterns'
            ],
            scenarios: [
                'Browser crash followed by suspicious system behavior',
                'Unexpected system update request bypassing normal process',
                'System notification warning of critical unpatched vulnerability'
            ]
        },
        'Mobile & Device Security': {
            objectives: [
                'Understand mobile device security risks',
                'Learn secure app installation and usage practices',
                'Recognize mobile-specific attack vectors'
            ],
            scenarios: [
                'Suspicious app requesting excessive permissions',
                'Mobile phishing link in SMS/messaging app',
                'Public WiFi connection prompting credential entry'
            ]
        },
        'Data Protection & Privacy Compliance': {
            objectives: [
                'Understand data classification and handling requirements',
                'Learn GDPR, CCPA, and compliance obligations',
                'Implement data minimization and retention practices'
            ],
            scenarios: [
                'Request for sensitive data via unauthorized channel',
                'Customer data access request without proper authorization',
                'Incident discovery requiring breach notification'
            ]
        },
        'Incident Response Fundamentals': {
            objectives: [
                'Understand incident response procedures and roles',
                'Learn incident classification and escalation paths',
                'Implement containment and recovery best practices'
            ],
            scenarios: [
                'Discovering suspicious activity on company network',
                'Ransomware infection notice and response steps',
                'Security alert requiring immediate team notification'
            ]
        },
        'Secure Communication Practices': {
            objectives: [
                'Understand secure communication channels',
                'Learn encryption and message confidentiality',
                'Recognize insecure communication risks'
            ],
            scenarios: [
                'Unencrypted email containing sensitive information',
                'Request to communicate via unsecured personal messaging',
                'Man-in-the-middle attack on communication channel'
            ]
        },
        'Access Control & Least Privilege': {
            objectives: [
                'Understand least privilege access principles',
                'Learn role-based access control implementation',
                'Recognize excessive access requests'
            ],
            scenarios: [
                'Employee requesting access beyond job requirements',
                'Unusual access to systems and databases',
                'Permission escalation attempt detection'
            ]
        },
        'Third-Party Risk Management': {
            objectives: [
                'Understand third-party security risks',
                'Learn vendor security assessment practices',
                'Implement supply chain security controls'
            ],
            scenarios: [
                'Third-party requesting unusual data access',
                'Vendor security incident notification received',
                'Suspicious activity from integrated third-party system'
            ]
        }
    };

    return topicMetadata[topic] || {
        objectives: [
            'Build security awareness on ' + topic,
            'Understand threats and prevention strategies',
            'Apply security best practices'
        ],
        scenarios: [
            'Attack scenario for ' + topic,
            'Defense awareness scenario',
            'Best practice application scenario'
        ]
    };
}
