/**
 * Fetch Branding Tool
 *
 * Fetches company branding (logo, colors, name) from whitelabeling API.
 * Falls back to Keepnet defaults if API fails or no branding configured.
 *
 * @see docs/REPORT_AGENT_DESIGN.md
 */

import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { getLogger } from '../../utils/core/logger';
import { getRequestContext } from '../../utils/core/request-storage';
import { ProductService } from '../../services/product-service';
import type { ReportBranding } from '../../schemas/report-schema';

const logger = getLogger('FetchBrandingTool');

const DEFAULT_BRANDING: ReportBranding = {
  logoUrl: 'https://api.keepnetlabs.com/whitelabeling/mainlogo/3b9fcb6f-76f4-412e-a28b-ec94c0420534.png',
  primaryColor: '#0B326F',
  companyName: 'Keepnet Labs',
};

const outputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    logoUrl: z.string(),
    primaryColor: z.string(),
    companyName: z.string(),
  }),
});

export const fetchBrandingTool = createTool({
  id: 'fetch_branding',
  description: 'Fetch company branding (logo, color, name) from whitelabeling API for report cover page.',
  inputSchema: z.object({}),
  outputSchema,
  execute: async (_input, _ctx?: ToolExecutionContext) => {
    try {
      const { token, baseApiUrl } = getRequestContext();

      if (!token || !baseApiUrl) {
        logger.debug('No auth context, using default branding');
        return { success: true, data: DEFAULT_BRANDING };
      }

      const productService = new ProductService(token);
      const config = await productService.getWhitelabelingConfig();

      if (!config) {
        logger.debug('No whitelabeling config found, using defaults');
        return { success: true, data: DEFAULT_BRANDING };
      }

      const branding: ReportBranding = {
        logoUrl: config.mainLogoUrl || DEFAULT_BRANDING.logoUrl,
        primaryColor: DEFAULT_BRANDING.primaryColor, // API doesn't return color yet
        companyName: config.brandName || DEFAULT_BRANDING.companyName,
      };

      logger.info('Branding fetched', { companyName: branding.companyName, hasLogo: !!branding.logoUrl });
      return { success: true, data: branding };
    } catch (err) {
      logger.warn('Branding fetch failed, using defaults', { error: (err as Error).message });
      return { success: true, data: DEFAULT_BRANDING };
    }
  },
});
