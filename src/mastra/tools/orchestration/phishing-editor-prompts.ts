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
3. ✅ PRESERVE all form elements and their functionality
4. ✅ Update: Text content, tone, urgency, language, psychological triggers
5. ✅ Validate that the result is complete HTML, not truncated
6. ✅ All HTML attributes must use SINGLE QUOTES (e.g., style='color:red;', class='header')
7. ✅ If instruction is to "remove logo", remove only the img tag, keep {CUSTOMMAINLOGO} tag in comments
8. ✅ If instruction is to "change logo", REPLACE the src attribute. DO NOT add a second img tag.
9. ✅ PRESERVE {PHISHINGURL} in all Call-to-Action buttons and links. Do NOT replace with real URLs.
10. ✅ ONLY use image URLs provided in instructions or existing in the template. NEVER generate new image URLs from external domains (like wikipedia, example.com).

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



export function getPhishingEmailUserPrompt(existingEmail: SimulatedEmail & { template: string }, escapedInstruction: string, brandContext: string): string {
    return `Edit this email template:

Subject: ${existingEmail.subject}
Body: ${existingEmail.template}

Instruction: "${escapedInstruction}"

${brandContext}
`;
}

export function getLandingPageSystemPrompt(mode: string): string {
    return `You are editing a phishing landing page for CYBERSECURITY TRAINING.

CRITICAL RULES:
1. ✅ PRESERVE HTML structure and design (colors, spacing, layout)
2. ✅ EDIT page content based on user instruction
3. ✅ PRESERVE all form elements and functionality
${mode === 'translate' ? `4. ✅ **TRANSLATE MODE - DO NOT CHANGE FORM CONTROL CSS:** For <input>, <select>, <textarea>, <button> you MUST preserve existing style/class attributes exactly. Only translate visible text, labels, and placeholders.` : `4. ✅ If instruction is translation/localization, preserve existing layout and CSS.`}
4. ✅ Only SKIP if user explicitly said "email only" or "email template only"
5. ✅ Return COMPLETE page HTML (never empty)
6. ✅ All HTML attributes must use SINGLE QUOTES (style='...', class='...', etc.)
7. ✅ If instruction is to "remove logo", remove only the img tag.
8. ✅ If instruction is to "change logo", REPLACE the src attribute. DO NOT add a second img tag.
9. ✅ PRESERVE {PHISHINGURL} in links. Do NOT replace with real URLs.
10. ✅ ONLY use image URLs provided in instructions or existing in the template. NEVER generate new image URLs from external domains (like wikipedia, example.com).

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

export function getLandingPageUserPrompt(page: any, escapedInstruction: string, brandContext: string): string {
    return `Edit landing page:

${JSON.stringify(page)}

Instruction: "${escapedInstruction}"

${brandContext}
${brandContext ? 'IMPORTANT: You MUST use the logo URL provided above. Do NOT use any other URL even if you think it is better.' : ''}

IMPORTANT: Edit UNLESS user explicitly said "email only" or similar exclusion.
PRESERVE {PHISHINGURL} in links.
Return ONLY the JSON object with no extra text.`;
}
