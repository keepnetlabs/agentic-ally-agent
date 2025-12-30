/**
 * Landing Page Template Examples
 * HTML templates used as examples in AI prompts for landing page generation
 */

import { LANDING_PAGE } from '../../constants';

/**
 * Industry design configuration for templates
 */
export interface IndustryDesignConfig {
  industry: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  patterns: {
    cardStyle: string;
    buttonStyle: string;
    inputStyle: string;
  };
}

/**
 * Parameters for template generation
 */
export interface TemplateParams {
  fromName: string;
  industryDesign: IndustryDesignConfig;
}

/**
 * Common footer HTML used across all templates
 */
export function getFooterHTML(fromName: string): string {
  return `<div style='
      margin-top: 32px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    '>
      <p style='margin: 0;'>&copy; 2025 ${fromName}. All rights reserved.</p>
      <div style='
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      '>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Privacy</a>
        <span>&bull;</span>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Terms</a>
        <span>&bull;</span>
        <a href='{PHISHINGURL}' style='color: #9ca3af; text-decoration: none;'>Support</a>
      </div>
    </div>`;
}

/**
 * Login page template example for AI prompt
 */
export function getLoginTemplateExample({ fromName, industryDesign }: TemplateParams): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <title>Sign in to ${fromName}</title>
</head>
<body style='
  min-height: 100vh;
  margin: 0;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
'>
  <div style='
    width: 100%;
    max-width: 420px;
    margin: 0 auto !important;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  '>

    <!-- Logo + Title -->
    <div style='text-align: center; margin-bottom: 24px;'>
      <img src='{CUSTOMMAINLOGO}' alt='${fromName}' style='display: block; margin: 0 auto 16px auto; height: 64px; object-fit: contain;' />
      <h1 style='font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.02em;'>Sign in to ${fromName}</h1>
      <p style='margin: 8px 0 0 0; font-size: 14px; color: #4b5563;'>
        Use your work credentials to securely access your account.
      </p>
    </div>

    <!-- Card -->
    <div style='${industryDesign.patterns.cardStyle}'>
      <form>
        <!-- Email -->
        <div style='margin-bottom: 16px;'>
          <label for='email' style='display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;'>
            Email address
          </label>
          <input
            id='email'
            type='email'
            name='email'
            placeholder='you@example.com'
            autocomplete='email'
            required
            style='${industryDesign.patterns.inputStyle}'
          />
        </div>

        <!-- Password -->
        <div style='margin-bottom: 16px;'>
          <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;'>
            <label for='password' style='font-size: 12px; font-weight: 600; color: #374151;'>
              Password
            </label>
            <a href='#' style='font-size: 12px; color: ${industryDesign.colors.primary}; text-decoration: none;'>
              Forgot?
            </a>
          </div>
          <input
            id='password'
            type='password'
            name='password'
            placeholder='Enter your password'
            autocomplete='current-password'
            required
            style='${industryDesign.patterns.inputStyle}'
          />
        </div>

        <!-- Remember Me -->
        <div style='display: flex; align-items: center; gap: 8px; margin-bottom: 16px;'>
          <input
            id='remember'
            type='checkbox'
            name='remember'
            style='width: 14px; height: 14px; border-radius: 4px; border: 1px solid #d1d5db;'
          />
          <label for='remember' style='font-size: 12px; color: #4b5563;'>
            Keep me signed in
          </label>
        </div>

        <!-- Submit Button -->
        <button
          type='submit'
          style='${industryDesign.patterns.buttonStyle}'
        >
          Sign in
        </button>

        <!-- Security Indicator -->
        <div style='margin-top: 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #6b7280;'>
          <span aria-hidden='true'>&#128274;</span>
          <span>256-bit SSL encryption</span>
        </div>

        <!-- Hidden Tracking -->
        <input type='hidden' name='trackId' value='${LANDING_PAGE.PLACEHOLDERS.TRACK_ID}' />
      </form>
    </div>

    <!-- Footer -->
    ${getFooterHTML(fromName)}
  </div>
</body>
</html>`;
}

/**
 * Success page template example for AI prompt
 */
export function getSuccessTemplateExample({ fromName, industryDesign }: TemplateParams): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <title>${fromName} – Success</title>
</head>
<body style='
  min-height: 100vh;
  margin: 0;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
'>
  <div style='
    width: 100%;
    max-width: 420px;
    margin: 0 auto !important;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  '>

    <div style='${industryDesign.patterns.cardStyle}; text-align: center;'>
      <div style='margin-bottom: 16px;'>
        <div style='
          width: 64px;
          height: 64px;
          border-radius: 999px;
          margin: 0 auto 16px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #22c55e;
        '>
          <span style='color: #ffffff; font-size: 32px;'>&#10003;</span>
        </div>
        <h1 style='font-size: 22px; font-weight: 700; margin: 0 0 8px 0;'>Account updated</h1>
        <p style='margin: 0; font-size: 14px; color: #4b5563;'>
          Your account information has been updated successfully.
        </p>
      </div>

      <button
        type='button'
        style='${industryDesign.patterns.buttonStyle}; width: auto; padding-left: 24px; padding-right: 24px; margin-top: 16px;'
      >
        Go to dashboard
      </button>

      <!-- Security Indicator -->
      <div style='margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #6b7280;'>
        <span aria-hidden='true'>&#128274;</span>
        <span>Secure portal</span>
      </div>
    </div>

    <!-- Footer -->
    ${getFooterHTML(fromName)}
  </div>
</body>
</html>`;
}

/**
 * Info/Document page template example for AI prompt
 */
export function getInfoTemplateExample({ fromName, industryDesign }: TemplateParams): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <title>${fromName} – Policy update</title>
</head>
<body style='
  min-height: 100vh;
  margin: 0;
  padding: 40px 16px;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
'>
  <div style='max-width: 720px; margin: 0 auto;'>

    <div style='${industryDesign.patterns.cardStyle}; max-width: 720px; margin: 0 auto;'>
      <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;'>
        <div style='display: flex; align-items: center; gap: 8px;'>
          <img src='{CUSTOMMAINLOGO}' alt='${fromName}' style='display: block; margin: 0 auto; height: 36px; object-fit: contain;' />
        </div>
        <span style='font-size: 12px; color: #6b7280;'>${fromName}</span>
      </div>

      <div style='margin-bottom: 16px;'>
        <h1 style='font-size: 24px; font-weight: 700; margin: 0 0 8px 0;'>Policy update</h1>
        <p style='margin: 0; font-size: 14px; color: #4b5563;'>
          We have updated our account policy to improve security and transparency.
        </p>
      </div>

      <div style='font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;'>
        <p style='margin: 0 0 12px 0;'>
          Please review the updated terms to stay informed about how your information is used and protected.
        </p>
        <p style='margin: 0;'>
          By continuing, you confirm that you have read and understood these changes.
        </p>
      </div>

      <div style='display: flex; align-items: center; gap: 12px; flex-wrap: wrap;'>
        <button
          type='button'
          style='${industryDesign.patterns.buttonStyle}; width: auto; padding-left: 20px; padding-right: 20px;'
        >
          View full policy
        </button>
        <span style='font-size: 12px; color: #6b7280;'>Last updated: Jan 5, 2025</span>
      </div>
    </div>

    <!-- Footer -->
    ${getFooterHTML(fromName)}
  </div>
</body>
</html>`;
}

/**
 * Login page section with description and validation checklist
 */
export function getLoginPageSection({ fromName, industryDesign }: TemplateParams): string {
  return `
=====================================================
### 1. LOGIN PAGE (type: 'login')

Goal: A secure, polished login screen for ${fromName}.

**STRUCTURE:**

- BODY: centered layout with background.
- WRAPPER: column layout (logo section, card, footer).
- CARD: login form.

**LOGIN TEMPLATE EXAMPLE (STRUCTURE TO FOLLOW - ADAPT TO SCENARIO, DON'T COPY VERBATIM):**

${getLoginTemplateExample({ fromName, industryDesign })}

**LOGIN VALIDATION:**
- [ ] Body uses flex center and background.
- [ ] Wrapper uses flex-direction: column, so footer is BELOW the card.
- [ ] Wrapper has margin: 0 auto to ensure centering.
- [ ] Card has generous padding and clean shadow.
- [ ] Button has strong contrast using brand primary.
- [ ] All HTML attributes use SINGLE QUOTES.
- [ ] Hidden trackId field is present.
`;
}

/**
 * Success page section with description
 */
export function getSuccessPageSection({ fromName, industryDesign }: TemplateParams): string {
  return `
=====================================================
### 2. SUCCESS PAGE (type: 'success')

Purpose: confirmation after a successful action (e.g. login verification, profile update).

**STRUCTURE:**
- Same body + wrapper pattern as login.
- Single centered card with:
  - Success icon (checkmark).
  - Title and short message.
  - Optional primary button.
  - No form.

**SUCCESS TEMPLATE EXAMPLE (ADAPT TO SCENARIO, DON'T COPY VERBATIM):**

${getSuccessTemplateExample({ fromName, industryDesign })}
`;
}

/**
 * Info page section with description
 */
export function getInfoPageSection({ fromName, industryDesign }: TemplateParams): string {
  return `
=====================================================
### 3. INFO/DOCUMENT PAGE (type: 'info')

Purpose: display information (policy update, document notice, summary, etc.) for click-only flows.

**STRUCTURE:**
- Body: simple vertical layout.
- Main content in a wider card (e.g. 640–760px max-width).
- Logo + brand at top.
- Title + intro.
- 1–3 short paragraphs of text.
- Primary action button + metadata (e.g. "Last updated: ...").
- Footer ©.

**INFO TEMPLATE EXAMPLE (ADAPT TO SCENARIO, DON'T COPY VERBATIM):**

${getInfoTemplateExample({ fromName, industryDesign })}
`;
}
