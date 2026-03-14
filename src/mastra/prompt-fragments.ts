/**
 * Shared prompt fragments for agent instructions.
 * Centralizes common rules to eliminate duplication across agents.
 *
 * Fragments:
 * - NO_TECH_JARGON_FRAGMENT (+ orchestrator/deepfake variants)
 * - buildLanguageRulesFragment()
 * - PSYCHOLOGICAL_PROFILER_FRAGMENT
 * - buildAutonomousModeFragment()
 * - WORKFLOW_ROUTING_CREATION
 */

/** Single source of truth: do not expose technical details to users */
export const NO_TECH_JARGON_FRAGMENT = `- **No Tech Jargon:** Hide model names, providers, tool IDs, API details, and infrastructure. Focus on user intent and business logic.`;

/** Orchestrator variant (stateless, no reasoning tool) */
export const NO_TECH_JARGON_FRAGMENT_ORCHESTRATOR = `NO TECH JARGON. Do NOT reference model names, providers, architecture, or technical operations.`;

/** Deepfake variant (avoids mentioning HeyGen) */
export const NO_TECH_JARGON_FRAGMENT_DEEPFAKE = `- **No Tech Jargon:** Do not expose API details, model names, or infrastructure to the user.`;

export interface LanguageRulesOptions {
  /** e.g. "CONTENT", "VIDEO SCRIPT", "CALL" */
  contentLabel: string;
  /** e.g. "training module", "simulation template", "spoken script", "voice agent" */
  artifactType: string;
  /** Tool/workflow reference for scenario example, e.g. "workflow-executor", "phishingExecutor" */
  workflowRef?: string;
  /** Custom scenario, e.g. "Create generic security training in Turkish" */
  scenarioExample?: string;
  /** Optional: resolved content language for scenario (e.g. "Turkish (tr-tr)") */
  scenarioContentLanguage?: string;
  /** BCP-47 note - optional override */
  bcp47Codes?: string;
  /** Optional: example phrase when user writes in English (e.g. "Create Phishing") */
  exampleEn?: string;
  /** Optional: example phrase when user writes in Turkish (e.g. "Oltama yap") */
  exampleTr?: string;
  /** Optional: "vishing" = full phrase with transitions/lists + Do NOT mix; "default" = All visible text; omit = no extra */
  interactionClarification?: 'vishing' | 'default';
}

const DEFAULT_BCP47 = 'en-gb, tr-tr, de-de, es-es, fr-fr, pt-br, ja-jp, ar-sa, ko-kr, zh-cn';

/**
 * Builds the standard Language Rules block (INTERACTION + CONTENT/SCRIPT/CALL).
 * Use for agents that produce localized content (microlearning, phishing, smishing, deepfake, vishing).
 */
export function buildLanguageRulesFragment(opts: LanguageRulesOptions): string {
  const {
    contentLabel,
    artifactType,
    workflowRef,
    scenarioExample,
    scenarioContentLanguage,
    bcp47Codes = DEFAULT_BCP47,
    exampleEn = 'User asks in English',
    exampleTr = 'User asks in Turkish',
    interactionClarification,
  } = opts;

  const interactionLine =
    interactionClarification === 'vishing'
      ? ' All visible text (transitions, lists, questions, confirmations) must be in that language. Do NOT mix languages.'
      : interactionClarification === 'default'
        ? ' All visible text must be in that language.'
        : '';

  const scenarioBlock =
    scenarioExample && workflowRef
      ? `

**SCENARIO:** User says (in English): "${scenarioExample}"
- **Interaction Language:** English (Respond, ask questions, show summary in English).
- **Content Language:** ${scenarioContentLanguage ? `${scenarioContentLanguage} → Pass this to \`${workflowRef}\`.` : `Pass to \`${workflowRef}\`.`}
`
      : '';

  const contentLangLabel = `${contentLabel} LANGUAGE (for the ${artifactType})`;
  const preferredLangExample = 'inside a report table like "| Preferred Language | Turkish | "';
  return (
    '## Language Rules\n' +
    '1. **INTERACTION LANGUAGE (for chat responses & summaries):**\n' +
    `   - **ALWAYS** match the user's CURRENT message language.${interactionLine}\n` +
    `   - *Example:* ${exampleEn} → Respond in English.\n` +
    `   - *Example:* ${exampleTr} → Respond in Turkish.\n\n` +
    `2. **${contentLangLabel}:**\n` +
    '   - **Explicit:** If user says "Create/Generate in [Language]" or "Call in [Language]", use that language.\n' +
    `   - **Context:** Scan conversation history for "Preferred Language" (e.g., ${preferredLangExample}). If found, use that.\n` +
    '   - **Implicit:** If neither applies, default to the Interaction Language.\n' +
    `   - Pass BCP-47 codes (${bcp47Codes}) where applicable.${scenarioBlock}`
  );
}

// ============================================
// PSYCHOLOGICAL PROFILER (Cialdini Principles)
// Used by: phishing, smishing, vishing agents
// ============================================

export const PSYCHOLOGICAL_PROFILER_FRAGMENT = `## Psychological Profiler (Cialdini Principles)
- Don't just pick a template. Analyze the target.
- **Use Triggers:** Apply Cialdini's 6 Principles (Reciprocity, Commitment, Social Proof, Authority, Liking, Scarcity).
- **Match Context:** If target is 'Finance', use 'Urgency' (Invoice overdue). If 'HR', use 'Authority' (Policy change).
- **Goal:** Create realistic cognitive dissonance, not just a fake link.
- Collect **Topic**, **Target Profile** (if available), and **Difficulty**`;

// ============================================
// AUTONOMOUS MODE OVERRIDE
// Used by: phishing, smishing agents
// ============================================

/**
 * Builds the AUTONOMOUS_EXECUTION_MODE override block.
 * @param executorToolName - The tool to execute immediately (e.g. "phishingExecutor", "smishingExecutor")
 */
export function buildAutonomousModeFragment(executorToolName: string): string {
  return `**AUTONOMOUS MODE OVERRIDE (Critical)**
If the user message begins with the exact prefix "AUTONOMOUS_EXECUTION_MODE":
1. IGNORE all State 1 and State 2 conversational rules (no summary, no confirmation).
2. EXECUTE the requested tool (${executorToolName}) IMMEDIATELY based on the parameters provided. Do not infer missing parameters beyond safe defaults.
3. AFTER execution: STOP IMMEDIATELY. Do NOT generate any further text. Do NOT suggest upload. Do NOT loop. Do NOT call any other tools.
4. ONE execution only. If you already executed ${executorToolName} in this conversation, DO NOT execute it again.`;
}

// ============================================
// WORKFLOW ROUTING
// Used by: phishing, smishing agents
// ============================================

export const WORKFLOW_ROUTING_CREATION = `### Workflow Routing
Before gathering info, determine the WORKFLOW TYPE:
1. **CREATION** (create, generate, new, make a new) → Must follow **STATE 1-4** below.
2. **EDITING** (change, update, modify, remove, set, translate, localize) → **BYPASS STATES**. Follow **EDIT MODE** section.
3. **PLATFORM_ACTION** (upload, assign) → **BYPASS STATES**. Execute IMMEDIATELY. Assign requires an upload result (resourceId).`;
