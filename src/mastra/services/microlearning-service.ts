import { MicrolearningContent, LanguageContent, DepartmentInbox } from '../types/microlearning';

export class MicrolearningService {
  private contentStorage: Map<string, MicrolearningContent> = new Map();
  private languageContentStorage: Map<string, LanguageContent> = new Map();
  private departmentInboxes: Map<string, DepartmentInbox> = new Map();

  /**
   * Store microlearning content
   */
  async storeMicrolearning(content: MicrolearningContent): Promise<void> {
    this.contentStorage.set(content.microlearning_id, content);
  }

  /**
   * Retrieve microlearning content by id
   */
  async getMicrolearningById(microlearningId: string): Promise<MicrolearningContent | undefined> {
    // Önce memory'de kontrol et
    let content = this.contentStorage.get(microlearningId);

    if (!content) {
      // Backend'den çek
      try {
        const response = await fetch(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}`);
        if (response.ok) {
          content = await response.json();
          // Memory'e cache'le
          this.contentStorage.set(microlearningId, content as MicrolearningContent);
        }
      } catch (error) {
        console.error('Backend fetch failed:', error);
      }
    }

    return content;
  }

  /**
   * Store language-specific content
   */
  async storeLanguageContent(microlearningId: string, languageCode: string, content: LanguageContent): Promise<void> {
    const key = `${microlearningId}_${languageCode}`;
    this.languageContentStorage.set(key, content);
  }

  /**
   * Retrieve language-specific content by id and language
   */
  async getLanguageContent(microlearningId: string, languageCode: string): Promise<LanguageContent | undefined> {
    const key = `${microlearningId}_${languageCode}`;
    let content = this.languageContentStorage.get(key);

    if (!content) {
      // Backend'den çek
      try {
        const response = await fetch(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}/lang/${languageCode}`);
        if (response.ok) {
          content = await response.json();
          // Memory'e cache'le
          this.languageContentStorage.set(key, content as LanguageContent);
        }
      } catch (error) {
        console.error('Backend language content fetch failed:', error);
      }
    }

    return content;
  }

  /** Get department inbox by key */
  async getDepartmentInbox(microlearningId: string, department: string, languageCode: string): Promise<DepartmentInbox | undefined> {
    const key = `${department}_${languageCode}`;
    let inbox = this.departmentInboxes.get(key);

    if (!inbox) {
      // Backend'den çek
      try {
        const response = await fetch(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}/inbox/${department}/${languageCode}`);
        if (response.ok) {
          inbox = await response.json();
          // Memory'e cache'le
          this.departmentInboxes.set(key, inbox as DepartmentInbox);
        }
      } catch (error) {
        console.error('Backend inbox fetch failed:', error);
      }
    }

    return inbox;
  }

  /**
   * Add microlearning to department inbox
   */
  async assignMicrolearningToDepartment(
    department: string,
    languageCode: string,
    microlearningId: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    dueDate?: string
  ): Promise<void> {
    const key = `${department}_${languageCode}`;
    let inbox = this.departmentInboxes.get(key);

    if (!inbox) {
      inbox = {
        department,
        inbox_items: [],
        last_updated: new Date().toISOString()
      };
    }

    // Check if already assigned
    const existingItem = inbox.inbox_items.find(item => item.microlearning_id === microlearningId);
    if (existingItem) {
      // Update existing assignment
      existingItem.priority = priority;
      if (dueDate) existingItem.due_date = dueDate;
      existingItem.assigned_date = new Date().toISOString();
    } else {
      // Add new assignment
      inbox.inbox_items.push({
        microlearning_id: microlearningId,
        assigned_date: new Date().toISOString(),
        due_date: dueDate,
        status: 'pending',
        priority
      });
    }

    inbox.last_updated = new Date().toISOString();
    this.departmentInboxes.set(key, inbox);
  }

}