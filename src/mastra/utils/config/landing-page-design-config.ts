/**
 * Landing Page Design Configuration
 * Layout and style options for dynamic phishing landing page generation
 */

export interface LayoutOption {
  id: string;
  name: string;
  description: string;
  cssRule: string;
}

export interface StyleOption {
  id: string;
  name: string;
  rules: string;
}

/**
 * Available layout options for landing pages
 * Randomly selected during generation for variety
 */
export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'CENTERED',
    name: 'CENTERED CARD (Classic)',
    description: 'A centered white card on a colored background. Best for generic login.',
    cssRule: 'body { display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; } .card { max-width: 420px; margin: 0 auto !important; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }'
  },
  {
    id: 'SPLIT',
    name: 'SPLIT SCREEN (Enterprise)',
    description: 'Split screen 50/50. Left side is brand color/image, Right side is the form. Best for corporate/SaaS.',
    cssRule: 'body { display: flex; flex-wrap: wrap; min-height: 100vh; margin: 0; } .brand-side { flex: 1; min-width: 300px; background-color: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white; } .form-side { flex: 1; min-width: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; padding: 24px; }'
  },
  {
    id: 'MINIMAL',
    name: 'MINIMAL / URGENT (Alert)',
    description: 'No card container. Content sits directly on a plain white or very light background. Centered layout with max-width constraint. Best for simple alerts.',
    cssRule: 'body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 40px 20px; background-color: #ffffff; font-family: system-ui, sans-serif; } form { max-width: 400px; width: 100%; margin: 0 auto; } input, button { max-width: 100%; }'
  },
  {
    id: 'HERO',
    name: 'HERO HEADER (Marketing/Promo)',
    description: 'Top colored hero section with logo, content card overlapping the header. Looks like a modern promo or announcement page.',
    cssRule: 'body { margin: 0; background: #f3f4f6; min-height: 100vh; font-family: system-ui, sans-serif; } .hero { height: 220px; background-color: var(--primary-color); width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; } .main-container { width: 100%; max-width: 420px; margin: -20px auto 0; padding: 0 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }'
  }
];

/**
 * Available visual style options for landing pages
 * Randomly selected during generation for variety
 */
export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'SOFT',
    name: 'Soft & Modern',
    rules: 'Border-radius: 12px to 16px. Box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1). Padding: Spacious (32px+). Buttons: Fully rounded (pill shape) or soft rounded.'
  },
  {
    id: 'SHARP',
    name: 'Sharp & Corporate',
    rules: 'Border-radius: 2px to 4px. Box-shadow: 0 1px 3px rgba(0,0,0,0.1). Border: 1px solid #e5e7eb. Padding: Compact (20-24px). Buttons: Slightly rounded (4px).'
  },
  {
    id: 'FLAT',
    name: 'Flat & High Contrast',
    rules: 'Border-radius: 6px. No shadow. Border: 2px solid #e5e7eb. Inputs have strong borders. Buttons: No shadow, strong flat color.'
  }
];

/**
 * Get a random layout option
 */
export function getRandomLayout(): LayoutOption {
  return LAYOUT_OPTIONS[Math.floor(Math.random() * LAYOUT_OPTIONS.length)];
}

/**
 * Get a random style option
 */
export function getRandomStyle(): StyleOption {
  return STYLE_OPTIONS[Math.floor(Math.random() * STYLE_OPTIONS.length)];
}
