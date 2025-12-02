import { Logger, startTimer } from '../utils/logger';
import { RETRY } from '../constants';

/**
 * KV Service for direct Cloudflare KV REST API operations
 * Provides type-safe operations with retry logic and structured logging
 */
export class KVService {
  private accountId: string;
  private apiToken: string;
  private apiKey: string;
  private namespaceId: string;
  private logger: Logger;

  constructor(namespaceIdOverride?: string) {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_KV_TOKEN || '';
    this.apiKey = ''; // Not using legacy API key
    this.namespaceId = namespaceIdOverride || process.env.MICROLEARNING_KV_NAMESPACE_ID || ''; // Use override or default
    this.logger = new Logger('KVService');

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
      const url = this.getKVUrl(key);
      const body = typeof value === 'string' ? value : JSON.stringify(value);

      const headers = this.getHeaders();

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: body
      });

      const duration = timer.end();

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`KV PUT failed for key`, {
          key,
          status: response.status,
          duration,
          errorText: errorText.substring(0, 200), // Limit error text length
        });
        return false;
      }

      this.logger.debug(`KV PUT success`, { key, duration });
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`KV PUT operation failed`, errorMsg, {
        key,
        valueType: typeof value,
      });
      return false;
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      const url = this.getKVUrl(key);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Key not found
        }
        const errorText = await response.text();
        console.error(`KV GET failed for key ${key}:`, response.status, errorText);
        return null;
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse KV value as JSON for key ${key}, returning as string`, {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          textLength: text.length,
        });
        return text; // Return as string if not JSON
      }
    } catch (error) {
      console.error(`KV GET error for key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const url = this.getKVUrl(key);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`KV DELETE failed for key ${key}:`, response.status, errorText);
        return false;
      }

      console.log(`✅ KV DELETE success for key: ${key}`);
      return true;
    } catch (error) {
      console.error(`KV DELETE error for key ${key}:`, error);
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
        console.error(`KV LIST failed:`, response.status, errorText);
        return [];
      }

      const data = await response.json();
      return data.result?.map((item: any) => item.name) || [];
    } catch (error) {
      console.error(`KV LIST error:`, error);
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
        this.putWithRetry(baseKey, {
          ...data.microlearning,
          microlearning_id: microlearningId
        }),
        this.putWithRetry(langKey, data.languageContent),
        this.putWithRetryWithLogging(
          inboxKey,
          data.inboxContent,
          typeof data.inboxContent,
          Object.keys(data.inboxContent || {})
        ),
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
          this.logger.error(`Base microlearning save failed`, baseResult.reason, { microlearningId });
        }
        if (langResult.status === 'rejected') {
          this.logger.error(`Language content save failed`, langResult.reason, { microlearningId });
        }
        if (inboxResult.status === 'rejected') {
          this.logger.error(`Inbox content save failed`, inboxResult.reason, { microlearningId });
        }
      }

      return allSuccess;
    } catch (error) {
      const errorMsg = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to save microlearning`, errorMsg, {
        microlearningId,
        language: normalizedLang,
        department,
        duration: timer.end(),
      });
      return false;
    }
  }

  // Phishing specific methods
  async savePhishing(id: string, data: any, language: string): Promise<boolean> {
    const timer = startTimer();
    const normalizedLang = language.toLowerCase();
    const baseKey = `phishing:${id}:base`;
    const langKey = `phishing:${id}:lang:${normalizedLang}`;

    try {
      this.logger.info(`Saving phishing content to KV`, { id, language: normalizedLang });

      // Prepare Base Data (Meta only)
      const baseData = {
        id,
        name: data.analysis?.name,
        description: data.analysis?.description,
        topic: data.analysis?.scenario || 'Unknown Topic',
        difficulty: data.analysis?.difficulty || 'Medium',
        method: data.analysis?.method || 'Click-Only', // Renamed from attackType
        targetProfile: data.analysis?.targetAudienceAnalysis || {},
        createdAt: new Date().toISOString(),
        language_availability: [normalizedLang]
      };

      // Prepare Language Data (Content)
      const langData = {
        id,
        language: normalizedLang,
        subject: data.subject,
        template: data.template, // Renamed from bodyHtml
        fromAddress: data.fromAddress,
        fromName: data.fromName,
        redFlags: data.analysis?.keyRedFlags || []
      };

      const [baseResult, langResult] = await Promise.allSettled([
        this.putWithRetry(baseKey, baseData),
        this.putWithRetry(langKey, langData)
      ]);

      const baseSuccess = baseResult.status === 'fulfilled' && baseResult.value === true;
      const langSuccess = langResult.status === 'fulfilled' && langResult.value === true;

      if (baseSuccess && langSuccess) {
        this.logger.info(`✅ Phishing content stored in KV: ${id} (${normalizedLang})`, { duration: timer.end() });
        return true;
      } else {
        this.logger.error(`❌ Failed to store phishing content completely`, undefined, { baseSuccess, langSuccess });
        return false;
      }

    } catch (error) {
      this.logger.error(`Failed to save phishing content ${id}:`, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Helper method: PUT with exponential backoff retry
   * Retries up to RETRY.MAX_ATTEMPTS times with exponential backoff
   */
  private async putWithRetry(key: string, value: any, maxRetries: number = RETRY.MAX_ATTEMPTS): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.put(key, value);
        if (result) {
          if (attempt > 0) {
            console.log(`✅ KV PUT succeeded on retry ${attempt} for key: ${key}`);
          }
          return true;
        }
      } catch (error) {
        console.warn(`KV PUT attempt ${attempt + 1}/${maxRetries} failed for ${key}:`, error);
        if (attempt < maxRetries - 1) {
          const delay = RETRY.getBackoffDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    return false;
  }

  /**
   * Helper method: PUT with logging and retry
   */
  private async putWithRetryWithLogging(
    key: string,
    value: any,
    typeInfo: string,
    keyInfo: string[]
  ): Promise<boolean> {
    this.logger.debug(`Saving inbox content`, {
      key,
      valueType: typeInfo,
      keys: keyInfo,
    });
    return this.putWithRetry(key, value);
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
      console.error(`Failed to get microlearning ${microlearningId}:`, error);
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
        console.log(`✅ Language content stored in KV: ${langKey}`);
      } else {
        console.error(`❌ Failed to store language content: ${langKey}`);
      }

      return success;
    } catch (error) {
      console.error(`Failed to store language content ${microlearningId}/${language}:`, error);
      return false;
    }
  }

  // Update microlearning base structure only
  async updateMicrolearning(microlearning: any): Promise<boolean> {
    try {
      const microlearningId = microlearning.microlearning_id;
      if (!microlearningId) {
        throw new Error('Microlearning ID is required');
      }

      const baseKey = `ml:${microlearningId}:base`;
      const success = await this.put(baseKey, microlearning);

      if (success) {
        console.log(`✅ Microlearning base updated in KV: ${baseKey}`);
      } else {
        console.error(`❌ Failed to update microlearning base: ${baseKey}`);
      }

      return success;
    } catch (error) {
      console.error(`Failed to update microlearning ${microlearning?.microlearning_id}:`, error);
      return false;
    }
  }

  // Atomically update language_availability (read-modify-write)
  async updateLanguageAvailabilityAtomic(microlearningId: string, newLanguages: string | string[]): Promise<boolean> {
    try {
      const baseKey = `ml:${microlearningId}:base`;
      const baseData = await this.get(baseKey);

      if (!baseData?.microlearning_metadata) {
        throw new Error('Microlearning not found or invalid');
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
        console.log(`✅ Updated language_availability: [${merged.join(', ')}]`);
      }
      return success;
    } catch (error) {
      console.error(`Failed to update language availability ${microlearningId}:`, error);
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
        console.log(`✅ Inbox content stored in KV: ${inboxKey}`);
      } else {
        console.error(`❌ Failed to store inbox content: ${inboxKey}`);
      }

      return success;
    } catch (error) {
      console.error(`Failed to store inbox content ${microlearningId}/${department}/${language}:`, error);
      return false;
    }
  }

  // Get inbox content for a specific department and language
  async getInboxContent(microlearningId: string, department: string, language: string): Promise<any | null> {
    try {
      const inboxKey = `ml:${microlearningId}:inbox:${department}:${language}`;
      const inbox = await this.get(inboxKey);

      if (inbox) {
        console.log(`✅ Inbox content retrieved from KV: ${inboxKey}`);
      }

      return inbox;
    } catch (error) {
      console.error(`Failed to get inbox content ${microlearningId}/${department}/${language}:`, error);
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
          console.warn(`Failed to check microlearning ${key}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error(`Failed to search microlearnings for "${searchTerm}":`, error);
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
        console.error('Namespace check failed:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('Namespace check error:', error);
      return false;
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // First check if namespace exists
      const namespaceOk = await this.checkNamespace();
      if (!namespaceOk) {
        console.error('KV health check failed: namespace inaccessible');
        return false;
      }

      const testKey = 'health_check_' + Date.now();
      const testValue = { timestamp: new Date().toISOString() };

      // Test PUT operation
      const putResult = await this.put(testKey, testValue);
      if (!putResult) {
        console.error('KV health check failed: PUT operation failed');
        return false;
      }

      // Test GET operation
      const getValue = await this.get(testKey);
      if (!getValue || getValue.timestamp !== testValue.timestamp) {
        console.error('KV health check failed: GET operation failed');
        return false;
      }

      // Test DELETE operation
      await this.delete(testKey);

      return true;
    } catch (error) {
      console.error('KV health check failed:', error);
      return false;
    }
  }
}