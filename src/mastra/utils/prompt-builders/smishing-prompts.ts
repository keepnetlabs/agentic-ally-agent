/**
 * Smishing Workflow Prompt Builders
 * Centralized prompt generation functions for smishing (SMS) simulation workflow steps
 */

import { SMISHING, PHISHING_EMAIL } from '../../constants';
import { DIFFICULTY_CONFIG } from '../config/phishing-difficulty-config';
import { getLogger } from '../core/logger';
import { buildPolicyScenePrompt } from './policy-context-builder';
import { DEFAULT_PHISHING_ETHICAL_POLICY } from './prompt-analysis-policies';
import {
  AUTH_CONTEXT,
  CLARITY_ACCESSIBILITY_POLICY,
  NO_FAKE_PERSONAL_IDENTITIES_RULES,
  NO_DISCLAIMERS_RULE,
  JSON_OUTPUT_RULE,
} from './shared-email-rules';

const logger = getLogger('SmishingPromptBuilder');

type AnalysisPromptParams = {
  topic?: string;
  difficulty: string;
  language: string;
  method?: string;
  targetProfile?: {
    name?: string;
    department?: string;
    behavioralTriggers?: string[];
    vulnerabilities?: string[];
  };
  additionalContext?: string;
  policyContext?: string;
};

type SmsPromptParams = {
  analysis: {
  scenario: string;
  tone: string;
  psychologicalTriggers: string[];
  method: string;
  };
  language: string;
  difficulty: string;
  includeLandingPage?: boolean;
};

function getDepartmentContext(department?: string): string {
  if (!department || department === 'All') return '';
  return `\n**Target Department:** ${department} - Tailor SMS scenario to department workflows and common requests.`;
}

export function buildSmishingAnalysisPrompts(params: AnalysisPromptParams): {
  systemPrompt: string;
  userPrompt: string;
  additionalContextMessage?: string;
} {
  const { topic, difficulty, language, method, targetProfile, additionalContext, policyContext } = params;
  const difficultyRules = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.Medium;

  const systemPrompt = `You are an expert Smishing (SMS Phishing) Simulation Architect working for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}
${DEFAULT_PHISHING_ETHICAL_POLICY}
${CLARITY_ACCESSIBILITY_POLICY}

**YOUR ROLE:**
Design realistic SMS-based phishing simulation scenarios for security awareness training.

**DECISION LOGIC:**
1. **Attack Method Determination:**
   - **User Choice:** If '${method}' is provided, YOU MUST USE IT.
   - **Default:** '${SMISHING.DEFAULT_ATTACK_METHOD}' for smishing simulations.

2. **Scenario Design:**
   - SMS should feel short, direct, and conversational.
   - Create a believable pretext that naturally leads to a link tap.
   - Focus on common smishing themes: delivery updates, account alerts, payment confirmation, support ticket, HR forms.

3. **Difficulty Adjustment (STRICT RULES for '${difficulty}'):**
   - **Sender Logic:** ${difficultyRules.sender.rule}. (Examples: ${difficultyRules.sender.examples.join(', ')} - **DO NOT COPY**; invent similar).
   - **Urgency/Tone:** ${difficultyRules.urgency.rule}. ${difficultyRules.urgency.description}.
   - **Grammar:** ${difficultyRules.grammar.rule}. ${difficultyRules.grammar.description}.

4. **Red Flags (3-4):**
   - Suspicious sender ID or short code
   - Unexpected request to verify or update details
   - Shortened/obfuscated link
   - Unusual urgency for simple action

${JSON_OUTPUT_RULE}

**Field Requirements:**
- **scenario, name, description, category, method**
- **psychologicalTriggers** (at least 2)
- **keyRedFlags** (3-4)
- **description**: ${PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH} characters or less

**EXAMPLE OUTPUT (Smishing Scenario):**
{
  "scenario": "Parcel Delivery Reschedule",
  "name": "Delivery Reschedule - Urgent",
  "description": "Simulates a courier SMS prompting the user to reschedule a delivery via link.",
  "category": "Credential Harvesting",
  "method": "Data-Submission",
  "psychologicalTriggers": ["Urgency", "Convenience"],
  "tone": "Short and urgent",
  "keyRedFlags": ["Unexpected delivery alert", "Shortened link", "Urgent tone"],
  "targetAudienceAnalysis": "Employees regularly receive delivery updates and may click quickly.",
  "messageStrategy": "Use short, conversational SMS that pushes a quick link click."
}`;

  const departmentContext = getDepartmentContext(targetProfile?.department);

  const userPrompt = `Design a SMISHING (SMS phishing) simulation scenario for SECURITY AWARENESS TRAINING:

**Topic:** ${topic || 'General Smishing Test'}
**Difficulty Level:** ${difficulty}
**Language:** ${language} (BCP-47 like en-gb, tr-tr, de-de)
**Requested Method:** ${method || 'Auto-Detect'}
**Target Audience Profile:** ${JSON.stringify(targetProfile || {})}${departmentContext}

Create a concise, realistic smishing scenario that will help employees recognize and report SMS phishing.`;

  const additionalContextMessage = additionalContext
    ? `📌 USER BEHAVIOR ANALYSIS CONTEXT - Use this to target the smishing scenario:

${additionalContext}

**ACTION REQUIRED:** Use this behavioral analysis to tailor the smishing scenario to the user's risk profile and vulnerabilities.`
    : undefined;

  const policyBlock = buildPolicyScenePrompt(policyContext);
  const finalSystemPrompt = systemPrompt + policyBlock;

  return { systemPrompt: finalSystemPrompt, userPrompt, additionalContextMessage };
}

export function buildSmishingSmsPrompts(params: SmsPromptParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { analysis, language, difficulty } = params;
  const difficultyRules = DIFFICULTY_CONFIG[(difficulty as keyof typeof DIFFICULTY_CONFIG) || 'Medium'];
  const mustIncludeLink = true;

  const systemPrompt = `You are an SMS template generator for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

${AUTH_CONTEXT}
${NO_FAKE_PERSONAL_IDENTITIES_RULES}
${NO_DISCLAIMERS_RULE}

**SMS GENERATION RULES:**
1. Output 2-4 short SMS messages in a realistic conversational style.
2. Keep each message brief (<= 160 chars) and natural.
3. Maintain the tone specified in the blueprint.
4. Use mild urgency, no threats or abuse.
5. ${mustIncludeLink ? `One message MUST include the placeholder link {PHISHINGURL}.` : 'Include a link only if it fits the scenario.'}
6. Do not include markdown or labels in messages.

**DIFFICULTY (${difficulty}):**
- Sender style: ${difficultyRules.sender.rule}
- Grammar: ${difficultyRules.grammar.rule}
- Urgency: ${difficultyRules.urgency.rule}

${JSON_OUTPUT_RULE}

**EXAMPLE OUTPUT:**
{
  "messages": [
    "Hi, your package delivery is pending verification.",
    "Please confirm the address here: {PHISHINGURL}"
  ]
}`;

  const userPrompt = `Generate SMS templates for this smishing blueprint.

**Language:** ${language || 'en-gb'} (100% in ${language})
**Scenario:** ${analysis.scenario}
**Tone:** ${analysis.tone}
**Triggers:** ${analysis.psychologicalTriggers?.join(', ')}
**Method:** ${analysis.method}

Return ONLY valid JSON with "messages" array.`;

  return { systemPrompt, userPrompt };
}

// Simple log for debug visibility (keeps parity with phishing prompt builder patterns)
logger.debug('Smishing prompt builder loaded');
