import { getLogger } from '../utils/core/logger';
import { getRequestContext, requestStorage } from '../utils/core/request-storage';
import { API_KEYS } from '../constants';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from './error-service';

/**
 * ProductService for communicating with our product backend
 * Extracts IDP from JWT and builds base URL with /api suffix
 */
export class ProductService {
  private baseUrl: string;
  private jwtToken?: string;
  private apiKey: string;
  private companyId?: string;
  private logger = getLogger('ProductService');

  constructor(jwtToken?: string) {

    const { baseApiUrl } = getRequestContext();

    // Get JWT token from parameter or requestStorage
    const token = jwtToken || this.getTokenFromRequestStorage();

    if (!token) {
      this.logger.warn('No JWT token provided for ProductService');
      this.baseUrl = '';
      this.jwtToken = undefined;
      this.companyId = undefined;
    } else {
      this.jwtToken = token;
      const tokenData = this.parseToken(token);

      if (baseApiUrl) {
        this.baseUrl = `${baseApiUrl}/api`;
      } else if (!tokenData.idp) {
        this.logger.warn('Failed to extract IDP from JWT');
        this.baseUrl = '';
      } else {
        this.baseUrl = `${tokenData.idp}/api`;
      }

      // Use companyId from requestStorage if available (X-COMPANY-ID header), otherwise from JWT
      this.companyId = this.getCompanyIdFromRequestStorage() || tokenData.companyId;
    }

    this.apiKey = API_KEYS.PRODUCT_API_KEY;
    if (!this.apiKey) {
      this.logger.warn('PRODUCT_API_KEY not configured in environment');
    }
  }

  /**
   * Get JWT token from requestStorage
   */
  private getTokenFromRequestStorage(): string | undefined {
    try {
      const store = requestStorage.getStore();
      return store?.token;
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.internal(err.message, { step: 'get-token-from-request-storage', stack: err.stack });
      logErrorInfo(this.logger, 'warn', 'Failed to get token from requestStorage', errorInfo);
      return undefined;
    }
  }

  /**
   * Get companyId from requestStorage (X-COMPANY-ID header)
   */
  private getCompanyIdFromRequestStorage(): string | undefined {
    try {
      const store = requestStorage.getStore();
      return store?.companyId;
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.internal(err.message, { step: 'get-company-id-from-request-storage', stack: err.stack });
      logErrorInfo(this.logger, 'warn', 'Failed to get companyId from requestStorage', errorInfo);
      return undefined;
    }
  }

  /**
   * Parse JWT and extract relevant fields
   */
  private parseToken(token: string): { idp?: string; companyId?: string } {
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        this.logger.warn('Invalid JWT format');
        return {};
      }

      const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));

      return {
        idp: decoded.idp,
        companyId: decoded.user_company_resourceid
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.auth(err.message, { step: 'parse-jwt-token', stack: err.stack });
      logErrorInfo(this.logger, 'warn', 'Failed to parse JWT token', errorInfo);
      return {};
    }
  }

  /**
   * Build request headers with Bearer token
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    if (this.apiKey) {
      headers['x-ir-api-key'] = this.apiKey;
    }

    if (this.companyId) {
      headers['x-ir-company-id'] = this.companyId;
    }

    return headers;
  }

  /**
   * Make authenticated request to backend
   */
  async request(endpoint: string, method: string = 'GET', body?: any): Promise<any | null> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.info('Requesting URL', { url });
      const options: RequestInit = {
        method,
        headers: this.getHeaders()
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        this.logger.warn(`Request failed`, {
          endpoint,
          method,
          status: response.status
        });
        return null;
      }

      return await response.json();
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, { step: 'product-api-request', endpoint, stack: err.stack });
      logErrorInfo(this.logger, 'error', `Request error to ${endpoint}`, errorInfo);
      return null;
    }
  }

  /**
   * Get whitelabeling configuration
   */
  async getWhitelabelingConfig(): Promise<{ mainLogoUrl?: string; minimizedMenuLogoUrl?: string; brandName?: string } | null> {
    try {
      const response = await this.request('/whitelabeling');

      if (!response || !response.data) {
        this.logger.warn('Invalid whitelabeling response');
        return null;
      }

      return {
        mainLogoUrl: response.data.mainLogoUrl,
        minimizedMenuLogoUrl: response.data.minimizedMenuLogoUrl,
        brandName: response.data.brandName
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, { step: 'fetch-whitelabeling-config', stack: err.stack });
      logErrorInfo(this.logger, 'error', 'Failed to fetch whitelabeling config', errorInfo);
      return null;
    }
  }
}
