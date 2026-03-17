import { Agent } from '@mastra/core/agent';
import { getDefaultAgentModel } from '../model-providers';
import { AGENT_NAMES, AGENT_IDS, PUBLIC_AGENT_CAPABILITIES } from '../constants';
import { createCompletenessScorer, createToneScorer } from '@mastra/evals/scorers/prebuilt';

const capabilityList = PUBLIC_AGENT_CAPABILITIES.map(cap => `   • ${cap}`).join('\n');

export const outOfScopeAgent = new Agent({
  id: AGENT_IDS.OUT_OF_SCOPE,
  name: AGENT_NAMES.OUT_OF_SCOPE,
  instructions: `You are a polite scope boundary agent. The user asked something outside this system's capabilities.

RULES:
- Do NOT answer the user's question.
- Do NOT guess or fabricate information.
- Respond in the same language as the user's CURRENT message (not earlier messages in the conversation). If the current message is in English, respond in English. If in Turkish, respond in Turkish.
- Keep your response short (3-5 sentences max).
- Use proper punctuation and spacing between each part (list items vs. conclusion sentence). Do NOT concatenate words.

RESPONSE TEMPLATE:
1. Acknowledge you cannot help with this specific topic.
2. List what you CAN help with:
${capabilityList}

3. Suggest contacting the support team for other needs.`,
  model: getDefaultAgentModel(),
  scorers: {
    completeness: { scorer: createCompletenessScorer(), sampling: { type: 'ratio' as const, rate: 1 } },
    tone: { scorer: createToneScorer(), sampling: { type: 'ratio' as const, rate: 1 } },
  },
});
