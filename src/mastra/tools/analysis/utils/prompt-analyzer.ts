import { generateText } from 'ai';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { ExampleRepo } from '../../../services/example-repo';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../../../utils/language/language-utils';
import { cleanResponse } from '../../../utils/content-processors/json-cleaner';
import { buildPolicySystemPrompt } from '../../../utils/prompt-builders/policy-context-builder';
import { CLARITY_ACCESSIBILITY_POLICY, DEFAULT_MICROLEARNING_ETHICAL_POLICY } from '../../../utils/prompt-builders/prompt-analysis-policies';
import { PROMPT_ANALYSIS_PARAMS } from '../../../utils/config/llm-generation-params';
import { MICROLEARNING, ROLES, CATEGORIES, THEME_COLORS } from '../../../constants';
import { streamReasoning } from '../../../utils/core/reasoning-stream';
import { getLogger } from '../../../utils/core/logger';
import { normalizeError } from '../../../utils/core/error-utils';
import { withRetry } from '../../../utils/core/resilience-utils';
import { autoRepairPromptAnalysis } from '../prompt-analysis-normalizer';
import { detectSmishingChannelFromText } from '../../../utils/smishing-channel';

// Cache formatted lists for performance
const cachedRolesList = ROLES.VALUES.map((role) => `- "${role}"`).join('\n');
const cachedCategoriesList = CATEGORIES.VALUES.map((cat) => `- "${cat}"`).join('\n');
const cachedThemeColorsList = THEME_COLORS.VALUES.map((color) => `- "${color}"`).join('\n');
const LANGUAGE_DETECTION_SEGMENT_LENGTH = 1200;

function computeDetailCoverage(details: string[], outputs: Array<string | undefined>): number {
    if (!details.length) return 1;
    const searchableOutput = outputs
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
        .toLowerCase();

    if (!searchableOutput) return 0;

    const outputTokens = new Set(
        searchableOutput
            .split(/[^\p{L}\p{N}]+/u)
            .map((token) => token.trim())
            .filter((token) => token.length >= 3)
    );

    const coveredCount = details.filter((detail) => {
        const normalized = detail.trim().toLowerCase();
        if (normalized.length < 5) return false;
        if (searchableOutput.includes(normalized)) return true;

        const detailTokens = normalized
            .split(/[^\p{L}\p{N}]+/u)
            .map((token) => token.trim())
            .filter((token) => token.length >= 3);

        if (!detailTokens.length) return false;

        const matchedTokens = detailTokens.filter((token) => outputTokens.has(token));
        const ratio = matchedTokens.length / detailTokens.length;
        return ratio >= 0.6;
    }).length;

    return coveredCount / details.length;
}

function buildLanguageDetectionSample(promptText: string, contextText: string): string {
    const combinedText = `Prompt: "${promptText}"\n\nContext: "${contextText}"`;
    const maxVisibleLength = LANGUAGE_DETECTION_SEGMENT_LENGTH * 2;

    if (combinedText.length <= maxVisibleLength) {
        return combinedText;
    }

    const head = combinedText.slice(0, LANGUAGE_DETECTION_SEGMENT_LENGTH);
    const tail = combinedText.slice(-LANGUAGE_DETECTION_SEGMENT_LENGTH);
    const omittedChars = combinedText.length - maxVisibleLength;
    return `${head}\n\n...[omitted ${omittedChars} chars]...\n\n${tail}`;
}
/**
 * Character-based language detection fallback (final safety net)
 */
export function detectLanguageFallback(text: string): string {
    if (/[ğüşıöçĞÜŞİÖÇ]/.test(text)) return 'tr';
    if (/[äöüßÄÖÜ]/.test(text)) return 'de';
    if (/[àáâäèéêëìíîïòóôöùúûü]/.test(text)) return 'fr';
    if (/[áéíóúñü¿¡]/.test(text)) return 'es';
    if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]/.test(text)) return 'pt';
    if (/[àáäèéëìíîïòóôùúûü]/.test(text)) return 'it';
    if (/[а-я]/.test(text.toLowerCase())) return 'ru';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    return 'en';
}

/**
 * Ask AI to detect target language (returns BCP-47 code directly)
 */
export async function detectTargetLanguageWithAI(text: string, model: any, additionalContext: string = ''): Promise<string | null> {
    try {
        // Keep both beginning and end of text/context to reduce signal loss in long prompts.
        const sampledText = buildLanguageDetectionSample(text, additionalContext);

        const response = await withRetry(
            () => generateText({
                model,
                prompt: `What language should the training/content be created in?
1. Look for explicit "in {language}" requests in the Prompt.
2. Look for "Preferred Language: {language}" or similar indicators in the Context.
3. If neither is found, identify the language of the Prompt itself.

Return ONLY the BCP-47 code (e.g., ar-sa, tr-tr, en-gb, zh-cn, vi-vn, hi-in).

Text to Analyze:
${sampledText}

Target language code:`,
                temperature: 0.1, // Lower temperature for more deterministic code extraction
            }),
            `[AnalyzeUserPromptTool] language-detection`
        );

        const code = response.text?.trim().toLowerCase() || '';
        if (!code) return null;

        const validated = validateBCP47LanguageCode(code);
        // Allow returning the detected language even if it matches default, ensuring we respect explicit choices
        return validated;
    } catch {
        return null;
    }
}

interface AnalyzeUserPromptParams {
    userPrompt: string;
    additionalContext?: string;
    suggestedDepartment?: string;
    suggestedLevel?: string;
    customRequirements?: string;
    suggestedLanguage?: string;
    policyContext?: string;
    model: any;
    writer?: any;
}

/**
 * Core logic for user prompt analysis
 */
export async function analyzeUserPromptWithAI(params: AnalyzeUserPromptParams) {
    const { userPrompt, additionalContext, suggestedDepartment, suggestedLevel, customRequirements, suggestedLanguage, policyContext, model, writer } = params;
    const logger = getLogger('AnalyzeUserPromptTool');

    try {
        const repo = ExampleRepo.getInstance();
        await repo.loadExamplesOnce();

        let schemaHints: string;
        try {
            schemaHints = await repo.getSmartSchemaHints(userPrompt, 3);
        } catch (error) {
            const err = normalizeError(error);
            logger.warn('Semantic search unavailable, trying smart sampling', { error: err.message });
            try {
                schemaHints = await repo.getSmartSchemaHints(undefined, 3);
            } catch (fallbackError) {
                const fbErr = normalizeError(fallbackError);
                logger.warn('Smart sampling failed, using basic schema hints', { error: fbErr.message });
                schemaHints = repo.getSchemaHints(3);
            }
        }

        const examplesBlock = schemaHints
            ? `\n\nSCHEMA HINTS (structure only, do not copy texts):\n${schemaHints}`
            : '';

        const policyBlock = buildPolicySystemPrompt(policyContext);

        // PRIORITIZE SUGGESTED LANGUAGE (FIX)
        let languageHint = suggestedLanguage ? suggestedLanguage.toLowerCase() : 'en-gb';

        // ONLY detect with AI if we don't have a suggested language
        if (!suggestedLanguage) {
            try {
                const aiLang = await detectTargetLanguageWithAI(userPrompt, model, additionalContext);
                if (aiLang) {
                    languageHint = aiLang.toLowerCase();
                }
            } catch {
                const charBasedLang = validateBCP47LanguageCode(detectLanguageFallback(userPrompt));
                languageHint = charBasedLang.toLowerCase();
            }
        }

        const analysisPrompt = `Create microlearning metadata from this request:

USER: "${userPrompt}" (LANGUAGE: ${languageHint})
DEPARTMENT: ${suggestedDepartment || 'not specified'}
SUGGESTED LEVEL: ${suggestedLevel || 'auto-detect'}${examplesBlock}${policyBlock}

${CLARITY_ACCESSIBILITY_POLICY}

${DEFAULT_MICROLEARNING_ETHICAL_POLICY}

ROLE SELECTION OPTIONS (pick ONE based on audience):
${cachedRolesList}

CATEGORY SELECTION OPTIONS (pick ONE based on topic domain):
${cachedCategoriesList}

THEME COLOR OPTIONS (pick ONE if applicable):
${cachedThemeColorsList}

Return JSON:
{
  "language": "BCP-47 tag (language-lowercase + region-lowercase; prefer regional if known, e.g., en-gb/en-us/fr-ca/tr-tr; else use primary, e.g. en-gb)"
  "topic": "2-3 words max - core subject only",
  "title": "3-5 words max - professional training title",
  "description": "1-2 sentences max - professional training description",
  "department": "target department or 'All'",
  "level": "beginner/intermediate/advanced - use SUGGESTED LEVEL if provided, else detect from complexity",
  "category": "One category from the list above that matches the topic domain",
  "subcategory": "specific subcategory based on focus",
  "learningObjectives": ["specific skills learner can DO after 5-min training. Use Bloom's Taxonomy Action Verbs (Analyze, Create, Verify, Spot, Report). NOT passive verbs (Understand, Know) or meta-tasks (pass quiz)"],
  "duration": ${MICROLEARNING.DURATION_MINUTES},
  "industries": ["relevant industries from context or 'General Business'"],
  "roles": ["One role from the list above that matches the target audience"],
  "themeColor": "Standard code from THEME COLOR OPTIONS list if user explicitly mentioned a color. Otherwise null.",
  "keyTopics": ["3-5 main learning areas"],
  "practicalApplications": ["3-4 workplace situations"],
  "mustKeepDetails": ["5-8 critical user constraints/details that must not be lost in downstream generation"],
  "assessmentAreas": ["testable skills - focus on 'can they do X'"],
  "regulationCompliance": ["relevant regulations by topic/industry"],
  "isCodeTopic": false,
  "isVishing": false,
  "isSmishing": false,
  "deliveryChannel": null
}

RULES:
- For "roles": Pick ONE option that best matches the topic's target audience
  - Technical/IT content → "IT Department"
  - Fraud/finance content → "Finance Department"
  - HR/culture topics → "Human Resource Department"
  - Sales topics → "Sales Department"
  - Unknown audience → "All Employees"
- For "category": Pick ONE option that best matches the topic domain
  - Email phishing → "Email Security"
  - Malware/virus → "Malware"
  - Ransomware → "Ransomware & Extortion"
  - Remote work → "Remote Working Security"
  - GDPR/privacy → "GDPR"
  - Social engineering → "Social Engineering"
  - Cloud → "Cloud Security"
  - If unsure → "General"
- For "themeColor": ONLY fill if user explicitly mentioned a color
  - Accept both standard codes and simple names
  - Convert simple color names to standard codes from the THEME COLOR OPTIONS list:
    * "red" // "danger" // "risk" → "bg-gradient-red"
    * "blue" // "tech" // "technology" → "bg-gradient-blue"
    * "green" // "safe" // "safety" → "bg-gradient-green"
    * "purple" // "compliance" → "bg-gradient-purple"
    * "gray" // "grey" // "general" → "bg-gradient-gray"
    * "orange" // "innovation" → "bg-gradient-orange"
    * "yellow" // "smoke" → "bg-gradient-yellow" or "bg-gradient-yellow-smoke"
    * "pink" // "social" → "bg-gradient-pink"
  - User must explicitly state the color - do not infer or choose colors automatically
  - Otherwise leave as null/empty string
  - User must explicitly state the color - do not infer or choose colors automatically
- isCodeTopic: Set to true if topic mentions programming languages OR code-focused topics. Otherwise false.
- isVishing: Set to true only if the topic is about voice phishing/vishing or phone-call based social engineering. Otherwise false.
- isSmishing: Set to true only if the topic is about SMS phishing/smishing or text-message based social engineering. Otherwise false.
- PEDAGOGICAL RULE: learningObjectives & assessmentAreas MUST be actionable. NO "Understand", "Know", "Learn".
- DON'T copy user instructions as title/topic
- CREATE professional titles from user intent
- EXTRACT core subject, not full request
- USE BCP-47 language codes only
- RESPOND in user's language for content
- If request/context includes specific constraints, examples, scenarios, audiences, or risks, preserve them in keyTopics and practicalApplications.
- Capture the same constraints/examples/risks in mustKeepDetails as explicit non-negotiable details.
- Never drop critical user intent details when generating metadata.
- isCodeTopic: **CRITICAL** - Return as boolean (true/false). Set to true IF ANY of these conditions are met:
  1. Topic mentions a PROGRAMMING LANGUAGE: JavaScript, Python, Java, C++, C#, Go, Rust, TypeScript, Kotlin, PHP, Ruby, Swift, etc.
  2. Topic mentions CODE-FOCUSED CONCEPTS: code review, secure coding, vulnerabilities, injection, XSS, SQL injection, API security, encryption, authentication, authorization, buffer overflow, memory management, testing, refactoring, debugging, legacy code, etc.
  3. Topic mentions SECURITY CODING: OWASP, CWE, CVE, secure coding, secure design, security testing, etc.
  Set to FALSE ONLY for: threat awareness, phishing, ransomware, social engineering, compliance, policy, incident response, password management, MFA, data protection (non-code).
- isVishing: **CRITICAL** - Return as boolean (true/false). Set to true IF ANY of these conditions are met:
  1. Topic explicitly mentions "vishing" or "voice phishing".
  2. Topic mentions phone-call scams, caller impersonation, or voice-based social engineering.
  Set to FALSE for: email phishing, SMS phishing (smishing), general phishing, and non-voice social engineering.
- isSmishing: **CRITICAL** - Return as boolean (true/false). Set to true IF ANY of these conditions are met:
  1. Topic explicitly mentions "smishing" or "SMS phishing".
  2. Topic mentions text-message or messaging-app scams, suspicious links in chat apps, or text/chat-based social engineering.
  Set to FALSE for: email phishing, voice phishing (vishing), general phishing, and non-text social engineering.
- deliveryChannel: **ONLY if isSmishing is true**. Set to one of:
  - "slack" if the prompt mentions Slack, workspace chat, or Slack DM.
  - "teams" if the prompt mentions Microsoft Teams or Teams chat.
  - "whatsapp" if the prompt mentions WhatsApp.
  - "telegram" if the prompt mentions Telegram.
  - "instagram" if the prompt mentions Instagram DMs/messages.
  - "linkedin" if the prompt mentions LinkedIn messages/InMail.
  - "sms" if the prompt mentions SMS, text message, or if no channel is specified.
  - If isSmishing is false, return null.`;

        const messages: any[] = [
            {
                role: 'system',
                content: 'You are an expert instructional designer and Pedagogical Advisor. CRITICAL: Analyze user requests intelligently and create professional microlearning metadata. Do NOT copy user instructions as titles/topics. Extract the core learning subject. Learning objectives MUST use Bloom\'s Taxonomy Action Verbs (e.g. "Analyze", "Evaluate", "Create", "Demonstrate") and be realistic for 5-minute training. Focus on specific, immediately actionable skills. For roles field: select exactly ONE role. For category field: select exactly ONE category. For themeColor field: ONLY fill if user explicitly mentioned a color. Return ONLY VALID JSON - NO markdown. Use BCP-47 language codes.'
            }
        ];

        if (additionalContext) {
            messages.push({
                role: 'user',
                content: `🔴 CRITICAL USER CONTEXT - Behavior & Risk Analysis:

${additionalContext}`
            });
        }

        messages.push({
            role: 'user',
            content: analysisPrompt
        });

        const response = await withRetry(
            () => generateText({
                model: model,
                messages: messages,
                ...PROMPT_ANALYSIS_PARAMS
            }),
            `[AnalyzeUserPromptTool] prompt-analysis`
        );

        let reasoning = (response as any).response?.body?.reasoning;
        if (reasoning && writer) {
            reasoning += `\n 'I will create an 8-scene code editor training module if isCodeTopic is true, otherwise I will create an 8-scene inbox-based training module.'`;
            streamReasoning(reasoning, writer);
        }

        const cleanedText = cleanResponse(response.text, 'prompt-analysis');
        const analysis = JSON.parse(cleanedText) as Partial<PromptAnalysis>;

        const normalizedLanguage = validateBCP47LanguageCode(analysis.language || DEFAULT_LANGUAGE);
        analysis.language = normalizedLanguage;

        if (analysis.themeColor && !THEME_COLORS.VALUES.includes(analysis.themeColor as any)) {
            analysis.themeColor = undefined;
        }

        const repaired = autoRepairPromptAnalysis(analysis, { suggestedDepartment });

        if (additionalContext) {
            analysis.hasRichContext = true;
            analysis.additionalContext = additionalContext;
        }

        if (customRequirements) {
            analysis.customRequirements = customRequirements;
        }

        repaired.hasRichContext = analysis.hasRichContext;
        repaired.additionalContext = analysis.additionalContext;
        repaired.customRequirements = analysis.customRequirements;
        repaired.themeColor = analysis.themeColor;

        const mustKeepDetails = repaired.mustKeepDetails || [];
        if (mustKeepDetails.length > 0) {
            const coverage = computeDetailCoverage(mustKeepDetails, [
                repaired.title,
                repaired.description,
                ...(repaired.keyTopics || []),
                ...(repaired.practicalApplications || []),
                ...(repaired.learningObjectives || []),
            ]);

            if (coverage < 0.5) {
                logger.warn('Low mustKeepDetails coverage after analysis normalization', {
                    coverage,
                    detailsCount: mustKeepDetails.length,
                    topic: repaired.topic,
                });
            } else {
                logger.debug('mustKeepDetails coverage validated', {
                    coverage,
                    detailsCount: mustKeepDetails.length,
                });
            }
        }

        return {
            success: true,
            data: repaired as PromptAnalysis,
            policyContext
        };

    } catch (error) {
        throw error;
    }
}

/**
 * Robust fallback analysis for production stability
 */
export async function getFallbackAnalysis(params: AnalyzeUserPromptParams) {
    const { userPrompt, suggestedDepartment, additionalContext, customRequirements, model } = params;

    const specificCodeSecurityKeywords = [
        'injection', 'xss', 'cross-site scripting', 'vulnerability', 'vulnerable',
        'buffer overflow', 'memory leak', 'sql injection', 'code review',
        'secure coding', 'api security', 'encryption', 'hash', 'authentication',
        'authorization', 'owasp', 'cwe', 'cvss', 'refactoring', 'debugging',
        'testing', 'legacy code', 'memory management', 'design pattern'
    ];

    const programmingLanguages = ['javascript', 'python', 'java', 'c++', 'c#', 'php', 'go', 'rust', 'typescript', 'kotlin', 'ruby', 'swift', 'scala', 'r language'];
    const vishingKeywords = [
        'vishing',
        'voice phishing',
        'phone phishing',
        'phone scam',
        'call scam',
        'voice scam',
        'caller impersonation',
        'phone-based social engineering',
        'voice-based social engineering'
    ];
    const smishingKeywords = [
        'smishing',
        'sms phishing',
        'text phishing',
        'text scam',
        'sms scam',
        'text message scam',
        'telegram scam',
        'telegram phishing',
        'instagram dm scam',
        'instagram phishing',
        'linkedin message scam',
        'linkedin phishing',
        'sms-based social engineering',
        'text-based social engineering'
    ];

    const promptLower = userPrompt.toLowerCase();
    const hasSpecificCodeSecurityKeyword = specificCodeSecurityKeywords.some(kw => promptLower.includes(kw));
    const hasProgrammingLanguage = programmingLanguages.some(lang => promptLower.includes(lang));
    const isCodeSecurityFallback = hasProgrammingLanguage || hasSpecificCodeSecurityKeyword;
    const isVishingFallback = vishingKeywords.some(kw => promptLower.includes(kw));
    const isSmishingFallback = smishingKeywords.some(kw => promptLower.includes(kw));

    let detectedLang: string | null = null;
    try {
        detectedLang = await detectTargetLanguageWithAI(userPrompt, model, additionalContext);
    } catch {
        // Ignore AI failure in fallback
    }

    if (!detectedLang) {
        detectedLang = validateBCP47LanguageCode(detectLanguageFallback(userPrompt));
    }

    return {
        language: detectedLang || DEFAULT_LANGUAGE,
        topic: userPrompt.substring(0, 50),
        title: `Training: ${userPrompt.substring(0, 30)}`,
        description: `Essential training on ${userPrompt.substring(0, 50)}.`,
        department: suggestedDepartment || 'All',
        level: 'intermediate',
        category: CATEGORIES.DEFAULT,
        subcategory: 'Professional Skills',
        learningObjectives: [
            `Identify core concepts of ${userPrompt.substring(0, 20)}`,
            'Apply secure best practices in daily workflows',
            'Demonstrate mitigation strategies for identified risks'
        ],
        duration: MICROLEARNING.DURATION_MINUTES,
        industries: ['General'],
        roles: [ROLES.DEFAULT],
        themeColor: undefined,
        keyTopics: [userPrompt.substring(0, 30)],
        practicalApplications: [`Safe handling of ${userPrompt.substring(0, 20)} related tasks`],
        mustKeepDetails: [userPrompt.substring(0, 60)],
        assessmentAreas: [`Identify key risks`, `Apply correct procedures`],
        regulationCompliance: [],
        hasRichContext: !!additionalContext,
        additionalContext: additionalContext || undefined,
        customRequirements: customRequirements,
        isCodeTopic: isCodeSecurityFallback,
        isVishing: isVishingFallback,
        isSmishing: isSmishingFallback,
        deliveryChannel: isSmishingFallback
            ? (detectSmishingChannelFromText(userPrompt) ?? 'sms')
            : undefined,
    };
}
