import { SimulatedEmail } from '../../types/microlearning';

export function getIntentClassificationPrompt(editInstruction: string): string {
    return `Analyze the following instruction: "${editInstruction}".
Determine if the user is explicitly asking to use THEIR OWN company/organization logo (internal branding), as opposed to a public external brand (like Google, Microsoft, Amazon).
Examples of Internal: "Use my logo", "our company brand", "kendi logomuz", "notre logo", "corp identity".
Examples of External: "Use Google logo", "Microsoft branding", "Amazon style".

Return JSON ONLY: { "isInternalBrandRequest": boolean }`;
}

export function getPhishingEditorSystemPrompt(): string {
    return `You are editing a phishing email template for a LEGITIMATE CYBERSECURITY TRAINING COMPANY.

CRITICAL RULES:
1. ✅ PRESERVE all merge tags: {FIRSTNAME}, {PHISHINGURL}, {CUSTOMMAINLOGO}
2. ✅ PRESERVE HTML structure and design (colors, spacing, layout)
3. ✅ Update: Text content, tone, urgency, language, psychological triggers
4. ✅ Validate that the result is complete HTML, not truncated
5. ✅ All HTML attributes must use SINGLE QUOTES (e.g., style='color:red;', class='header')
6. ✅ If instruction is to "remove logo", remove only the img tag, keep {CUSTOMMAINLOGO} tag in comments
7. ✅ If instruction is to "change logo", REPLACE the src attribute. DO NOT add a second img tag.
8. ✅ PRESERVE {PHISHINGURL} in all Call-to-Action buttons and links. Do NOT replace with real URLs.
9. ✅ ONLY use image URLs provided in instructions or existing in the template. NEVER generate new image URLs from external domains (like wikipedia, example.com).

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
1. ✅ PRESERVE HTML structure and design (colors, spacing, layout)
2. ✅ EDIT page content based on user instruction
3. ✅ PRESERVE all form elements and functionality
${mode === 'translate' ? `4. ✅ **TRANSLATE MODE:** For <input>, <select>, <textarea>, <button> preserve existing style/class attributes exactly. Only translate visible text, labels, and placeholders.` : `4. ✅ If instruction is translation/localization, preserve existing layout and CSS.`}
5. ✅ Only SKIP editing if user explicitly said "email only" or "email template only"
6. ✅ Return COMPLETE page HTML (never empty or truncated)
7. ✅ All HTML attributes must use SINGLE QUOTES (style='...', class='...', etc.)
8. ✅ If instruction is to "remove logo", remove only the img tag
9. ✅ If instruction is to "change logo", REPLACE the src attribute. DO NOT add a second img tag
10. ✅ PRESERVE {PHISHINGURL} in links. Do NOT replace with real URLs
11. ✅ ONLY use image URLs provided in instructions or existing in the template. NEVER generate new URLs

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
    return `CURRENT LANDING PAGE:
Type: ${page.type || 'unknown'}

TEMPLATE:
${page.template || ''}

---
USER INSTRUCTION: "${escapedInstruction}"
${brandContext ? `\n${brandContext}\nIMPORTANT: You MUST use the logo URL provided above.` : ''}
---

Apply the instruction and return the JSON response.
PRESERVE {PHISHINGURL} in all links.`;
}
