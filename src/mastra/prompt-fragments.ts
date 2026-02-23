/**
 * Shared prompt fragments for agent instructions.
 * Centralizes common rules (No Tech Jargon, Language Rules) for maintainability.
 *
 * Usage:
 * - Import NO_TECH_JARGON_FRAGMENT, buildLanguageRulesFragment
 * - Replace inline prompt text with fragment references
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
