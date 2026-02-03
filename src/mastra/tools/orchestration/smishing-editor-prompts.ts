type SmsPromptInput = {
  messages: string[];
};

export function getSmishingSmsSystemPrompt(mode: string): string {
  return `You are editing an SMS template for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

CRITICAL RULES:
1. PRESERVE placeholder tags: {PHISHINGURL}
2. Keep messages short and realistic (<= 160 chars each)
3. Output 2-4 messages unless user requests fewer
4. Do NOT add markdown or labels
5. Do NOT add real links, only use {PHISHINGURL}
${mode === 'translate' ? '6. TRANSLATE MODE: Only translate visible text. Preserve placeholders and structure.' : '6. EDIT MODE: Update tone, urgency, and wording as requested.'}

OUTPUT FORMAT - JSON ONLY:
{"messages":["...","..."],"summary":"Brief summary of changes"}
`;
}

export function getSmishingSmsUserPrompt(input: SmsPromptInput, escapedInstruction: string): string {
  const messagesBlock = input.messages.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n');

  return `CURRENT SMS:
Messages:
${messagesBlock}

USER INSTRUCTION: "${escapedInstruction}"

Apply the instruction above and return JSON only.`;
}

export function getSmishingLandingPageSystemPrompt(mode: string): string {
  return `You are editing a smishing landing page for CYBERSECURITY TRAINING.

CRITICAL RULES:
1. PRESERVE HTML structure and design (colors, spacing, layout)
2. EDIT page content based on user instruction
3. PRESERVE all form elements and functionality
${mode === 'translate' ? '4. TRANSLATE MODE: For <input>, <select>, <textarea>, <button> preserve existing style/class attributes exactly. Only translate visible text, labels, and placeholders.' : '4. If instruction is translation/localization, preserve existing layout and CSS.'}
5. Only SKIP editing if user explicitly said "sms only" or "text message only"
6. Return COMPLETE page HTML (never empty or truncated)
7. All HTML attributes must use SINGLE quotes (style='...', class='...', etc.)
8. If instruction is to "remove logo", remove only the img tag
9. If instruction is to "change logo", REPLACE the src attribute. DO NOT add a second img tag
10. PRESERVE {PHISHINGURL} in links. Do NOT replace with real URLs
11. ONLY use image URLs provided in instructions or existing in the template. NEVER generate new URLs

OUTPUT FORMAT - JSON ONLY:
{"type":"login","template":"<html>...complete HTML...</html>","edited":true,"summary":"Description of changes"}
`;
}

export function getSmishingLandingPageUserPrompt(
  page: { type?: string; template?: string },
  escapedInstruction: string,
  brandContext: string
): string {
  return `CURRENT LANDING PAGE:
Type: ${page.type || 'unknown'}

TEMPLATE:
${page.template || ''}

USER INSTRUCTION: "${escapedInstruction}"
${brandContext ? `\n${brandContext}\nIMPORTANT: You MUST use the logo URL provided above.` : ''}

Apply the instruction and return JSON only.
PRESERVE {PHISHINGURL} in all links.`;
}
