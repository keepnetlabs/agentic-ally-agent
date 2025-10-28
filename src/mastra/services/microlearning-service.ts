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
   * Store language-specific content
   */
  async storeLanguageContent(microlearningId: string, languageCode: string, content: LanguageContent): Promise<void> {
    const key = `${microlearningId}_${languageCode}`;
    this.languageContentStorage.set(key, content);
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