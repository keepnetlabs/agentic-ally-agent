/**
 * Shared Email Prompt Rules
 * Common rules used across phishing email and landing page prompts
 * Centralized to avoid redundancy and ensure consistency
 */

import { PHISHING_EMAIL } from '../../constants';

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
export const LOGO_TAG_RULE = `**Company Logo:**
- Every email must include a logo image using \`{CUSTOMMAINLOGO}\` tag
- Never generate logo URLs directly - only use the merge tag
- Format: \`<img src='{CUSTOMMAINLOGO}' alt='Company Logo' width='96' height='96' style='display:block; margin:0 auto; object-fit: contain;'>\`
- Tag will be replaced with appropriate logo URL during post-processing`;

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
- Never use personal names in signature (like "Emily Clarke", "John Smith", "Sarah Johnson")
- Use only department/team/system names:
  ✅ Correct: "Security Notifications Team", "IT Support Team", "Customer Service", "Microsoft Account Team", "Automated System"
  ❌ Wrong: "Emily Clarke", "John from IT", "Sarah - Support"
- Signature format: Team Name + Email Address
- Padding rule (Outlook-critical): Signature must be wrapped in its own \`<tr><td>\` block with padding. Never use \`<div>\` padding for signatures.
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
  ✅ Correct: <p style='margin:0 0 12px 0;'>Hello {FIRSTNAME},</p><p style='margin:0 0 12px 0;'>We have detected...</p>`;

/**
 * Layout strategy options (Card vs Letter)
 */
export const LAYOUT_STRATEGY_RULES = `**LAYOUT STRATEGY:**
* **OPTION A: Transactional Card (DEFAULT)** - Use unless CEO/HR/Policy memo
  - Background: Light gray (#f3f4f6), outer td padding: 20px
  - Content: Centered WHITE card with rounded corners and shadow. **Inner card table:** max-width: ${PHISHING_EMAIL.EMAIL_CARD_MAX_WIDTH_PX}px (NOT 420px — that is too narrow for email content).
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
- Must start with a greeting in the output language and include {FIRSTNAME}.
  - English examples: "Dear {FIRSTNAME}," or "Hello {FIRSTNAME},"
  - Turkish examples: "Merhaba {FIRSTNAME}," or "Sayın {FIRSTNAME},"
- Never use: "Dear Employee," "Dear User," "Hi Team" (use personalization tags)
- Validate before output: greeting must contain {FIRSTNAME} or {FULLNAME}. Fix if missing.`;

/**
 * Mobile optimization rules
 */
export const MOBILE_OPTIMIZATION_RULES = `**Mobile Optimization:**
- Main table width: 100% (max-width: ${PHISHING_EMAIL.EMAIL_TABLE_MAX_WIDTH_PX}px).
- Buttons: **MUST be easily tappable on mobile** (min-height 32px) for optimal user experience.`;

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
export const FOOTER_RULES = `**Footer (authentic):** Add a short support line and one legal link. All footer links must use {PHISHINGURL} in href attribute.
- Footer <td> must have: style='text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;'`;

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
export const QUISHING_LANDING_PAGE_RULE = `**🚫 Quishing Landing Page - No QR Code References:**
- Landing pages must NOT contain QR codes
- Landing pages are standard forms (login, success, info) with zero mention of QR codes
- Do NOT reference "QR Code", "scan", "verify", or any QR-related text in headings/descriptions
- Use normal login headings: "Sign In", "Log In to Your Account", "Enter Your Credentials"
- Landing page must look like a legitimate company login page (no quishing indicators)`;

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
