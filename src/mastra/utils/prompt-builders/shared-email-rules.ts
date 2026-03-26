/**
 * Shared Email Prompt Rules
 * Common rules used across phishing email and landing page prompts
 * Centralized to avoid redundancy and ensure consistency
 */

import { PHISHING_EMAIL } from '../../constants';

/**
 * QR code image tag for quishing emails (single source of truth)
 */
export const QR_CODE_IMG_TAG = `<img src='{QRCODEURLIMAGE}' alt='QR Code' style='display:block; width:${PHISHING_EMAIL.QR_CODE_IMAGE_WIDTH_PX}px; height:auto; margin:0 auto;'>`;

/**
 * Authorization context for phishing simulations
 */
export const AUTH_CONTEXT = `**IMPORTANT CONTEXT:**
This is an AUTHORIZED, LEGAL, and EDUCATIONAL exercise for corporate security awareness training. This is a defensive security measure to protect organizations from cybercrime.`;

/**
 * Clarity, accessibility, and cultural safeguards (analysis-only)
 */
export const CLARITY_ACCESSIBILITY_POLICY = `**Clarity & Cultural Safeguards:** Ensure analysis is clear, neutral, and policy-compliant while preserving technical accuracy; align with WCAG accessibility guidance where relevant; keep AI actions/messages explainable (OECD/EU fairness); keep language culturally appropriate and respectful.`;

/**
 * Logo tag rule for emails and landing pages
 */
export const LOGO_TAG_RULE = `**Company Logo:** Include logo using \`{CUSTOMMAINLOGO}\` tag (never generate URLs directly).
- Format: \`<img src='{CUSTOMMAINLOGO}' alt='Company Logo' width='96' height='96' style='display:block; margin:0 auto; object-fit: contain;'>\``;

/**
 * No disclaimers rule
 */
export const NO_DISCLAIMERS_RULE = `**NO DISCLAIMERS:**
- Do NOT include footer notes, explanations, or disclaimers like "This is a phishing link" or "Generated for training"
- Output RAW email content only - no meta-commentary`;

/**
 * Email signature rules - no personal names
 */
export const EMAIL_SIGNATURE_RULES = `**Email Signature:**
- Format: Team/Department Name + Email Address (see No Fake Personal Identities rule)
- Closing phrase (e.g. "Best regards") MUST be in the output language. Do NOT use English closings in non-English emails.
- Outlook-critical: Signature must be in its own \`<tr><td>\` with padding (never \`<div>\`).
- Example: "<tr><td style='padding-top:16px; padding-left:20px; padding-right:20px;'>Best regards,<br>Security Notifications Team<br>security@company.com</td></tr>"`;

/**
 * No fake personal identities rule (phishing-only safeguard)
 * Prevents models from inventing human identities (names/surnames) anywhere in outputs.
 */
export const NO_FAKE_PERSONAL_IDENTITIES_RULES = `**No Fake Personal Identities:**
- Do not invent or include personal names (first/last names) anywhere (subject/body/footer/signature/landing pages)
- Personalization must use merge tags only (e.g., {FIRSTNAME}, {FULLNAME})
- If you must reference a person, use role/team labels only (e.g., "HR Team", "IT Support", "Finance Department", "Your Manager")`;

/**
 * Table-based layout rules for Outlook compatibility
 */
export const TABLE_LAYOUT_RULES = `**Body (HTML) - Outlook/Gmail Compatible:**
- Use TABLE-BASED layout (no divs for main structure)
- Main table: width='100%' with style='max-width: ${PHISHING_EMAIL.EMAIL_TABLE_MAX_WIDTH_PX}px; margin: 0 auto; border-collapse: separate;'
- **PADDING RULE:** NEVER put padding on <table>. ALWAYS put padding on <td> elements. Content <td> must have horizontal padding (min 20px left/right).
  ❌ Wrong: <table style='padding:32px'> (padding on table, never on <table>)
  ❌ Wrong: <td style='padding-top:12px;'> (missing left/right — content <td> must have horizontal padding)
  ✅ Correct: <td style='padding:32px'> OR <td style='padding: 12px 24px;'>
- **BORDER RULE:** Always use border-collapse: separate on tables for better spacing control
- INLINE CSS only (no style blocks), web-safe fonts (Arial, sans-serif)
- No Flexbox/Grid (breaks Outlook). Must look professional and authentic.
- **PARAGRAPH RULE:** Use <p> for each body paragraph — NEVER raw text + <br><br> as paragraph breaks.
  ❌ Wrong: Hello {FIRSTNAME},<br><br>We have detected...<br><br>Please log in.
  ✅ Correct: <p style='margin:0 0 14px 0;'>Hello {FIRSTNAME},</p><p style='margin:0 0 14px 0;'>We have detected...</p>
- **TYPOGRAPHY:** Use clear size hierarchy — greeting slightly larger/bolder than body, footer smallest. Never same font-size everywhere.
- **CARD STYLING:** No box-shadow (Outlook ignores it). Use border: 1px solid #e2e8f0 instead. Max border-radius: 8px.`;

/**
 * Layout strategy options (Card vs Letter)
 */
export const LAYOUT_STRATEGY_RULES = `**LAYOUT STRATEGY:**
* **OPTION A: Transactional Card (DEFAULT)** - Use unless CEO/HR/Policy memo
  - Background: Light gray (#f3f4f6), outer td padding: 20px
  - Content: Centered WHITE card with rounded corners and subtle border. **Inner card table:** max-width: ${PHISHING_EMAIL.EMAIL_CARD_MAX_WIDTH_PX}px (NOT 420px — that is too narrow for email content).
  - **Text alignment:** Greeting, body paragraphs, and signature MUST be left-aligned (text-align: left). Only logo and CTA button may be centered. Professional emails are never fully centered.
  - Best for: Password Reset, Order, Security Alert, E-commerce
* **OPTION B: Corporate Letter** - For formal internal communications
  - Background: Full White (#ffffff), no card box
  - **IMPORTANT:** Container MUST still be CENTERED in the viewport (Outlook-safe table centering). Only the letter text can be left-aligned.
  - text-align: left (inside the centered container). Best for: Policy Update, CEO Message, HR Announcement`;

/**
 * Preheader rule for inbox preview
 */
export const PREHEADER_RULE = `**Preheader:**
- Add a hidden <div> at the very top of the body containing a short summary (${PHISHING_EMAIL.PREHEADER_WORD_COUNT.min}-${PHISHING_EMAIL.PREHEADER_WORD_COUNT.max} words) that appears in the inbox preview. Style: display:none;`;

/**
 * Greeting and personalization rules
 */
export const GREETING_RULES = `**Greeting:**
- Must include {FIRSTNAME} or {FULLNAME} — never generic ("Dear Employee", "Dear User", "Hi Team").
- Validate before output: fix if merge tag is missing.`;

/**
 * Mobile optimization rules
 */
export const MOBILE_OPTIMIZATION_RULES = `**Mobile:** Buttons min-height 32px (tappable). Table width 100% with max-width ${PHISHING_EMAIL.EMAIL_TABLE_MAX_WIDTH_PX}px.`;

/**
 * Merge tags rules for dynamic variables
 */
export function getMergeTagsRules(includeQRCode = false): string {
  const qrTag = includeQRCode ? `, \`{QRCODEURLIMAGE}\`` : '';
  return `**Merge Tags:**
- **Required:** ${PHISHING_EMAIL.MANDATORY_TAGS.map(tag => `\`${tag}\``).join(', ')}, \`{FIRSTNAME}\`${qrTag}
- **Recommended:** ${PHISHING_EMAIL.RECOMMENDED_TAGS.map(tag => `\`${tag}\``).join(', ')}
- ONLY use tags from Available list - DO NOT invent new tags
- Never use real names - only merge tags for personalization
- All links/buttons MUST use {PHISHINGURL} in href - never hardcode URLs
- **Available:** ${PHISHING_EMAIL.MERGE_TAGS.map(tag => `"${tag}"`).join(', ')}`;
}

/**
 * Brand awareness rules for email generation
 */
export const BRAND_AWARENESS_RULES = `**Brand Awareness:**
If scenario mentions a specific brand (e.g., "Amazon", "Microsoft"):
- Match their authentic email tone, terminology, and notification patterns
- Reference their actual services/products users would recognize
- Brand name must appear at least once in subject or body`;

/**
 * Syntax rule for HTML attributes
 */
export const SYNTAX_RULE = `- **SYNTAX RULE:** Use **SINGLE QUOTES** for HTML attributes (e.g. style='color:red') to prevent JSON escaping errors.`;

/**
 * Footer rules for emails
 */
export const FOOTER_RULES = `**Footer (authentic):** Short support line + Unsubscribe link + Privacy Policy link. All links use {PHISHINGURL}. Include copyright (© {CURRENT_DATE} {COMPANYNAME}).
- Style: style='text-align: center; padding: 20px; font-size: 12px; color: #9ca3af; font-family: Arial, sans-serif;'`;

/**
 * Landing page logo rule (for phishing landing pages)
 * Centralized logo instruction to avoid redundancy across prompts
 */
export const LANDING_PAGE_LOGO_RULE = `**Logo (Mandatory):**
- Use \`{CUSTOMMAINLOGO}\` tag in all pages (never generate URLs directly)
- Format: \`<img src='{CUSTOMMAINLOGO}' alt='Company Logo' style='display:block; margin:0 auto; height:96px; object-fit:contain;' />\`
- Tag will be replaced with appropriate logo URL during post-processing`;

/**
 * QR code rules for landing pages (quishing scenarios)
 * Two versions: detailed for quishing, simple for normal phishing
 */
export const QUISHING_LANDING_PAGE_RULE = `**🚫 Quishing Landing Page:** No QR codes, no "scan"/"verify" text. Standard login/form page only (e.g., "Sign In", "Log In to Your Account"). Must look like a legitimate company page.`;

export const NO_QR_CODE_LANDING_PAGE_RULE = `**🚫 No QR Codes in Landing Pages:**
- Do NOT add QR codes to landing pages
- Landing pages are standard web forms (login, success, info pages)`;

/**
 * Greeting instruction with examples (for email generation)
 * Centralized to avoid duplication across quishing and normal phishing prompts
 */
export const GREETING_INSTRUCTION = (language: string) =>
  `**Write greeting first** - Must be in ${language} and include {FIRSTNAME} merge tag.
Examples: "Dear {FIRSTNAME}," / "Hello {FIRSTNAME}," / "Merhaba {FIRSTNAME}," (Turkish)
Never use "Dear Employee" or generic greetings without personalization tag.`;

/**
 * JSON output format instruction
 * Shared across all prompt types to avoid duplication
 */
export const JSON_OUTPUT_RULE = `**Output Format:**
Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation, just JSON.`;
