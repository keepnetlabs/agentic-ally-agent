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
 * Zero PII Policy - prevents real names in outputs
 */
export const ZERO_PII_POLICY = `**🔒 ZERO PII POLICY (STRICT):**
- **Target:** Always refer to the target as "The User", "The Employee", or "Target".
- **Input Data:** Even if the input contains real names, do NOT output them in your analysis description or target audience profile.
- **Persona:** Invent generic personas (e.g., "Finance Manager") instead of using real names.`;

/**
 * Logo tag rule for emails and landing pages
 */
export const LOGO_TAG_RULE = `**Company Logo (MANDATORY):**
- Every email MUST include a logo image using \`{CUSTOMMAINLOGO}\` tag
- Never generate logo URLs directly - only use the merge tag
- Format: \`<img src='{CUSTOMMAINLOGO}' alt='Company Logo' width='64' height='64' style='display:block; margin:0 auto; object-fit: contain;'>\`
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
export const EMAIL_SIGNATURE_RULES = `**EMAIL SIGNATURE RULES:**
- **FORBIDDEN:** Do NOT use personal names in signature (like "Emily Clarke", "John Smith", "Sarah Johnson").
- **REQUIRED:** Use ONLY department/team/system names:
  ✅ Correct: "Security Notifications Team", "IT Support Team", "Customer Service", "Microsoft Account Team", "Automated System"
  ❌ Wrong: "Emily Clarke", "John from IT", "Sarah - Support"
- Signature format: Team Name + Email Address
- Example: "Best regards,<br>Security Notifications Team<br>security@company.com"`;

/**
 * Table-based layout rules for Outlook compatibility
 */
export const TABLE_LAYOUT_RULES = `**Body (HTML) - Outlook/Gmail Compatible:**
- Use TABLE-BASED layout (no divs for main structure)
- Main table: width='100%' with style='max-width: 600px; margin: 0 auto;'
- **PADDING RULE:** NEVER put padding on <table>. ALWAYS put padding on <td> elements.
  ❌ Wrong: <table style='padding:32px'>
  ✅ Correct: <td style='padding:32px'>
- INLINE CSS only (no style blocks), web-safe fonts (Arial, sans-serif)
- No Flexbox/Grid (breaks Outlook). Must look professional and authentic.`;

/**
 * Layout strategy options (Card vs Letter)
 */
export const LAYOUT_STRATEGY_RULES = `**LAYOUT STRATEGY:**
* **OPTION A: Transactional Card (DEFAULT)** - Use unless CEO/HR/Policy memo
  - Background: Light gray (#f3f4f6), outer td padding: 20px
  - Content: Centered WHITE card with rounded corners and shadow
  - text-align: center. Best for: Password Reset, Order, Security Alert, E-commerce
* **OPTION B: Corporate Letter** - For formal internal communications
  - Background: Full White (#ffffff), no card box
  - text-align: left. Best for: Policy Update, CEO Message, HR Announcement`;

/**
 * Preheader rule for inbox preview
 */
export const PREHEADER_RULE = `**PREHEADER (MANDATORY):**
- Add a hidden <div> at the VERY TOP of the body containing a short summary (10-15 words) that appears in the inbox preview. Style: display:none;`;

/**
 * Greeting and personalization rules
 */
export const GREETING_RULES = `**GREETING (CRITICAL):**
- MUST start with "Dear {FIRSTNAME}," or "Hello {FIRSTNAME}," - never generic greetings
- FORBIDDEN: "Dear Employee," "Dear User," "Hi Team"
- Validate before output: greeting must contain {FIRSTNAME} or {FULLNAME}. Fix if missing.`;

/**
 * Mobile optimization rules
 */
export const MOBILE_OPTIMIZATION_RULES = `**MOBILE OPTIMIZATION (MANDATORY):**
- Main table width: 100% (max-width: 600px).
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
export const BRAND_AWARENESS_RULES = `**BRAND AWARENESS (CRITICAL):**
If scenario mentions a specific brand (e.g., "Amazon", "Microsoft"):
- Match their authentic email tone, terminology, and notification patterns
- Reference their actual services/products users would recognize
- Brand name MUST appear at least once in subject OR body`;

/**
 * Syntax rule for HTML attributes
 */
export const SYNTAX_RULE = `- **SYNTAX RULE:** Use **SINGLE QUOTES** for HTML attributes (e.g. style='color:red') to prevent JSON escaping errors.`;

/**
 * Footer rules for emails
 */
export const FOOTER_RULES = `**Footer (authentic):** Add a short support line and one legal link. **CRITICAL:** ALL footer links MUST use {PHISHINGURL} in href attribute.`;
