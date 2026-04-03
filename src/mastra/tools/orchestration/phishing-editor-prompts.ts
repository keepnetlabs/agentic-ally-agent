import { SimulatedEmail } from '../../types/microlearning';

export function getIntentClassificationPrompt(editInstruction: string): string {
  return `Analyze the following instruction: "${editInstruction}".
Classify the brand/logo intent:
1. Is the user asking to REMOVE or DELETE a logo/image entirely? (e.g., "remove logo", "logoyu kaldır", "delete the image", "supprimer le logo")
2. Is the user asking to use THEIR OWN company/organization logo (internal branding)? (e.g., "use my logo", "kendi logomuz", "notre logo")
3. Otherwise it is an external brand request (e.g., "Use Google logo", "Microsoft branding").

Return JSON ONLY: { "isRemovalRequest": boolean, "isInternalBrandRequest": boolean }`;
}

export function getPhishingEditorSystemPrompt(): string {
  return `You are editing a phishing email template for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

CRITICAL RULES:
1. PRESERVE all merge tags: {FIRSTNAME}, {PHISHINGURL}, {CUSTOMMAINLOGO}
2. PRESERVE HTML structure and design (colors, spacing, layout)
3. Update: Text content, tone, urgency, language, psychological triggers
4. Validate that the result is complete HTML, not truncated
5. All HTML attributes must use SINGLE QUOTES (e.g., style='color:red;', class='header')
6. If instruction is to "remove logo", remove only the img tag, keep {CUSTOMMAINLOGO} tag in comments
7. If instruction is to "change logo", REPLACE the src attribute. DO NOT add a second img tag.
8. PRESERVE {PHISHINGURL} in all Call-to-Action buttons and links. Do NOT replace with real URLs.
9. ONLY use image URLs provided in instructions or existing in the template. NEVER generate new image URLs from external domains (like wikipedia, example.com).

OUTPUT FORMAT - CRITICAL:
Return ONLY a valid JSON object. Do NOT include:
- Markdown code blocks (no \`\`\`json\`\`\`)
- Extra backticks or quotes
- Explanatory text
- Line breaks before/after JSON

EXACT JSON FORMAT:
{"subject":"New subject line here","template":"<html>...complete HTML...</html>","summary":"Brief 1-2 sentence summary"}

VALIDATION CHECKLIST BEFORE RETURNING:
✓ subject field: non-empty string
✓ template field: contains complete HTML (doctype, html, head, body tags)
✓ summary field: 1-2 sentence description of changes
✓ All HTML attributes use SINGLE quotes (style='...', class='...', id='...')
✓ Merge tags {FIRSTNAME}, {PHISHINGURL} are still present
✓ JSON is valid (matching braces and quotes)
✓ No markdown formatting or backticks
✓ No text before or after the JSON object`;
}

export function getPhishingEmailUserPrompt(
  existingEmail: SimulatedEmail & { template: string },
  escapedInstruction: string,
  brandContext: string
): string {
  return `CURRENT EMAIL:
Subject: ${existingEmail.subject}
From: ${existingEmail.sender || 'Unknown Sender'}

TEMPLATE:
${existingEmail.template}

---
USER INSTRUCTION: "${escapedInstruction}"
${brandContext ? `\n${brandContext}` : ''}
---

Apply the instruction above and return the JSON response.`;
}

export function getLandingPageSystemPrompt(mode: string): string {
  return `You are editing a phishing landing page for CYBERSECURITY TRAINING.

CRITICAL RULES:
1. PRESERVE HTML structure and design (colors, spacing, layout)
2. EDIT page content based on user instruction
3. PRESERVE all form elements and functionality
${mode === 'translate' ? `4. **TRANSLATE MODE:** For <input>, <select>, <textarea>, <button> preserve existing style/class attributes exactly. Only translate visible text, labels, and placeholders.` : `4. If instruction is translation/localization, preserve existing layout and CSS.`}
5. Only SKIP editing if user explicitly said "email only" or "email template only"
6. Return COMPLETE page HTML (never empty or truncated)
7. All HTML attributes must use SINGLE QUOTES (style='...', class='...', etc.)
8. If instruction is to "remove logo", remove only the img tag
9. If instruction is to "change logo", REPLACE the src attribute. DO NOT add a second img tag
10. PRESERVE {PHISHINGURL} in links. Do NOT replace with real URLs
11. ONLY use image URLs provided in instructions or existing in the template. NEVER generate new URLs
12. FORM CONSISTENCY: All sibling form labels, inputs, buttons, and helper text MUST share the same alignment and spacing. Never center one label while leaving others left-aligned
13. SCOPE & MINIMAL DIFF: Only change what the instruction asks for. Do NOT add, remove, or rearrange elements unrelated to the instruction. Each page is independent — never copy elements between pages

OUTPUT FORMAT - CRITICAL:
Return ONLY a valid JSON object. Do NOT include:
- Markdown code blocks (no \`\`\`json\`\`\`)
- Extra backticks or quotes
- Explanatory text
- Line breaks before/after JSON

EXACT JSON FORMAT:
{"type":"login","template":"<html>...complete HTML...</html>","edited":true,"summary":"Description of changes"}

VALIDATION CHECKLIST:
✓ type field: "login", "success", or "info"
✓ template field: complete HTML with all tags
✓ edited field: boolean (true if modified, false if unchanged)
✓ summary field: 1-2 sentence description
✓ All HTML attributes use SINGLE quotes
✓ JSON is valid and complete`;
}

export function getLandingPageUserPrompt(
  page: { type?: string; template?: string },
  escapedInstruction: string,
  brandContext: string
): string {
  const pageType = page.type || 'unknown';

  const PAGE_SCOPE_GUIDES: Record<string, string> = {
    login: 'This is a LOGIN page (has form inputs, labels, buttons). Apply form-related and visual edits here.',
    success: 'This is a SUCCESS/confirmation page (no login form). Do NOT add form fields, password inputs, or login elements that do not already exist on this page.',
    info: 'This is an INFO page (static content). Do NOT add form fields that do not already exist on this page.',
  };
  const scopeGuide = PAGE_SCOPE_GUIDES[pageType] || PAGE_SCOPE_GUIDES.info;

  return `CURRENT LANDING PAGE:
Type: ${pageType}
Scope: ${scopeGuide}

TEMPLATE:
${page.template || ''}

---
USER INSTRUCTION: "${escapedInstruction}"
${brandContext ? `\n${brandContext}\nIMPORTANT: You MUST use the logo URL provided above.` : ''}
---

Apply the instruction to THIS page only. If the instruction refers to elements that do not exist on this page (e.g., form fields on a success page), return the page unchanged with edited: false.
PRESERVE {PHISHINGURL} in all links.`;
}
