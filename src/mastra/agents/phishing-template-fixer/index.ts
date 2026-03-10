/**
 * Phishing Template Fixer Agents
 *
 * The public route stays the same, but the internal work is split:
 *   - phishingTemplateFixerAgent: email template rewrite + classification
 *   - phishingLandingPageClassifierAgent: landing page classification only
 */

import { Agent } from '@mastra/core/agent';
import { getDefaultAgentModel } from '../../model-providers';
import { AGENT_IDS, AGENT_NAMES } from '../../constants';
import {
  GLOBAL_INSTRUCTIONS,
  EMAIL_TEMPLATE_PROMPT,
  LANDING_PAGE_PROMPT,
} from './prompt';

// ============================================
// AGENT INSTRUCTIONS
// ============================================

const buildEmailTemplateInstructions = () => `${GLOBAL_INSTRUCTIONS}

TYPE FOR THIS AGENT:
- This agent handles ONLY type="email_template".
- If any other type appears, still follow the email_template output contract.

${EMAIL_TEMPLATE_PROMPT}

FINAL REMINDER:
- Return exactly: { fixed_html, change_log, tags, difficulty, from_address, from_name, subject }.
- Never return landing-page-only fields such as domain.`;

const buildLandingPageInstructions = () => `${GLOBAL_INSTRUCTIONS}

TYPE FOR THIS AGENT:
- This agent handles ONLY type="landing_page".
- Treat the provided HTML as classification input, not as HTML to rewrite.

${LANDING_PAGE_PROMPT}

FINAL REMINDER:
- Return exactly: { tags, difficulty, domain, change_log }.
- Never return email-only fields such as fixed_html, from_address, from_name, or subject.`;

// ============================================
// AGENT DEFINITION
// ============================================

export const phishingTemplateFixerAgent = new Agent({
  id: AGENT_IDS.PHISHING_TEMPLATE_FIXER,
  name: AGENT_NAMES.PHISHING_TEMPLATE_FIXER,
  description:
    'Analyzes phishing email templates and rewrites them for Outlook/Gmail/mobile compatibility. Returns fixed HTML plus phishing metadata.',
  instructions: buildEmailTemplateInstructions(),
  model: getDefaultAgentModel(),
});

export const phishingLandingPageClassifierAgent = new Agent({
  id: AGENT_IDS.PHISHING_LANDING_CLASSIFIER,
  name: AGENT_NAMES.PHISHING_LANDING_CLASSIFIER,
  description:
    'Analyzes phishing landing pages without rewriting HTML. Returns classification metadata including tags, difficulty, selected domain, and change log.',
  instructions: buildLandingPageInstructions(),
  model: getDefaultAgentModel(),
});
