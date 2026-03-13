/**
 * Landing Page Prompt Builder
 * Centralized landing page system and user prompts for phishing and quishing scenarios
 */

import { LANDING_PAGE } from '../../constants';
import { LANDING_PAGE_LOGO_RULE, QUISHING_LANDING_PAGE_RULE, NO_QR_CODE_LANDING_PAGE_RULE } from './shared-email-rules';

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
  const hasFormPages = requiredPages.includes('login') || requiredPages.includes('success');

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

3. **Full HTML document** for every page: \`<!DOCTYPE html>\`, \`<head>\` with charset + viewport + title, \`<body>\`. Follow template examples.

4. **NO external CSS/JS** — no Tailwind, Bootstrap, or libraries. Inline \`style='...'\` only.

5. **INLINE CSS IS THE SOURCE OF TRUTH:**
   - You MAY use the design hints from \`industryDesign\`, but the final visual result must come from inline styles.
   - For the main card${hasFormPages ? ', primary button and inputs' : ''}, use the provided design patterns:
     - Card: \`style='${industryDesign.patterns.cardStyle}'\`${hasFormPages ? `
     - Button: \`style='${industryDesign.patterns.buttonStyle}'\`
     - Input: \`style='${industryDesign.patterns.inputStyle}'\`` : ''}
   - **For HERO layout:** Hero section (class='hero') MUST use \`flex-direction: column;\` in inline style:
     - ✅ Correct: \`style='display: flex; flex-direction: column; align-items: center; justify-content: center;'\`
     - ❌ Wrong: \`style='display: flex; align-items: center; justify-content: center;'\` (missing flex-direction: column)

  6. **MANDATORY DESIGN DIRECTIVE:**

     You act as a rendering engine. You have been assigned a specific design system for this generation.

     **ASSIGNED LAYOUT: ${randomLayout.name}**
     - Description: ${randomLayout.description}
     - Base CSS Requirement: \`${randomLayout.cssRule}\`

     **ASSIGNED VISUAL STYLE: ${randomStyle.name}**
     - Rules: ${randomStyle.rules}

     **CONSTRAINT:** You MUST ignore any previous "Option A/B" instructions and strictly implement the **${randomLayout.name}** layout with **${randomStyle.name}** styling.

     **Specific Implementation Rules for ${randomLayout.id}:**
     ${randomLayout.id === 'SPLIT' ? '- Use `display: flex; flex-wrap: wrap; min-height: 100vh;` on body so both panels fill the viewport.\n     - Left side: Brand color background, centered logo/text.\n     - Right side: White background, form content.\n     - You MAY vary logo size, panel padding, card shadow, and CTA corner style.\n     - Do NOT collapse this into a single centered card.' : ''}
    ${randomLayout.id === 'MINIMAL' ? `- NO CARD CONTAINER. Content sits directly on background.\n     - Use body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px, form max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px (never full-width).\n     - Centered logo and form with generous spacing (24px gaps).\n     - Clean, minimalist, alert-like layout with breathing room.\n     - You MAY vary spacing rhythm, logo size/alignment, helper text placement, and button corner style.\n     - Do NOT introduce an outer card or extra layout sections.` : ''}
     ${randomLayout.id === 'CENTERED' ? '- Classic centered card with shadow.\n     - Background color surrounds the card.\n     - Use `min-height: 100vh; display: flex; align-items: center; justify-content: center;` on body to vertically center the card.\n     - You MAY vary card radius, shadow strength, logo alignment, and helper/footer treatment.\n     - Do NOT add hero sections, side panels, or multiple primary wrappers.' : ''}
    ${randomLayout.id === 'HERO' ? `- Top full-width hero bar (brand color, ~200px height).\n     - Hero section: \`display: flex; flex-direction: column;\` (logo and title must stack vertically).\n     - Content card overlaps the hero bar with a subtle negative margin-top.\n     - Use this exact overlap for the main container: \`margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0;\`.\n     - Do NOT make the overlap more aggressive (for example \`-40px\`, \`-48px\`, etc.).\n     - Recommended: main container \`style='width: 100%; max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px; margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0; padding: 0 20px; display: flex; flex-direction: column; align-items: center; justify-content: center;'\`.\n     - You MAY vary hero height slightly, logo size, card shadow/radius, and CTA corner style.\n     - Do NOT break the vertical hero stack or the assigned overlap logic.` : ''}

---

**DESIGN STYLE:**
Create MODERN, PROFESSIONAL landing pages that look POLISHED, TRUSTWORTHY, and LEGITIMATE – similar in quality to Microsoft / Google / Apple / Stripe auth / account pages (2026 aesthetic).

---

**BRAND COLORS (from detected industry: ${industryDesign.industry}):**
- Primary: ${industryDesign.colors.primary}
- Secondary: ${industryDesign.colors.secondary}
- Accent: ${industryDesign.colors.accent}

Use these mainly for:
${hasFormPages ? '- Primary buttons\n' : ''}- Highlights
- Icons / small accents
${hasFormPages ? `\nAlways ensure **high contrast** (e.g. primary button background vs text).` : ''}

---

**🎨 VISUAL VARIATION RULES (DO NOT CREATE CLONES):**

Pages for the same brand must feel related (same color palette, logo, general mood) but **must not be pixel-identical copies**.

For each new page/template, change at least **3** of the following visual aspects in a natural way:

Items 1–3 apply only to card-based layouts (CENTERED, HERO, and the right-panel form card in SPLIT). For MINIMAL, vary items 4–7 instead.

1. Card max-width for card-based layouts (e.g. 520–${LANDING_PAGE.FORM_MAX_WIDTH_PX}px) via \`style='max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px;'\` vs \`560px\`.
2. Card border-radius for card-based layouts (e.g. 14px, 18px, 22px).
3. Card shadow strength for card-based layouts (softer or stronger \`box-shadow\`).
4. Logo size or alignment (center vs left).
${hasFormPages ? '5. Button shape (fully pill vs slightly rounded rectangle).' : '5. (No buttons — info pages show content directly, no CTA.)'}
6. Vertical spacing between sections (margins between logo, card, footer).
7. Heading text and microcopy wording (same meaning, slightly different sentences).

- Do **NOT** blindly copy the same inline style values across all pages.
- Maintain consistency (same brand), but introduce subtle visual diversity like real products do.

---

**SHARED DESIGN ELEMENTS (Apply when the assigned layout allows):**

If a layout-specific rule above conflicts with a shared rule below, the layout-specific rule wins.

1. **Card Container (Main Panel) — SKIP for MINIMAL layout:**
   - Applies to CENTERED, HERO, SPLIT. Use \`cardStyle\` from the design patterns above.
   - **IMPORTANT:** Never change or remove \`margin: 0 auto;\` from templates — it's correct centering. New containers must also use \`margin: 0 auto;\`.

2. **Typography Hierarchy:**
   - Main heading: clear, strong, around 22–28px, bold.
   - Subheading: smaller, muted color (e.g. #4b5563), explaining context.
   - Helper/footer text: 11–13px, subtle.
   - **Header block alignment:** H1 and the intro/description paragraph directly below it MUST both use \`text-align: center\` (or wrap logo + h1 + p in a div with \`text-align: center\`). This ensures the title and intro text are visually aligned.
   - **FOR QUISHING LANDING PAGES:**
     - Heading MUST be a normal login heading: "Sign In", "Log In to Your Account", "Sign In Securely", etc.
     - Do NOT use: "QR Code Verification", "Verify via QR", "Account Verification via QR", or any QR-related text.
     - Description MUST be neutral: "Enter your credentials to continue" or "Sign in with your work account" — NOT "verify your account" or "account verification required" which exposes the attack.

${hasFormPages ? `3. **Inputs:**
   - Use \`inputStyle\` from the design patterns above. Each input must have a visible label above it.

4. **Primary Button:**
   - Use \`buttonStyle\` from the design patterns above with \`type='submit'\`.
   - High contrast: strong brand color background, readable text (e.g. white on ${industryDesign.colors.primary}).

5. **Trust & Security Indicator (especially on login):**
   - Small row BELOW the button (centered), with an icon + text. Use display: flex with justify-content: center (NOT inline-flex) to ensure it appears below, not beside the button.
   - Example:
     <div style='margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #6b7280;'>
       <span aria-hidden='true'>🔒</span>
       <span>256-bit SSL encryption</span>
     </div>` : `3. **No Buttons or CTA Links:**
   - Info pages display content directly — no buttons, no clickable actions, no form inputs.
   - Show scenario-specific content: lists, highlighted boxes, tables, metadata rows.`}

6. **Footer (ALWAYS under the card):**
   - Small text: © YEAR BRAND + tiny links (Privacy, Terms, Support).
   - Follow the footer pattern shown in template examples below.

---

**ACCESSIBILITY:**
${hasFormPages ? `- Every input has a label with \`for='id'\` matching \`id='...'\`.\n` : ''}- Avoid extremely small text for important content (use >= 14px for main copy).
${hasFormPages ? `- Buttons and links should look clearly interactive (cursor changes, visual styling).` : '- Links should look clearly interactive (cursor changes, visual styling).'}

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
- DO NOT include email-related fields (subject, fromName, fromAddress). This is a WEBSITE, not an email.
`;
}
