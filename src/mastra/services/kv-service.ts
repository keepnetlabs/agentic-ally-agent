import { getLogger, startTimer } from '../utils/core/logger';
import { withRetry } from '../utils/core/resilience-utils';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from './error-service';

/**
 * KV Service for direct Cloudflare KV REST API operations
 * Provides type-safe operations with retry logic and structured logging
 */
export class KVService {
  private accountId: string;
  private apiToken: string;
  private apiKey: string;
  private namespaceId: string;
  private logger = getLogger('KVService');

  constructor(namespaceIdOverride?: string) {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_KV_TOKEN || '';
    this.apiKey = ''; // Not using legacy API key
    this.namespaceId = namespaceIdOverride || process.env.MICROLEARNING_KV_NAMESPACE_ID || ''; // Use override or default

    // Validate required environment variables
    if (!this.accountId) {
      this.logger.warn('CLOUDFLARE_ACCOUNT_ID not found in environment variables');
    }
    if (!this.apiToken) {
      this.logger.warn('CLOUDFLARE_KV_TOKEN not found in environment variables');
    }
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Use API token (Bearer) or API key (X-Auth-* headers)
    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    } else if (this.apiKey && process.env.CLOUDFLARE_EMAIL) {
      headers['X-Auth-Key'] = this.apiKey;
      headers['X-Auth-Email'] = process.env.CLOUDFLARE_EMAIL;
    }

    return headers;
  }

  private getKVUrl(key: string) {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${key}`;
  }

  async put(key: string, value: any): Promise<boolean> {
    try {
      const timer = startTimer();
      return await withRetry(
        async () => {
          const url = this.getKVUrl(key);
          const body = typeof value === 'string' ? value : JSON.stringify(value);
          const headers = this.getHeaders();

          const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: body
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`KV PUT failed with status ${response.status}: ${errorText.substring(0, 200)}`);
          }

          return true;
        },
        `KV PUT ${key}`
      ).then((result) => {
        const duration = timer.end();
        this.logger.debug(`KV PUT success`, { key, duration });
        return result;
      });
    } catch (error) {
      const errorMsg = normalizeError(error);
      this.logger.error(`KV PUT failed after retries`, {
        error: errorMsg.message,
        stack: errorMsg.stack,
        key,
        valueType: typeof value,
      });
      return false;
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      return await withRetry(
        async () => {
          const url = this.getKVUrl(key);

          const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
          });

          if (!response.ok) {
            if (response.status === 404) {
              return null; // Key not found - don't retry
            }
            const errorText = await response.text();
            const errorInfo = errorService.external(`KV GET failed with status ${response.status}`, {
              status: response.status,
              errorText: errorText.substring(0, 200),
              key,
              operation: 'GET'
            });
            logErrorInfo(this.logger, 'error', 'KV GET failed', errorInfo);
            throw new Error(errorInfo.message);
          }

          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch (parseError) {
            this.logger.warn(`Failed to parse KV value as JSON for key, returning as string`, {
              key,
              error: parseError instanceof Error ? parseError.message : String(parseError),
              textLength: text.length,
            });
            return text; // Return as string if not JSON
          }
        },
        `KV GET ${key}`
      );
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`KV GET failed after retries`, { key, error: err.message, stack: err.stack });
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      return await withRetry(
        async () => {
          const url = this.getKVUrl(key);

          const response = await fetch(url, {
            method: 'DELETE',
            headers: this.getHeaders()
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`KV DELETE failed with status ${response.status}: ${errorText.substring(0, 200)}`);
          }

          this.logger.debug(`KV DELETE success for key`, { key });
          return true;
        },
        `KV DELETE ${key}`
      );
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`KV DELETE failed after retries`, { key, error: err.message, stack: err.stack });
      return false;
    }
  }

  async list(prefix?: string, limit?: number): Promise<string[]> {
    try {
      let url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/keys`;

      const params = new URLSearchParams();
      if (prefix) params.append('prefix', prefix);
      if (limit) params.append('limit', limit.toString());

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`KV LIST failed`, { status: response.status, errorText: errorText.substring(0, 200) });
        return [];
      }

      const data = await response.json();
      return data.result?.map((item: any) => item.name) || [];
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`KV LIST error`, { error: err.message, stack: err.stack });
      return [];
    }
  }

  // Microlearning specific methods
  async saveMicrolearning(microlearningId: string, data: any, language: string, department: string): Promise<boolean> {
    const timer = startTimer();
    const normalizedLang = language.toLowerCase();
    const baseKey = `ml:${microlearningId}:base`;
    const langKey = `ml:${microlearningId}:lang:${normalizedLang}`;
    const inboxKey = `ml:${microlearningId}:inbox:${department}:${normalizedLang}`;

    try {
      this.logger.info(`Saving microlearning to KV`, {
        microlearningId,
        language: normalizedLang,
        department,
      });

      // Save all three components in parallel with Promise.allSettled
      const [baseResult, langResult, inboxResult] = await Promise.allSettled([
        this.put(baseKey, {
          ...data.microlearning,
          microlearning_id: microlearningId
        }),
        this.put(langKey, data.languageContent),
        this.put(inboxKey, data.inboxContent),
      ]);

      // Check results
      const baseSuccess = baseResult.status === 'fulfilled' && baseResult.value === true;
      const langSuccess = langResult.status === 'fulfilled' && langResult.value === true;
      const inboxSuccess = inboxResult.status === 'fulfilled' && inboxResult.value === true;

      const allSuccess = baseSuccess && langSuccess && inboxSuccess;
      const duration = timer.end();

      if (allSuccess) {
        this.logger.info(`All microlearning data saved successfully`, {
          microlearningId,
          duration,
          components: ['base', 'language', 'inbox'],
        });
      } else {
        const failures = [
          !baseSuccess && 'base',
          !langSuccess && 'language',
          !inboxSuccess && 'inbox'
        ].filter(Boolean);

        this.logger.warn(`Partial microlearning save to KV`, {
          microlearningId,
          duration,
          failedComponents: failures,
          baseStatus: baseResult.status,
          langStatus: langResult.status,
          inboxStatus: inboxResult.status,
        });

        // Log rejection errors with details
        if (baseResult.status === 'rejected') {
          const baseErr = baseResult.reason instanceof Error ? baseResult.reason : new Error(String(baseResult.reason));
          this.logger.error(`Base microlearning save failed`, { microlearningId, error: baseErr.message, stack: baseErr.stack });
        }
        if (langResult.status === 'rejected') {
          const langErr = langResult.reason instanceof Error ? langResult.reason : new Error(String(langResult.reason));
          this.logger.error(`Language content save failed`, { microlearningId, error: langErr.message, stack: langErr.stack });
        }
        if (inboxResult.status === 'rejected') {
          const inboxErr = inboxResult.reason instanceof Error ? inboxResult.reason : new Error(String(inboxResult.reason));
          this.logger.error(`Inbox content save failed`, { microlearningId, error: inboxErr.message, stack: inboxErr.stack });
        }
      }

      return allSuccess;
    } catch (error) {
      const errorMsg = normalizeError(error);
      this.logger.error(`Failed to save microlearning`, {
        microlearningId,
        language: normalizedLang,
        department,
        duration: timer.end(),
        error: errorMsg.message,
        stack: errorMsg.stack,
      });
      return false;
    }
  }

  // Phishing specific methods

  // 1. Save Phishing Base (Metadata)
  async savePhishingBase(id: string, data: any, language: string): Promise<boolean> {
    const baseKey = `phishing:${id}:base`;
    const normalizedLang = language.toLowerCase();

    try {
      const baseData = {
        id,
        name: data.analysis?.name,
        description: data.analysis?.description,
        topic: data.analysis?.scenario || 'Unknown Topic',
        difficulty: data.analysis?.difficulty || 'Medium',
        method: data.analysis?.method || 'Click-Only',
        isQuishing: data.analysis?.isQuishing || false, // Add quishing flag (AI-determined)
        targetProfile: data.analysis?.targetAudienceAnalysis || {},
        createdAt: new Date().toISOString(),
        language_availability: [normalizedLang]
      };

      return await this.put(baseKey, baseData);
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to save phishing base`, { id, error: err.message, stack: err.stack });
      return false;
    }
  }

  // 2. Save Phishing Email (Content)
  async savePhishingEmail(id: string, data: any, language: string): Promise<boolean> {
    const normalizedLang = language.toLowerCase();
    const emailKey = `phishing:${id}:email:${normalizedLang}`;

    try {
      const emailData = {
        id,
        language: normalizedLang,
        subject: data.subject,
        template: data.template,
        fromAddress: data.fromAddress,
        fromName: data.fromName,
        redFlags: data.analysis?.keyRedFlags || []
      };

      return await this.put(emailKey, emailData);
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to save phishing email`, { id, error: err.message, stack: err.stack });
      return false;
    }
  }

  // 3. Save Phishing Landing Page (Content)
  async savePhishingLandingPage(id: string, data: any, language: string): Promise<boolean> {
    if (!data.landingPage) return true; // Skip if no landing page data

    const normalizedLang = language.toLowerCase();
    const landingKey = `phishing:${id}:landing:${normalizedLang}`;

    try {
      const landingData = {
        id,
        language: normalizedLang,
        ...data.landingPage
      };

      return await this.put(landingKey, landingData);
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to save phishing landing page`, { id, error: err.message, stack: err.stack });
      return false;
    }
  }

  // Wrapper for saving all components at once (optional convenience method)
  async savePhishing(id: string, data: any, language: string): Promise<boolean> {
    const results = await Promise.allSettled([
      this.savePhishingBase(id, data, language),
      this.savePhishingEmail(id, data, language),
      this.savePhishingLandingPage(id, data, language)
    ]);

    return results.every(r => r.status === 'fulfilled' && r.value === true);
  }

  // Get Phishing Content from KV (similar to getMicrolearning)
  // Note: KVService must be initialized with phishing namespace ID to use this method
  async getPhishing(phishingId: string, language?: string): Promise<any> {
    try {
      const baseKey = `phishing:${phishingId}:base`;
      const base = await this.get(baseKey);

      if (!base) {
        return null;
      }

      const result: any = { base };

      // Use provided language or fallback to first available language from base
      const availableLangs = base.language_availability || [];
      const langToUse = language || (availableLangs.length > 0 ? availableLangs[0] : null);

      if (langToUse) {
        const normalizedLang = langToUse.toLowerCase();
        const emailKey = `phishing:${phishingId}:email:${normalizedLang}`;
        const landingKey = `phishing:${phishingId}:landing:${normalizedLang}`;
        result.email = await this.get(emailKey);
        result.landing = await this.get(landingKey);
      }

      return result;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to get phishing`, { phishingId, error: err.message, stack: err.stack });
      return null;
    }
  }


  async getMicrolearning(microlearningId: string, language?: string): Promise<any> {
    try {
      const baseKey = `ml:${microlearningId}:base`;
      const base = await this.get(baseKey);

      if (!base) {
        return null;
      }

      const result: any = { base };

      if (language) {
        const langKey = `ml:${microlearningId}:lang:${language}`;
        result.language = await this.get(langKey);
      }

      return result;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to get microlearning`, { microlearningId, error: err.message, stack: err.stack });
      return null;
    }
  }

  // Store language content
  async storeLanguageContent(microlearningId: string, language: string, content: any): Promise<boolean> {
    try {
      const normalizedLang = language.toLowerCase(); // Normalize to lowercase for consistency
      const langKey = `ml:${microlearningId}:lang:${normalizedLang}`;
      const success = await this.put(langKey, content);

      if (success) {
        this.logger.info(`Language content stored in KV`, { langKey });
      } else {
        this.logger.error(`Failed to store language content`, { langKey });
      }

      return success;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to store language content`, { microlearningId, language, error: err.message, stack: err.stack });
      return false;
    }
  }

  // Update microlearning base structure only
  async updateMicrolearning(microlearning: any): Promise<boolean> {
    try {
      const microlearningId = microlearning.microlearning_id;
      if (!microlearningId) {
        const errorInfo = errorService.validation('Microlearning ID is required', { operation: 'saveMicrolearning' });
        logErrorInfo(this.logger, 'error', 'Microlearning ID validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      const baseKey = `ml:${microlearningId}:base`;
      const success = await this.put(baseKey, microlearning);

      if (success) {
        this.logger.info(`Microlearning base updated in KV`, { baseKey });
      } else {
        this.logger.error(`Failed to update microlearning base`, { baseKey });
      }

      return success;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to update microlearning`, { microlearningId: microlearning?.microlearning_id, error: err.message, stack: err.stack });
      return false;
    }
  }

  // Atomically update language_availability (read-modify-write)
  async updateLanguageAvailabilityAtomic(microlearningId: string, newLanguages: string | string[]): Promise<boolean> {
    try {
      const baseKey = `ml:${microlearningId}:base`;
      const baseData = await this.get(baseKey);

      if (!baseData?.microlearning_metadata) {
        const errorInfo = errorService.notFound('Microlearning not found or invalid', {
          microlearningId,
          operation: 'getMicrolearning'
        });
        logErrorInfo(this.logger, 'error', 'Microlearning validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      // Merge existing + new languages
      const existing = baseData.microlearning_metadata.language_availability || [];
      const toAdd = Array.isArray(newLanguages) ? newLanguages : [newLanguages];
      // Normalize to lowercase first, then deduplicate with Set
      const normalized = [...existing, ...toAdd].map((l: string) => l.toLowerCase());
      const merged = [...new Set(normalized)].sort();

      // Single atomic update
      baseData.microlearning_metadata.language_availability = merged;
      const success = await this.put(baseKey, baseData);

      if (success) {
        this.logger.info(`Updated language_availability`, { languages: merged, microlearningId });
      }
      return success;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to update language availability`, { microlearningId, error: err.message, stack: err.stack });
      return false;
    }
  }

  // Store inbox content for a specific department and language
  async storeInboxContent(microlearningId: string, department: string, language: string, inboxPayload: any): Promise<boolean> {
    try {
      const normalizedLang = language.toLowerCase(); // Normalize to lowercase for consistency
      const inboxKey = `ml:${microlearningId}:inbox:${department}:${normalizedLang}`;
      const success = await this.put(inboxKey, inboxPayload);

      if (success) {
        this.logger.info(`Inbox content stored in KV`, { inboxKey });
      } else {
        this.logger.error(`Failed to store inbox content`, { inboxKey });
      }

      return success;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to store inbox content`, { microlearningId, department, language, error: err.message, stack: err.stack });
      return false;
    }
  }

  // Get inbox content for a specific department and language
  async getInboxContent(microlearningId: string, department: string, language: string): Promise<any | null> {
    try {
      const inboxKey = `ml:${microlearningId}:inbox:${department}:${language}`;
      const inbox = await this.get(inboxKey);

      if (inbox) {
        this.logger.info(`Inbox content retrieved from KV`, { inboxKey });
      }

      return inbox;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to get inbox content`, { microlearningId, department, language, error: err.message, stack: err.stack });
      return null;
    }
  }

  // Search microlearnings by title or ID
  async searchMicrolearnings(searchTerm: string): Promise<any[]> {
    try {
      // List all microlearning base keys
      const baseKeys = await this.list('ml:', 100);
      const microlearningKeys = baseKeys.filter(key => key.includes(':base'));

      const results: any[] = [];

      // Check each microlearning for title match
      for (const key of microlearningKeys.slice(0, 10)) { // Limit to first 10 to avoid timeouts
        try {
          const microlearning = await this.get(key);
          if (microlearning && microlearning.microlearning_metadata) {
            const title = microlearning.microlearning_metadata.title || '';
            const id = microlearning.microlearning_id || '';

            // Check if search term matches title or ID (case insensitive)
            if (
              title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              id.toLowerCase().includes(searchTerm.toLowerCase()) ||
              searchTerm.toLowerCase().includes(title.toLowerCase())
            ) {
              results.push(microlearning);
            }
          }
        } catch (error) {
          const err = normalizeError(error);
          this.logger.warn(`Failed to check microlearning`, { key, error: err.message });
        }
      }

      return results;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Failed to search microlearnings`, { searchTerm, error: err.message, stack: err.stack });
      return [];
    }
  }

  // Check if namespace exists and is accessible
  async checkNamespace(): Promise<boolean> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (response.ok) {
        return true;
      } else {
        const errorText = await response.text();
        this.logger.error(`Namespace check failed`, { status: response.status, errorText: errorText.substring(0, 200) });
        return false;
      }
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`Namespace check error`, { error: err.message, stack: err.stack });
      return false;
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // First check if namespace exists
      const namespaceOk = await this.checkNamespace();
      if (!namespaceOk) {
        this.logger.error(`KV health check failed: namespace inaccessible`);
        return false;
      }

      const testKey = 'health_check_' + Date.now();
      const testValue = { timestamp: new Date().toISOString() };

      // Test PUT operation
      const putResult = await this.put(testKey, testValue);
      if (!putResult) {
        this.logger.error(`KV health check failed: PUT operation failed`);
        return false;
      }

      // Test GET operation
      const getValue = await this.get(testKey);
      if (!getValue || getValue.timestamp !== testValue.timestamp) {
        this.logger.error(`KV health check failed: GET operation failed`);
        return false;
      }

      // Test DELETE operation
      await this.delete(testKey);

      return true;
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error(`KV health check failed`, { error: err.message, stack: err.stack });
      return false;
    }
  }
}