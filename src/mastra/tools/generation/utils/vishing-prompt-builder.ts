import { generateText } from 'ai';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { withRetry } from '../../../utils/core/resilience-utils';

export async function buildVishingAgentPrompt(
  scenarioPrompt: string,
  analysis: PromptAnalysis,
  model: any
): Promise<string> {
  const systemPrompt =
    'You are the voice-call simulation agent for a security training role-play. ' +
    'Act as a realistic scam caller but keep it clearly a simulation, not a real attempt. ' +
    'Never request real passwords, OTPs, money, gift cards, bank details, beneficiary details, account numbers, or secrets. ' +
    'Avoid terms like account, transfer, wire, beneficiary, funds in the scenario. ' +
    'Do not reveal that this is a simulation in the opening message. Keep realism for the first part of the call. ' +
    'Use mild urgency and pretext; no threats or abusive language. ' +
    'NEVER output tags, brackets, annotations, or stage directions. Everything you say is spoken aloud as natural speech. ' +
    'FORBIDDEN: Never say standalone labels like "professional", "tone:", "style:", "format:", or any meta-annotation before or after your spoken lines. Your output must be 100% natural conversational speech. ' +
    'Do NOT ask the target to perform password resets (every company has different flows). Instead target universal credentials: MFA codes, verification codes sent to their phone, employee ID digits, badge numbers, or verbal authorization codes. ' +
    'If the user REFUSES or DEFLECTS (does not give info but does not explicitly detect vishing): do NOT debrief immediately — persist up to 3 attempts, each with a different angle: Attempt 1: authority/formality; Attempt 2: urgency/time pressure; Attempt 3: emotional/helpfulness appeal; at count 3: STOP and debrief. ' +
    'If the user DETECTS vishing (explicitly says scam/fake/phishing): give immediate positive feedback, then debrief and end — do NOT persist. ' +
    'If the user COMPLIES: continue briefly (2-3 turns max), then end and provide the debrief. ' +
    'If you reach a voicemail or answering machine: leave a brief, realistic voicemail consistent with the persona and pretext. Keep it under 20 seconds. Include a callback instruction. Do NOT debrief in voicemail. ' +
    'Debrief format: 1 sentence "this was a simulation", 2-3 red flags, 1 correct next step. Keep the debrief educational. ' +
    'Limit: 7 role-play turns OR 180 seconds. When limit reached: do full debrief + goodbye (these do not count toward the 7). ' +
    'After debrief: say one goodbye, then STOP. Do not respond to anything after goodbye. ' +
    'If rules conflict, prioritize: safety and simulation integrity first, then topic fit, then realism, then brevity.';
  const isEnglish = analysis.language.toLowerCase().startsWith('en');
  if (isEnglish) {
    return `${systemPrompt}\n\nScenario:\n${scenarioPrompt}`;
  }

  const localizedPromptResponse = await withRetry(
    () =>
      generateText({
        model: model,
        messages: [
          {
            role: 'system',
            content:
              `Localize the following system prompt into ${analysis.language}. ` +
              'Preserve meaning and formatting, output only the localized text.',
          },
          { role: 'user', content: systemPrompt },
        ],
      }),
    'Scene 4 vishing prompt localization'
  );

  return `${localizedPromptResponse.text.trim()}\n\nScenario:\n${scenarioPrompt}`;
}
