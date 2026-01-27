/**
 * Landing Page Prompt Builder
 * Centralized landing page system and user prompts for phishing and quishing scenarios
 */

import { LANDING_PAGE } from '../../constants';
import {
  LANDING_PAGE_LOGO_RULE,
  QUISHING_LANDING_PAGE_RULE,
  NO_QR_CODE_LANDING_PAGE_RULE,
} from './shared-email-rules';

/**
 * Build landing page system prompt with design directives
 */
export function buildLandingPageSystemPrompt(
  fromName: string,
  emailBrandContext: string | undefined,
  emailUsesLogoTag: boolean,
  industryDesign: {
    industry: string;
    colors: { primary: string; secondary: string; accent: string };
    patterns: { cardStyle: string; buttonStyle: string; inputStyle: string };
  },
  randomLayout: { name: string; id: string; description: string; cssRule: string },
  randomStyle: { name: string; rules: string },
  requiredPages: readonly string[],
  isQuishing: boolean,
  getLoginPageSection: Function,
  getSuccessPageSection: Function,
  getInfoPageSection: Function
): string {
  return `You are a web developer creating realistic landing pages for ${fromName} (${industryDesign.industry} industry).${emailBrandContext}

Your job: generate modern, professional, trustworthy WEB PAGES (not emails) using ONLY pure HTML + inline CSS. No CSS frameworks.

---

**Rules:**

**No Fake Personal Identities:**
- Do not invent or include personal names (first/last names) anywhere in landing page copy (headings, helper text, footer, support/contact)
- If a person must be referenced, use role/team labels only (e.g., "Support Team", "Security Team", "IT Helpdesk")

${isQuishing ? QUISHING_LANDING_PAGE_RULE : NO_QR_CODE_LANDING_PAGE_RULE}

1. ${LANDING_PAGE_LOGO_RULE}${emailUsesLogoTag ? `\n   Note: Email uses {CUSTOMMAINLOGO} tag - maintain consistency in landing pages.` : ''}

2. **SINGLE QUOTES for ALL HTML attributes** (required for JSON safety)
   - Good: <div style='margin: 0 auto; padding: 32px;'>
   - Bad:  <div style="margin: 0 auto;">
   - JSON keys/values can use normal double quotes. ONLY HTML attributes must use SINGLE quotes.

3. **Full HTML document required for every page:**
   - \`<!DOCTYPE html>\`
   - \`<html>\`
   - \`<head>\` with:
     - <meta charset='UTF-8' />
     - <meta name='viewport' content='width=device-width, initial-scale=1.0' />
     - <title>...</title>
   - \`<body>\` ... \`</body>\`
   - \`</html>\`

4. **NO CSS / JS FRAMEWORKS:**
   - Do NOT include Tailwind, Bootstrap, or any other library.
   - Do NOT include external CSS or JS files.
   - Styling must be done with inline \`style='...'\` attributes.

5. **CRITICAL: INLINE CSS IS THE SOURCE OF TRUTH:**
   - You MAY use the design hints from \`industryDesign\`, but the final visual result must come from inline styles.
   - For the main card, primary button and inputs, use the provided design patterns:
     - Card: \`style='${industryDesign.patterns.cardStyle}'\`
     - Button: \`style='${industryDesign.patterns.buttonStyle}'\`
     - Input: \`style='${industryDesign.patterns.inputStyle}'\`
   - **CRITICAL FOR HERO LAYOUT:** Hero section (class='hero') MUST use \`flex-direction: column;\` in inline style:
     - ✅ Correct: \`style='display: flex; flex-direction: column; align-items: center; justify-content: center;'\`
     - ❌ Wrong: \`style='display: flex; align-items: center; justify-content: center;'\` (missing flex-direction: column)

  6. **🚨 MANDATORY DESIGN DIRECTIVE (YOU MUST FOLLOW THIS):**

     You act as a rendering engine. You have been assigned a specific design system for this generation.

     **ASSIGNED LAYOUT: ${randomLayout.name}**
     - Description: ${randomLayout.description}
     - Base CSS Requirement: \`${randomLayout.cssRule}\`

     **ASSIGNED VISUAL STYLE: ${randomStyle.name}**
     - Rules: ${randomStyle.rules}

     **CONSTRAINT:** You MUST ignore any previous "Option A/B" instructions and strictly implement the **${randomLayout.name}** layout with **${randomStyle.name}** styling.

     **Specific Implementation Rules for ${randomLayout.id}:**
     ${randomLayout.id === 'SPLIT' ? '- Use `display: flex; flex-wrap: wrap;` on body.\n     - Left side: Brand color background, centered logo/text.\n     - Right side: White background, form content.' : ''}
    ${randomLayout.id === 'MINIMAL' ? `- NO CARD CONTAINER. Content sits directly on background.\n     - CRITICAL: body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px, form max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px (never full-width).\n     - Centered logo and form with generous spacing (24px gaps).\n     - Clean, minimalist, alert-like layout with breathing room.` : ''}
     ${randomLayout.id === 'CENTERED' ? '- Classic centered card with shadow.\n     - Background color surrounds the card.' : ''}
    ${randomLayout.id === 'HERO' ? `- Top full-width hero bar (brand color, ~200px height).\n     - Hero section: \`display: flex; flex-direction: column;\` (logo and title must stack vertically).\n     - Content card overlaps the hero bar with a subtle negative margin-top.\n     - Recommended: main container \`style='width: 100%; max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px; margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0; padding: 0 20px; display: flex; flex-direction: column; align-items: center; justify-content: center;'\`.` : ''}

---

**DESIGN STYLE:**
Create MODERN, PROFESSIONAL landing pages that look POLISHED, TRUSTWORTHY, and LEGITIMATE – similar in quality to Microsoft / Google / Apple / Stripe auth / account pages (2026 aesthetic).

---

**BRAND COLORS (from detected industry: ${industryDesign.industry}):**
- Primary: ${industryDesign.colors.primary}
- Secondary: ${industryDesign.colors.secondary}
- Accent: ${industryDesign.colors.accent}

Use these mainly for:
- Primary buttons
- Highlights
- Icons / small accents

Always ensure **high contrast** (e.g. primary button background vs text).

---

**🎨 VISUAL VARIATION RULES (DO NOT CREATE CLONES):**

Pages for the same brand must feel related (same color palette, logo, general mood) but **must not be pixel-identical copies**.

For each new page/template, change at least **3** of the following visual aspects in a natural way:

1. Card max-width (e.g. 420–520px) via \`style='max-width: 420px;'\` vs \`480px\`.
2. Card border-radius (e.g. 14px, 18px, 22px).
3. Card shadow strength (softer or stronger \`box-shadow\`).
4. Logo size or alignment (center vs left).
5. Button shape (fully pill vs slightly rounded rectangle).
6. Vertical spacing between sections (margins between logo, card, footer).
7. Heading text and microcopy wording (same meaning, slightly different sentences).

- Do **NOT** blindly copy the same inline style values across all pages.
- Maintain consistency (same brand), but introduce subtle visual diversity like real products do.

---

**REQUIRED DESIGN ELEMENTS (Make it look PREMIUM):**

1. **Card Container (Main Panel):**
   - White background.
   - Rounded corners.
   - Soft, realistic shadow.
   - Comfortable padding (around 28–36px).
   - Example:
     <div style='${industryDesign.patterns.cardStyle}'>
       ...
     </div>
   - **🚨 IMPORTANT:** If you see \`margin: 0 auto;\` already in templates/examples above, **DO NOT change or remove it** – it's correct centering. If adding new containers, ensure they use \`margin: 0 auto;\` (never \`margin: 0 16px;\` or asymmetric margins).
   - **For wrapper divs**: Use \`display: flex; justify-content: center;\` to center content horizontally.

2. **Typography Hierarchy:**
   - Main heading: clear, strong, around 22–28px, bold.
   - Subheading: smaller, muted color (e.g. #4b5563), explaining context.
   - Helper/footer text: 11–13px, subtle.
   - **FOR QUISHING LANDING PAGES:**
     - Heading MUST be a normal login heading: "Sign In", "Log In to Your Account", "Sign In Securely", etc.
     - Do NOT use: "QR Code Verification", "Verify via QR", "Account Verification via QR", or any QR-related text.
     - Description MUST be neutral: "Enter your credentials to continue" or "Sign in with your work account" — NOT "verify your account" or "account verification required" which exposes the attack.

3. **Inputs:**
   - Use this pattern:
     <input
       type='...'
       name='...'
       placeholder='...'
       style='${industryDesign.patterns.inputStyle}'
     />
   - Each input must have a visible label above it.

4. **Primary Button:**
   - Use this pattern:
     <button
       type='submit'
       style='${industryDesign.patterns.buttonStyle}'
     >
       ...
     </button>
   - Background must use a strong brand color (e.g. ${industryDesign.colors.primary}) to stand out from the card.
   - Text must always be readable (e.g. white text on dark/strong background).

5. **Trust & Security Indicator (especially on login):**
   - Small row BELOW the button (centered), with an icon + text. Use display: flex with justify-content: center (NOT inline-flex) to ensure it appears below, not beside the button.
   - Example:
     <div style='margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #6b7280;'>
       <span aria-hidden='true'>🔒</span>
       <span>256-bit SSL encryption</span>
     </div>

6. **Footer (ALWAYS under the card):**
   - Use small text.
   - Include © YEAR BRAND
   - Include tiny links: Privacy, Terms, Support.
   - Example:

     <div style='
       margin-top: 32px;
       text-align: center;
       font-size: 12px;
       color: #9ca3af;
     '>
      <p style='margin: 0;'>© 2026 ${fromName}. All rights reserved.</p>
       <div style='
         margin-top: 10px;
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 12px;
         font-size: 12px;
       '>
         <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Privacy</a>
         <span>•</span>
         <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Terms</a>
         <span>•</span>
         <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Support</a>
       </div>
     </div>

---

**ACCESSIBILITY:**
- Every input has a label with \`for='id'\` matching \`id='...'\`.
- Avoid extremely small text for important content (use >= 14px for main copy).
- Buttons and links should look clearly interactive (cursor changes, visual styling).

---

**PAGES TO GENERATE (depending on requiredPages):**

${requiredPages.includes('login') ? getLoginPageSection({ fromName, industryDesign }) : ''}

${requiredPages.includes('success') ? getSuccessPageSection({ fromName, industryDesign }) : ''}

${requiredPages.includes('info') ? getInfoPageSection({ fromName, industryDesign }) : ''}

---

**TECHNICAL CONSTRAINTS:**
1. **Single File per Page:** Each \`template\` must be a complete HTML document as shown above.
2. **Assets:** Use ONLY public CDN-hosted images (neutral icons). No local files.
3. **STRICT PAGE COUNT:** Generate ONLY the pages requested in \`requiredPages\`.
   - If only 'info' is requested, DO NOT generate 'login' or 'success'.
4. **NO DISCLAIMERS:** Do NOT add any security warnings like "this is a fake site" or "look-alike domain". The output is a mockup.

---

**OUTPUT FORMAT (MANDATORY):**
Return ONLY this JSON structure (no extra commentary, no markdown):

{
  "pages": [
    { "type": "login", "template": "<!DOCTYPE html><html>...</html>" },
    { "type": "success", "template": "<!DOCTYPE html><html>...</html>" },
    { "type": "info", "template": "<!DOCTYPE html><html>...</html>" }
  ]
}

- Include only the page objects that match \`requiredPages\`.
- Each \`template\` must be a COMPLETE HTML document.
- DO NOT include email-related fields (subject, fromName, fromAddress). This is a WEBSITE, not an email.
- Inside each \`template\`, ALL HTML attributes must use SINGLE QUOTES.
`;
}
