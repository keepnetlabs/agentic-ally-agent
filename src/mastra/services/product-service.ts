import { Logger } from '../utils/core/logger';
import { requestStorage } from '../utils/core/request-storage';

/**
 * ProductService for communicating with our product backend
 * Extracts IDP from JWT and builds base URL with /api suffix
 */
export class ProductService {
  private baseUrl: string;
  private jwtToken?: string;
  private apiKey: string;
  private companyId?: string;
  private logger: Logger;

  constructor(jwtToken?: string) {
    this.logger = new Logger('ProductService');

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

      if (!tokenData.idp) {
        this.logger.warn('Failed to extract IDP from JWT');
        this.baseUrl = '';
      } else {
        this.baseUrl = `${tokenData.idp}/api`;
      }

      this.companyId = tokenData.companyId;
    }

    this.apiKey = process.env.IR_API_KEY || '';
  }

  /**
   * Get JWT token from requestStorage
   */
  private getTokenFromRequestStorage(): string | undefined {
    try {
      const store = requestStorage.getStore();
      return store?.token;
    } catch (error) {
      this.logger.warn('Failed to get token from requestStorage');
      return undefined;
    }
  }

  /**
   * Parse JWT and extract relevant fields
   */
  private parseToken(token: string): { idp?: string; companyId?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.logger.warn('Invalid JWT format');
        return {};
      }

      const padding = '='.repeat((4 - (parts[1].length % 4)) % 4);
      const payload = JSON.parse(
        Buffer.from(parts[1] + padding, 'base64').toString('utf-8')
      );

      return {
        idp: payload.idp,
        companyId: payload.user_company_resourceid
      };
    } catch (error) {
      this.logger.warn('Failed to parse JWT token');
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
      this.logger.error(`Request error to ${endpoint}`, error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error('Failed to fetch whitelabeling config', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
}
