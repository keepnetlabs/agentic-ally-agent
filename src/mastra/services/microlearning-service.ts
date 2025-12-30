import { MicrolearningContent, LanguageContent, DepartmentInbox } from '../types/microlearning';

export class MicrolearningService {
  private static contentStorage: Map<string, MicrolearningContent> = new Map();
  private static languageContentStorage: Map<string, LanguageContent> = new Map();
  private static departmentInboxes: Map<string, DepartmentInbox> = new Map();

  /**
   * Store microlearning content
   */
  async storeMicrolearning(content: MicrolearningContent): Promise<void> {
    MicrolearningService.contentStorage.set(content.microlearning_id, content);

    // Simple monitoring - log cache size periodically
    const cacheSize = MicrolearningService.contentStorage.size;
    if (cacheSize % 10 === 0 || cacheSize > 30) {
      console.log(`📊 In-memory cache size: ${cacheSize} items (~${Math.round(cacheSize * 50 / 1024)}MB estimated)`);
    }
  }

  /**
   * Retrieve cached microlearning content if available
   */
  static getCachedMicrolearning(microlearningId: string): MicrolearningContent | undefined {
    return MicrolearningService.contentStorage.get(microlearningId);
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    const count = MicrolearningService.contentStorage.size;
    return {
      microlearningCount: count,
      estimatedSizeMB: Math.round((count * 50 / 1024) * 100) / 100 // Assuming ~50KB per item
    };
  }

  /**
   * Store language-specific content
   */
  async storeLanguageContent(microlearningId: string, languageCode: string, content: LanguageContent): Promise<void> {
    const key = `${microlearningId}_${languageCode}`;
    MicrolearningService.languageContentStorage.set(key, content);
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
    let inbox = MicrolearningService.departmentInboxes.get(key);

    if (!inbox) {
      inbox = {
        department,
        inbox_items: [],
        last_updated: new Date().toISOString()
      };
    }

    // Ensure inbox_items exists (defensive programming)
    if (!inbox.inbox_items) {
      inbox.inbox_items = [];
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
    MicrolearningService.departmentInboxes.set(key, inbox);
  }

}