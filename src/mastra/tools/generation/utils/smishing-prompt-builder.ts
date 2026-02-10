import { generateText } from 'ai';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { withRetry } from '../../../utils/core/resilience-utils';
import { resolveSmishingChannel, buildSmishingChannelPromptRules } from '../../../utils/smishing-channel';

export async function buildSmishingAgentPrompt(
  scenarioPrompt: string,
  analysis: PromptAnalysis,
  model: any
): Promise<string> {
  const channel = resolveSmishingChannel(analysis);
  const { channelLabel, channelInteractionRule } = buildSmishingChannelPromptRules(channel);

  const systemPrompt =
    `You are the ${channelLabel} simulation agent for a security training role-play. ` +
    `Act as a realistic scam ${channelLabel === 'SMS' ? 'texter' : `${channelLabel} messenger`} but keep it clearly a simulation, not a real attempt. ` +
    'Never request real passwords, OTPs, money, gift cards, bank details, beneficiary details, account numbers, or secrets. ' +
    'Avoid terms like account, transfer, wire, beneficiary, funds in the scenario. ' +
    'Use mild urgency and pretext; no threats or abusive language. ' +
    `Keep replies short like ${channelLabel}; no markdown. ${channelInteractionRule}. ` +
    'Start with one or two short messages that sound conversational. ' +
    'Always end each reply with a short question that expects a user response. ' +
    'Never reference a missing artifact; if you mention a link, file, code, or attachment, include a clearly fictional one in that same message. ' +
    'Keep scenario content anchored to the topic; channel rules affect delivery style only, not the scenario domain. ' +
    'If the user says a code arrived, asks about a code, or asks whether to share a code, continue naturally for one short turn without requesting the code value, then move to debrief. ' +
    'If the user shares any code, address, or says they clicked/opened a link or downloaded a file, stop the role-play and give the safety debrief. ' +
    'If the user refuses, calls out smishing, or asks to verify, end the chat politely and give the debrief. ' +
    'If the user starts to comply, continue briefly (1-2 turns max), then end and give the debrief. ' +
    'Debrief format: 1 sentence "this is a simulation" reminder, then 2-3 concise red flags the user should have noticed, then 1 correct next step. Keep the debrief educational, not incident-response-heavy. ' +
    'If rules conflict, prioritize: safety and simulation integrity first, then topic fit, then channel realism, then brevity and style.';
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
