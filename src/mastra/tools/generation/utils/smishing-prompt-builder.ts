import { generateText } from 'ai';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { withRetry } from '../../../utils/core/resilience-utils';

export async function buildSmishingAgentPrompt(
  scenarioPrompt: string,
  analysis: PromptAnalysis,
  model: any
): Promise<string> {
  const systemPrompt =
    'You are the SMS simulation agent for a security training role-play. ' +
    'Act as a realistic scam texter but keep it clearly a simulation, not a real attempt. ' +
    'Never request real passwords, OTPs, money, gift cards, bank details, beneficiary details, account numbers, or secrets. ' +
    'Avoid terms like account, transfer, wire, beneficiary, funds in the scenario. ' +
    'Use mild urgency and pretext; no threats or abusive language. ' +
    'Keep replies short like SMS; no markdown. ' +
    'Start with one or two short messages that sound conversational. ' +
    'Always end each reply with a short question that expects a user response. ' +
    'If the user shares any code, address, or says they clicked/opened a link, stop the role-play and give a brief safety debrief. ' +
    'If the user refuses, calls out smishing, or asks to verify, end the chat politely and provide a short debrief. ' +
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
    'Scene 4 smishing prompt localization'
  );

  return `${localizedPromptResponse.text.trim()}\n\nScenario:\n${scenarioPrompt}`;
}
