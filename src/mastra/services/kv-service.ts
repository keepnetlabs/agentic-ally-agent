// KV Service for direct Cloudflare KV REST API operations
export class KVService {
  private accountId: string;
  private apiToken: string;
  private apiKey: string;
  private namespaceId: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_KV_TOKEN || '';
    this.apiKey = ''; // Not using legacy API key
    this.namespaceId = 'c96ef0b5a2424edca1426f6e7a85b9dc'; // MICROLEARNING_KV namespace ID

    // Validate required environment variables
    if (!this.accountId) {
      console.warn('CLOUDFLARE_ACCOUNT_ID not found in environment variables');
    }
    if (!this.apiToken) {
      console.warn('CLOUDFLARE_KV_TOKEN (or API_TOKEN/API_KEY) not found in environment variables');
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
        console.error(`KV PUT failed for key ${key}:`, response.status, errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`KV PUT error for key ${key}:`, error);
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
      } catch {
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
    const normalizedLang = language.toLowerCase(); // Normalize to lowercase for consistency
    const baseKey = `ml:${microlearningId}:base`;
    const langKey = `ml:${microlearningId}:lang:${normalizedLang}`;
    const inboxKey = `ml:${microlearningId}:inbox:${department}:${normalizedLang}`;

    try {
      // Save base microlearning structure
      const baseSuccess = await this.put(baseKey, {
        ...data.microlearning,
        microlearning_id: microlearningId
      });

      // Save language content
      const langSuccess = await this.put(langKey, data.languageContent);

      // Save inbox content
      console.log(`📥 Saving inbox content to KV: ${inboxKey}`, typeof data.inboxContent, Object.keys(data.inboxContent || {}));
      const inboxSuccess = await this.put(inboxKey, data.inboxContent);

      const allSuccess = baseSuccess && langSuccess && inboxSuccess;

      if (allSuccess) {
        console.log(`🎉 All microlearning data saved to KV: ${microlearningId}`);
      } else {
        console.warn(`⚠️ Partial save to KV for: ${microlearningId}`);
      }

      return allSuccess;
    } catch (error) {
      console.error(`Failed to save microlearning ${microlearningId}:`, error);
      return false;
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