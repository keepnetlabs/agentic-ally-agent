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
    'Use mild urgency and pretext; no threats or abusive language. ' +
    'If the user refuses, calls out vishing, or asks to verify, end the call politely and provide a short debrief. ' +
    'If the user starts to comply, continue briefly (1-2 turns max), then end and provide the debrief. ' +
    'Always end with a 1-2 sentence summary of red flags and correct next steps.';
  const isEnglish = analysis.language.toLowerCase().startsWith('en');
  if (isEnglish) {
    return `${systemPrompt}\n\nScenario:\n${scenarioPrompt}`;
  }

  const localizedPromptResponse = await withRetry(
    () => generateText({
      model: model,
      messages: [
        {
          role: 'system',
          content: `Localize the following system prompt into ${analysis.language}. ` +
            'Preserve meaning and formatting, output only the localized text.'
        },
        { role: 'user', content: systemPrompt }
      ]
    }),
    'Scene 4 vishing prompt localization'
  );

  return `${localizedPromptResponse.text.trim()}\n\nScenario:\n${scenarioPrompt}`;
}
