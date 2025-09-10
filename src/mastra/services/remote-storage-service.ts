import { MicrolearningContent, LanguageContent } from '../types/microlearning';

export class RemoteStorageService {
    private baseUrl?: string;

    constructor() {
        this.baseUrl = process?.env?.REMOTE_STORAGE_URL || 'https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning';
    }

    // Removed generic /save fallback per requirement; only KV endpoints are used now

    async saveMicrolearning(microlearningId: string, content: MicrolearningContent) {
        // Prefer KV-backed Worker endpoint: {baseUrl}/{microlearningId}?load-base=true
        if (this.baseUrl) {
            try {
                const url = `${this.baseUrl.replace(/\/$/, '')}/${encodeURIComponent(microlearningId)}?load-base=true`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ microlearning: content })
                });
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(`KV save (load-base) failed (${res.status}): ${text}`);
                }
                return { success: true };
            } catch (error) {
                console.error(`[RemoteStorageService] KV load-base save failed for ${microlearningId}:`, error);
                return { success: false, error: (error as Error).message };
            }
        }
        // No baseUrl configured → skip
        console.warn(`[RemoteStorageService] REMOTE_STORAGE_URL not set. Skipping remote save for ${microlearningId}.json`);
        return { success: false, skipped: true };
    }

    async saveLanguageFile(microlearningId: string, languageCode: string, content: LanguageContent) {
        if (this.baseUrl) {
            try {
                const url = `${this.baseUrl.replace(/\/$/, '')}/${encodeURIComponent(microlearningId)}?load-language=true`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        microlearning: { microlearning_id: microlearningId },
                        languages: { [languageCode]: content }
                    })
                });
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(`KV save (load-language) failed (${res.status}): ${text}`);
                }
                return { success: true };
            } catch (error) {
                console.error(`[RemoteStorageService] KV load-language save failed for ${microlearningId}/${languageCode}:`, error);
                return { success: false, error: (error as Error).message };
            }
        }
        console.warn(`[RemoteStorageService] REMOTE_STORAGE_URL not set. Skipping remote save for ${microlearningId}/${languageCode}.json`);
        return { success: false, skipped: true };
    }

    async upsertInbox(departmentOrAll: string, languageCode: string, microlearningId: string, inboxPayload: any) {
        if (this.baseUrl) {
            try {
                const url = `${this.baseUrl.replace(/\/$/, '')}/${encodeURIComponent(microlearningId)}?load-inbox=true`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        microlearning: { microlearning_id: microlearningId },
                        inbox: { [departmentOrAll]: { [languageCode]: inboxPayload } }
                    })
                });
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(`KV save (load-inbox) failed (${res.status}): ${text}`);
                }
                return { success: true };
            } catch (error) {
                console.error(`[RemoteStorageService] KV load-inbox save failed for ${departmentOrAll}/${languageCode}:`, error);
                return { success: false, error: (error as Error).message };
            }
        }
        console.warn(`[RemoteStorageService] REMOTE_STORAGE_URL not set. Skipping remote save for inbox/${departmentOrAll}/${languageCode}.json`);
        return { success: false, skipped: true };
    }
}
