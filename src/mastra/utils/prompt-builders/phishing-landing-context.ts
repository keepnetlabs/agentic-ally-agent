interface LandingEmailSummaryParams {
  subject?: string;
  fromName: string;
  fromAddress: string;
  template: string;
  isQuishing: boolean;
  emailUsesLogoTag: boolean;
}

const NON_PRIMARY_CTA_LABELS = new Set([
  'privacy',
  'terms',
  'support',
  'unsubscribe',
  'help',
  'contact us',
  'privacy policy',
  'gizlilik',
  'yardım',
  'hilfe',
  'aide',
]);
const WEAK_CTA_LABELS = new Set([
  'click here',
  'continue',
  'submit',
  'learn more',
  'read more',
  'devam et',
  'weiter',
  'continuer',
  'continuar',
]);

const SIGN_IN_ACTION_PATTERN =
  /password|passcode|sign in|log in|login|sso|mfa|credentials|secure access|verify account|verify access|giriş|oturum aç|şifre|kimlik bilgileri|hesap|anmelden|einloggen|passwort|zugang|konto|iniciar sesión|iniciar sesion|acceder|cuenta|contraseña|connexion|se connecter|mot de passe|compte/;
const BILLING_ACTION_PATTERN =
  /invoice|payment|billing|bill|rechnung|zahlung|fatura|ödeme|factura|pago|pagar|facture|paiement|payer/;
const DELIVERY_ACTION_PATTERN =
  /delivery|package|shipment|tracking|order|lieferung|sendung|paket|kargo|teslimat|sipariş|entrega|paquete|envío|seguimiento|commande|livraison|colis|suivi/;
const POLICY_ACTION_PATTERN =
  /policy|handbook|acknowledg|survey|training|benefit|richtlinie|handbuch|bestätig|umfrage|schulung|vorteil|politika|el kitabı|anket|eğitim|yan hak|política|encuesta|formación|beneficios|politique|enquête|formation|avantages/;
const DOCUMENT_ACTION_PATTERN =
  /document|attachment|file|review|dokument|datei|anhang|prüf|belge|doküman|incele|documento|archivo|revisar|pièce jointe|fichier|réviser/;

interface CtaCandidate {
  label: string;
  score: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLikelyCtaLabel(template: string): string | undefined {
  const matches = Array.from(template.matchAll(/<(a|button)\b([^>]*)>([\s\S]{2,120}?)<\/\1>/gi));
  const candidates: CtaCandidate[] = [];

  for (const [index, match] of matches.entries()) {
    const tagName = match[1]?.toLowerCase();
    const attrs = match[2] || '';
    const label = match[3]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!label) continue;
    if (NON_PRIMARY_CTA_LABELS.has(label.toLowerCase())) continue;

    let score = 0;
    const hasPhishingUrl = attrs.includes('{PHISHINGURL}');
    if (hasPhishingUrl) score += 6;
    if (tagName === 'button') score += 2;
    if (/role\s*=\s*['"]button['"]/i.test(attrs)) score += 1;
    if (/\b(btn|button|cta)\b/i.test(attrs)) score += 1;
    if (
      SIGN_IN_ACTION_PATTERN.test(label.toLowerCase()) ||
      BILLING_ACTION_PATTERN.test(label.toLowerCase()) ||
      DELIVERY_ACTION_PATTERN.test(label.toLowerCase()) ||
      POLICY_ACTION_PATTERN.test(label.toLowerCase()) ||
      DOCUMENT_ACTION_PATTERN.test(label.toLowerCase())
    ) {
      score += 2;
    }
    if (label.length >= 8 && label.length <= 40) score += 1;
    if (WEAK_CTA_LABELS.has(label.toLowerCase())) score -= 1;
    score += Math.max(0, 3 - index) * 0.01;

    candidates.push({ label, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.label;
}

function inferPromisedAction(params: LandingEmailSummaryParams, bodyText: string, ctaLabel?: string): string {
  const haystack = `${params.subject || ''} ${ctaLabel || ''} ${bodyText}`.toLowerCase();

  if (params.isQuishing) return 'standard sign-in after QR-triggered email';
  if (SIGN_IN_ACTION_PATTERN.test(haystack)) return 'sign-in or credential entry';
  if (BILLING_ACTION_PATTERN.test(haystack)) return 'billing or payment review';
  if (DELIVERY_ACTION_PATTERN.test(haystack)) return 'delivery or order status review';
  if (POLICY_ACTION_PATTERN.test(haystack)) return 'internal acknowledgement or document access';
  if (DOCUMENT_ACTION_PATTERN.test(haystack)) return 'document review';
  return 'single follow-up action consistent with the email';
}

export function buildLandingEmailSummary(params: LandingEmailSummaryParams): string {
  const bodyText = stripHtml(params.template);
  const ctaLabel = extractLikelyCtaLabel(params.template);
  const bodySnippet = bodyText.slice(0, 160);
  const promisedAction = inferPromisedAction(params, bodyText, ctaLabel);
  const visualCue = params.emailUsesLogoTag ? 'email uses shared logo tag' : 'match email branding without adding new visual motifs';

  return `**Email Summary:**
- Subject: ${params.subject || 'N/A'}
- Sender: ${params.fromName} <${params.fromAddress}>
- Promised next step: ${promisedAction}
- Visual cue: ${visualCue}
${ctaLabel ? `- CTA wording: ${ctaLabel}` : ''}
- Copy cue: ${bodySnippet || 'Keep wording aligned with the email intent.'}`;
}
