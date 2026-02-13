/**
 * Theme color normalization utilities
 *
 * Purpose:
 * - Convert user-friendly inputs like "amazon colors" into a valid theme background class
 *   from THEME_COLORS.VALUES.
 *
 * 3-level fallback:
 * - Level 1: Deterministic brand presets (stable, no AI)
 * - Level 2: AI selection constrained to THEME_COLORS.VALUES
 * - Level 3: Guaranteed default
 */

import { generateText } from 'ai';
import { THEME_COLORS } from '../../constants';
import { DEFAULT_GENERATION_PARAMS } from '../config/llm-generation-params';
import { getModelWithOverride } from '../../model-providers';
import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('ThemeColorNormalizer');

type ThemeBgClass = (typeof THEME_COLORS.VALUES)[number];

function applyBrandPreset(input: string): ThemeBgClass | null {
  const normalized = input.toLowerCase();

  const brandPresets: Array<{ match: (s: string) => boolean; color: ThemeBgClass }> = [
    // Big tech
    { match: s => s.includes('amazon') || s.includes('aws'), color: 'bg-gradient-orange' },
    { match: s => s.includes('microsoft') || s.includes('azure'), color: 'bg-gradient-blue' },
    {
      match: s => s.includes('google') || s.includes('gmail') || s.includes('workspace'),
      color: 'bg-gradient-light-blue',
    },
    { match: s => s.includes('apple') || s.includes('icloud'), color: 'bg-gradient-gray' },
    {
      match: s => s.includes('meta') || s.includes('facebook') || s.includes('instagram'),
      color: 'bg-gradient-indigo',
    },
    { match: s => s.includes('stripe'), color: 'bg-gradient-purple' },
    { match: s => s.includes('slack'), color: 'bg-gradient-teal' },
    { match: s => s.includes('github') || s.includes('gitlab'), color: 'bg-gradient-gray' },
    { match: s => s.includes('linkedin'), color: 'bg-gradient-blue' },
    { match: s => s.includes('x ') || s === 'x' || s.includes('twitter'), color: 'bg-gradient-gray' },
    { match: s => s.includes('netflix'), color: 'bg-gradient-red' },
    { match: s => s.includes('uber'), color: 'bg-gradient-gray' },
    { match: s => s.includes('airbnb'), color: 'bg-gradient-pink' },
    { match: s => s.includes('shopify'), color: 'bg-gradient-green' },
    { match: s => s.includes('salesforce'), color: 'bg-gradient-light-blue' },
    { match: s => s.includes('oracle'), color: 'bg-gradient-red' },
    { match: s => s.includes('ibm'), color: 'bg-gradient-blue' },
    { match: s => s.includes('sap'), color: 'bg-gradient-blue' },
    { match: s => s.includes('adobe'), color: 'bg-gradient-red' },
    { match: s => s.includes('zoom'), color: 'bg-gradient-blue' },
    { match: s => s.includes('dropbox'), color: 'bg-gradient-blue' },
    {
      match: s => s.includes('atlassian') || s.includes('jira') || s.includes('confluence'),
      color: 'bg-gradient-indigo',
    },
    { match: s => s.includes('notion'), color: 'bg-gradient-gray' },
    { match: s => s.includes('figma'), color: 'bg-gradient-purple' },
    { match: s => s.includes('paypal'), color: 'bg-gradient-blue' },
    { match: s => s.includes('visa'), color: 'bg-gradient-blue' },
    { match: s => s.includes('mastercard') || s.includes('master card'), color: 'bg-gradient-orange' },
    { match: s => s.includes('american express') || s.includes('amex'), color: 'bg-gradient-blue' },
    { match: s => s.includes('tencent'), color: 'bg-gradient-indigo' },
    { match: s => s.includes('alibaba'), color: 'bg-gradient-orange' },
    { match: s => s.includes('huawei'), color: 'bg-gradient-red' },
    { match: s => s.includes('samsung'), color: 'bg-gradient-blue' },
    { match: s => s.includes('sony'), color: 'bg-gradient-indigo' },
    { match: s => s.includes('siemens'), color: 'bg-gradient-teal' },
    { match: s => s.includes('nvidia'), color: 'bg-gradient-green' },
    { match: s => s.includes('intel'), color: 'bg-gradient-blue' },
    { match: s => s.includes('amd'), color: 'bg-gradient-red' },
    { match: s => s.includes('tesla'), color: 'bg-gradient-red' },
    { match: s => s.includes('openai'), color: 'bg-gradient-indigo' },
    { match: s => s.includes('anthropic'), color: 'bg-gradient-amber' },

    // Security vendors / cyber brands (common)
    { match: s => s.includes('darktrace'), color: 'bg-gradient-indigo' },
    { match: s => s.includes('crowdstrike') || s.includes('falcon'), color: 'bg-gradient-red' },
    { match: s => s.includes('palo alto') || s.includes('paloalto'), color: 'bg-gradient-orange' },
    { match: s => s.includes('fortinet') || s.includes('fortigate'), color: 'bg-gradient-orange' },
    { match: s => s.includes('checkpoint') || s.includes('check point'), color: 'bg-gradient-purple' },
    { match: s => s.includes('okta'), color: 'bg-gradient-blue' },
    { match: s => s.includes('sentinelone') || s.includes('sentinel one'), color: 'bg-gradient-teal' },
    { match: s => s.includes('splunk'), color: 'bg-gradient-amber' },
    { match: s => s.includes('cisco') || s.includes('umbrella'), color: 'bg-gradient-blue' },
    { match: s => s.includes('zscaler'), color: 'bg-gradient-blue' },
    { match: s => s.includes('cloudflare'), color: 'bg-gradient-orange' },
    {
      match: s => s.includes('rapid7') || s.includes('insightvm') || s.includes('insight idr'),
      color: 'bg-gradient-amber',
    },
    { match: s => s.includes('tenable') || s.includes('nessus'), color: 'bg-gradient-teal' },
    { match: s => s.includes('qualys'), color: 'bg-gradient-blue' },
    { match: s => s.includes('proofpoint'), color: 'bg-gradient-indigo' },
    { match: s => s.includes('mimecast'), color: 'bg-gradient-purple' },
    { match: s => s.includes('sophos'), color: 'bg-gradient-teal' },
    { match: s => s.includes('trend micro') || s.includes('trendmicro'), color: 'bg-gradient-red' },
    { match: s => s.includes('kaspersky'), color: 'bg-gradient-green' },
    { match: s => s.includes('eset'), color: 'bg-gradient-teal' },
    { match: s => s.includes('mandiant'), color: 'bg-gradient-orange' },
    { match: s => s.includes('crowdsec') || s.includes('crowd sec'), color: 'bg-gradient-indigo' },
  ];

  const preset = brandPresets.find(p => p.match(normalized));
  return preset?.color ?? null;
}

/**
 * Normalize a user input into a valid theme background class (bg-gradient-*)
 */
export async function normalizeThemeBackgroundClass(
  colorInput: string,
  modelProvider?: string,
  modelName?: string
): Promise<ThemeBgClass> {
  // Already valid
  if (THEME_COLORS.VALUES.includes(colorInput as ThemeBgClass)) {
    return colorInput as ThemeBgClass;
  }

  // Level 1: deterministic presets (e.g., "amazon colors")
  const preset = applyBrandPreset(String(colorInput));
  if (preset) {
    logger.info('Brand color preset applied', { input: colorInput, output: preset });
    return preset;
  }

  // Level 2: AI constrained selection
  try {
    const finalModel = getModelWithOverride(modelProvider, modelName);

    const systemPrompt = `ROLE: CSS Color Class Matcher
TASK: Return ONLY the CSS class name - nothing else

CRITICAL RULES:
1. Output ONLY one CSS class name from the provided list
2. NO explanation text, NO quotes, NO backticks, NO markdown
3. NO newlines, NO whitespace before/after
4. NO "The answer is..." or any prefix/suffix
5. Just the class name: bg-gradient-red (EXAMPLE ONLY)
6. If multiple matches, choose closest semantic match
7. If no perfect match, pick best approximation

CONSTRAINT: Your response must be exactly one line with only the CSS class name`;

    const userPrompt = `User requested color/theme: "${colorInput}"

Available colors:
${THEME_COLORS.VALUES.map(c => `- ${c}`).join('\n')}

Respond with ONLY the CSS class name. Nothing else.`;

    const { text } = await generateText({
      model: finalModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...DEFAULT_GENERATION_PARAMS,
    });

    const selectedColor = text.trim().split('\n')[0].trim();

    if (THEME_COLORS.VALUES.includes(selectedColor as ThemeBgClass)) {
      logger.info('Theme background normalized (AI)', { input: colorInput, output: selectedColor });
      return selectedColor as ThemeBgClass;
    }

    const classNamePattern = /bg-gradient-[\w-]+/;
    const match = text.match(classNamePattern);
    if (match && THEME_COLORS.VALUES.includes(match[0] as ThemeBgClass)) {
      logger.info('Theme background normalized (AI regex fallback)', { input: colorInput, output: match[0] });
      return match[0] as ThemeBgClass;
    }

    logger.warn('Invalid theme color returned from AI, using default', { input: colorInput, aiOutput: selectedColor });
    return THEME_COLORS.DEFAULT;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('Theme background normalization failed, using default', { error: err.message });
    // Level 3: guaranteed
    return THEME_COLORS.DEFAULT;
  }
}
