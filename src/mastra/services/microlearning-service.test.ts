import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MicrolearningService } from './microlearning-service';
import {
  createMicrolearningContent,
  createLanguageContent,
} from '../../../src/__tests__/factories/microlearning-factory';
import '../../../src/__tests__/setup';

const { mockLoggerInfo } = vi.hoisted(() => ({
  mockLoggerInfo: vi.fn(),
}));
vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({ info: mockLoggerInfo, debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

/**
 * Clears all three static Maps so tests start with a clean slate.
 * Accesses private statics via cast to `any`.
 */
function clearStaticStorage(): void {
  (MicrolearningService as any).contentStorage.clear();
  (MicrolearningService as any).languageContentStorage.clear();
  (MicrolearningService as any).departmentInboxes.clear();
}

/**
 * Test Suite: MicrolearningService
 * Tests for in-memory microlearning content storage.
 * Covers: storeMicrolearning, getCachedMicrolearning, getCacheStats,
 *         storeLanguageContent, assignMicrolearningToDepartment
 */
describe('MicrolearningService', () => {
  let service: MicrolearningService;

  beforeEach(() => {
    service = new MicrolearningService();
    clearStaticStorage();
    mockLoggerInfo.mockClear();
  });

  // ─── storeMicrolearning ────────────────────────────────────────────

  describe('storeMicrolearning', () => {
    it('should store content and make it retrievable via getCachedMicrolearning', async () => {
      const content = createMicrolearningContent({ microlearning_id: 'ml-1' });

      await service.storeMicrolearning(content);

      const cached = MicrolearningService.getCachedMicrolearning('ml-1');
      expect(cached).toBeDefined();
      expect(cached!.microlearning_id).toBe('ml-1');
    });

    it('should overwrite content when storing the same ID twice', async () => {
      const original = createMicrolearningContent({
        microlearning_id: 'ml-dup',
        microlearning_metadata: { title: 'Original' },
      });
      const updated = createMicrolearningContent({
        microlearning_id: 'ml-dup',
        microlearning_metadata: { title: 'Updated' },
      });

      await service.storeMicrolearning(original);
      await service.storeMicrolearning(updated);

      const cached = MicrolearningService.getCachedMicrolearning('ml-dup');
      expect(cached!.microlearning_metadata.title).toBe('Updated');
    });

    it('should increment cache size correctly for distinct IDs', async () => {
      await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'a' }));
      await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'b' }));

      expect(MicrolearningService.getCacheStats().microlearningCount).toBe(2);
    });

    it('should not increment cache size when the same ID is re-stored', async () => {
      await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'same' }));
      await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'same' }));

      expect(MicrolearningService.getCacheStats().microlearningCount).toBe(1);
    });

    it('should store content that includes full scene metadata', async () => {
      const content = createMicrolearningContent({
        microlearning_id: 'ml-scenes',
        scenes: [
          {
            scene_id: '1',
            metadata: {
              scene_type: 'intro',
              points: 10,
              duration_seconds: 15,
              hasAchievementNotification: false,
              scientific_basis: 'Dual-coding theory',
              icon: { sceneIconName: 'shield' },
            },
          },
          {
            scene_id: '5',
            metadata: {
              scene_type: 'quiz',
              points: 30,
              duration_seconds: 60,
              hasAchievementNotification: true,
              scientific_basis: 'Testing effect',
              icon: { sceneIconName: 'question', sparkleIconName: 'sparkle' },
            },
          },
        ],
      });

      await service.storeMicrolearning(content);

      const cached = MicrolearningService.getCachedMicrolearning('ml-scenes');
      expect(cached!.scenes).toHaveLength(2);
      expect(cached!.scenes[1].metadata.scene_type).toBe('quiz');
    });
  });

  // ─── getCachedMicrolearning ────────────────────────────────────────

  describe('getCachedMicrolearning', () => {
    it('should return undefined for an ID that was never stored', () => {
      expect(MicrolearningService.getCachedMicrolearning('non-existent')).toBeUndefined();
    });

    it('should return undefined for an empty string ID', () => {
      expect(MicrolearningService.getCachedMicrolearning('')).toBeUndefined();
    });

    it('should return the exact object reference that was stored', async () => {
      const content = createMicrolearningContent({ microlearning_id: 'ml-ref' });
      await service.storeMicrolearning(content);

      const cached = MicrolearningService.getCachedMicrolearning('ml-ref');
      expect(cached).toBe(content); // same reference
    });

    it('should distinguish between similarly-named IDs', async () => {
      await service.storeMicrolearning(
        createMicrolearningContent({ microlearning_id: 'ml-1', microlearning_metadata: { title: 'One' } })
      );
      await service.storeMicrolearning(
        createMicrolearningContent({ microlearning_id: 'ml-10', microlearning_metadata: { title: 'Ten' } })
      );

      expect(MicrolearningService.getCachedMicrolearning('ml-1')!.microlearning_metadata.title).toBe('One');
      expect(MicrolearningService.getCachedMicrolearning('ml-10')!.microlearning_metadata.title).toBe('Ten');
    });
  });

  // ─── getCacheStats ─────────────────────────────────────────────────

  describe('getCacheStats', () => {
    it('should return zero counts when cache is empty', () => {
      const stats = MicrolearningService.getCacheStats();
      expect(stats).toEqual({ microlearningCount: 0, estimatedSizeMB: 0 });
    });

    it('should count items correctly after storing', async () => {
      await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'a' }));
      await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'b' }));
      await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'c' }));

      const stats = MicrolearningService.getCacheStats();
      expect(stats.microlearningCount).toBe(3);
    });

    it('should compute estimatedSizeMB using 50KB-per-item formula', async () => {
      // Formula: Math.round(((count * 50) / 1024) * 100) / 100
      // For count=20 => round((20*50/1024)*100)/100 = round(97.65625)/100 = 0.98
      for (let i = 0; i < 20; i++) {
        await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: `s-${i}` }));
      }

      const stats = MicrolearningService.getCacheStats();
      expect(stats.microlearningCount).toBe(20);
      expect(stats.estimatedSizeMB).toBe(Math.round(((20 * 50) / 1024) * 100) / 100);
    });

    it('should return number type for estimatedSizeMB', () => {
      const stats = MicrolearningService.getCacheStats();
      expect(typeof stats.estimatedSizeMB).toBe('number');
    });
  });

  // ─── storeLanguageContent ──────────────────────────────────────────

  describe('storeLanguageContent', () => {
    it('should store and retrieve language content via the private map', async () => {
      const langContent = createLanguageContent({ '1': { ...createLanguageContent()['1'], title: 'Hello' } });

      await service.storeLanguageContent('ml-1', 'en', langContent);

      const storage = (MicrolearningService as any).languageContentStorage as Map<string, any>;
      expect(storage.has('ml-1_en')).toBe(true);
      expect(storage.get('ml-1_en')['1'].title).toBe('Hello');
    });

    it('should store the same microlearning in multiple languages separately', async () => {
      const enContent = createLanguageContent({ '1': { ...createLanguageContent()['1'], title: 'English' } });
      const trContent = createLanguageContent({ '1': { ...createLanguageContent()['1'], title: 'Türkçe' } });

      await service.storeLanguageContent('ml-1', 'en', enContent);
      await service.storeLanguageContent('ml-1', 'tr', trContent);

      const storage = (MicrolearningService as any).languageContentStorage as Map<string, any>;
      expect(storage.size).toBe(2);
      expect(storage.get('ml-1_en')['1'].title).toBe('English');
      expect(storage.get('ml-1_tr')['1'].title).toBe('Türkçe');
    });

    it('should overwrite when the same microlearning+language key is stored again', async () => {
      const v1 = createLanguageContent({ '1': { ...createLanguageContent()['1'], title: 'V1' } });
      const v2 = createLanguageContent({ '1': { ...createLanguageContent()['1'], title: 'V2' } });

      await service.storeLanguageContent('ml-1', 'en', v1);
      await service.storeLanguageContent('ml-1', 'en', v2);

      const storage = (MicrolearningService as any).languageContentStorage as Map<string, any>;
      expect(storage.size).toBe(1);
      expect(storage.get('ml-1_en')['1'].title).toBe('V2');
    });

    it('should handle empty language code gracefully', async () => {
      const content = createLanguageContent();
      await expect(service.storeLanguageContent('ml-1', '', content)).resolves.not.toThrow();

      const storage = (MicrolearningService as any).languageContentStorage as Map<string, any>;
      expect(storage.has('ml-1_')).toBe(true);
    });

    it('should handle complex multi-scene language content', async () => {
      const baseScene = createLanguageContent()['1'];
      const languageContent = createLanguageContent({
        '1': baseScene,
        '2': {
          ...baseScene,
          scene_type: 'goal',
          title: 'Goals',
          goals: [],
          callToActionText: 'Next',
        } as any,
      });

      await expect(service.storeLanguageContent('ml-multi', 'de', languageContent)).resolves.not.toThrow();
    });
  });

  // ─── assignMicrolearningToDepartment ───────────────────────────────

  describe('assignMicrolearningToDepartment', () => {
    const getInboxes = () => (MicrolearningService as any).departmentInboxes as Map<string, any>;

    it('should create a new inbox entry when the department+language combination is new', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'high');

      const inbox = getInboxes().get('IT_en');
      expect(inbox).toBeDefined();
      expect(inbox.department).toBe('IT');
      expect(inbox.inbox_items).toHaveLength(1);
      expect(inbox.inbox_items[0]).toMatchObject({
        microlearning_id: 'ml-1',
        status: 'pending',
        priority: 'high',
      });
    });

    it('should add multiple items to the same department inbox', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'high');
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-2', 'low');
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-3', 'medium');

      const inbox = getInboxes().get('IT_en');
      expect(inbox.inbox_items).toHaveLength(3);
      expect(inbox.inbox_items.map((i: any) => i.microlearning_id)).toEqual(['ml-1', 'ml-2', 'ml-3']);
    });

    it('should update priority when re-assigning an existing microlearning ID', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'low');
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'high');

      const inbox = getInboxes().get('IT_en');
      expect(inbox.inbox_items).toHaveLength(1);
      expect(inbox.inbox_items[0].priority).toBe('high');
    });

    it('should update due_date when re-assigning with a new due date', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'medium', '2025-06-01');
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'medium', '2025-12-31');

      const inbox = getInboxes().get('IT_en');
      expect(inbox.inbox_items[0].due_date).toBe('2025-12-31');
    });

    it('should NOT clear due_date when re-assigning without a due date', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'medium', '2025-06-01');
      // Re-assign without dueDate — the `if (dueDate)` guard should leave existing due_date
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'high');

      const inbox = getInboxes().get('IT_en');
      expect(inbox.inbox_items[0].due_date).toBe('2025-06-01');
    });

    it('should update assigned_date when re-assigning', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'low');
      const firstDate = getInboxes().get('IT_en').inbox_items[0].assigned_date;

      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 5));
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1', 'high');
      const secondDate = getInboxes().get('IT_en').inbox_items[0].assigned_date;

      expect(secondDate).not.toBe(firstDate);
    });

    it('should set due_date as undefined when not provided for new assignment', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-no-due');

      const inbox = getInboxes().get('IT_en');
      expect(inbox.inbox_items[0].due_date).toBeUndefined();
    });

    it('should set due_date correctly when provided for new assignment', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-due', 'high', '2025-12-31');

      const inbox = getInboxes().get('IT_en');
      expect(inbox.inbox_items[0].due_date).toBe('2025-12-31');
    });

    it('should default priority to medium when not specified', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-default-pri');

      const inbox = getInboxes().get('IT_en');
      expect(inbox.inbox_items[0].priority).toBe('medium');
    });

    it('should keep separate inboxes for different departments', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1');
      await service.assignMicrolearningToDepartment('HR', 'en', 'ml-2');

      expect(getInboxes().get('IT_en').inbox_items).toHaveLength(1);
      expect(getInboxes().get('HR_en').inbox_items).toHaveLength(1);
    });

    it('should keep separate inboxes for same department in different languages', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1');
      await service.assignMicrolearningToDepartment('IT', 'tr', 'ml-2');

      expect(getInboxes().has('IT_en')).toBe(true);
      expect(getInboxes().has('IT_tr')).toBe(true);
    });

    it('should update last_updated on the inbox', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-1');
      const first = getInboxes().get('IT_en').last_updated;

      await new Promise(r => setTimeout(r, 5));
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-2');
      const second = getInboxes().get('IT_en').last_updated;

      expect(second).not.toBe(first);
    });

    it('should set new item status to pending', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-new');

      const inbox = getInboxes().get('IT_en');
      expect(inbox.inbox_items[0].status).toBe('pending');
    });

    it('should handle all three priority levels', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-lo', 'low');
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-md', 'medium');
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-hi', 'high');

      const items = getInboxes().get('IT_en').inbox_items;
      expect(items[0].priority).toBe('low');
      expect(items[1].priority).toBe('medium');
      expect(items[2].priority).toBe('high');
    });
  });

  // ─── assignMicrolearningToDepartment — edge cases ──────────────────

  describe('assignMicrolearningToDepartment - edge cases', () => {
    const getInboxes = () => (MicrolearningService as any).departmentInboxes as Map<string, any>;

    it('should handle empty department name', async () => {
      await service.assignMicrolearningToDepartment('', 'en', 'ml-empty-dept');

      const inbox = getInboxes().get('_en');
      expect(inbox).toBeDefined();
      expect(inbox.department).toBe('');
    });

    it('should handle empty language code', async () => {
      await service.assignMicrolearningToDepartment('IT', '', 'ml-empty-lang');

      const inbox = getInboxes().get('IT_');
      expect(inbox).toBeDefined();
    });

    it('should handle inbox with missing inbox_items array (defensive programming branch)', async () => {
      // Manually insert a corrupted inbox without inbox_items
      const deptInboxes = getInboxes();
      deptInboxes.set('HR_de', {
        department: 'HR',
        last_updated: new Date().toISOString(),
        // inbox_items deliberately missing
      });

      await service.assignMicrolearningToDepartment('HR', 'de', 'ml-defensive');

      const inbox = deptInboxes.get('HR_de');
      expect(inbox.inbox_items).toBeDefined();
      expect(Array.isArray(inbox.inbox_items)).toBe(true);
      expect(inbox.inbox_items).toHaveLength(1);
      expect(inbox.inbox_items[0].microlearning_id).toBe('ml-defensive');
    });

    it('should handle inbox with null inbox_items (defensive programming branch)', async () => {
      const deptInboxes = getInboxes();
      deptInboxes.set('SALES_en', {
        department: 'SALES',
        inbox_items: null as any,
        last_updated: new Date().toISOString(),
      });

      await service.assignMicrolearningToDepartment('SALES', 'en', 'ml-null-items');

      const inbox = deptInboxes.get('SALES_en');
      expect(inbox.inbox_items).toHaveLength(1);
    });

    it('should handle special characters in department and language', async () => {
      await service.assignMicrolearningToDepartment('R&D / Labs', 'en-GB', 'ml-special');

      const inbox = getInboxes().get('R&D / Labs_en-GB');
      expect(inbox).toBeDefined();
      expect(inbox.inbox_items).toHaveLength(1);
    });

    it('should set assigned_date as valid ISO string', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-iso');

      const item = getInboxes().get('IT_en').inbox_items[0];
      expect(new Date(item.assigned_date).toISOString()).toBe(item.assigned_date);
    });

    it('should set last_updated as valid ISO string on creation', async () => {
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-ts');

      const inbox = getInboxes().get('IT_en');
      expect(new Date(inbox.last_updated).toISOString()).toBe(inbox.last_updated);
    });
  });

  // ─── Cache size logging ────────────────────────────────────────────

  describe('cache size logging', () => {
    it('should NOT log when cache size is between 1 and 9', async () => {
      for (let i = 1; i <= 9; i++) {
        await service.storeMicrolearning(
          createMicrolearningContent({ microlearning_id: `ml-nolog-${i}` })
        );
      }

      expect(mockLoggerInfo).not.toHaveBeenCalled();
    });

    it('should log when cache size is exactly 10 (cacheSize % 10 === 0)', async () => {
      for (let i = 1; i <= 10; i++) {
        await service.storeMicrolearning(
          createMicrolearningContent({ microlearning_id: `ml-ten-${i}` })
        );
      }

      expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('📊 In-memory cache size', {
        items: 10,
        estimatedMB: Math.round((10 * 50) / 1024),
      });
    });

    it('should log when cache size is exactly 20 (cacheSize % 10 === 0)', async () => {
      for (let i = 1; i <= 20; i++) {
        await service.storeMicrolearning(
          createMicrolearningContent({ microlearning_id: `ml-twenty-${i}` })
        );
      }

      // Should have logged at size=10 and size=20
      expect(mockLoggerInfo).toHaveBeenCalledTimes(2);
    });

    it('should log on every store when cache exceeds 30 items', async () => {
      // Seed 30 items first (logs at 10, 20, 30 = 3 calls)
      for (let i = 1; i <= 30; i++) {
        await service.storeMicrolearning(
          createMicrolearningContent({ microlearning_id: `ml-bulk-${i}` })
        );
      }
      mockLoggerInfo.mockClear();

      // Item 31 => cacheSize > 30 triggers log
      await service.storeMicrolearning(
        createMicrolearningContent({ microlearning_id: 'ml-bulk-31' })
      );
      expect(mockLoggerInfo).toHaveBeenCalledTimes(1);

      // Item 32 => cacheSize > 30 triggers log again
      await service.storeMicrolearning(
        createMicrolearningContent({ microlearning_id: 'ml-bulk-32' })
      );
      expect(mockLoggerInfo).toHaveBeenCalledTimes(2);
    });

    it('should NOT log when overwriting an existing item and cache size stays under thresholds', async () => {
      // Store 5 items
      for (let i = 1; i <= 5; i++) {
        await service.storeMicrolearning(
          createMicrolearningContent({ microlearning_id: `ml-ow-${i}` })
        );
      }

      mockLoggerInfo.mockClear();

      // Overwrite one — cache size stays at 5
      await service.storeMicrolearning(
        createMicrolearningContent({ microlearning_id: 'ml-ow-3', microlearning_metadata: { title: 'Updated' } })
      );

      expect(mockLoggerInfo).not.toHaveBeenCalled();
    });

    it('should pass correct estimatedMB value in log payload', async () => {
      for (let i = 1; i <= 10; i++) {
        await service.storeMicrolearning(
          createMicrolearningContent({ microlearning_id: `ml-mb-${i}` })
        );
      }

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '📊 In-memory cache size',
        expect.objectContaining({
          estimatedMB: Math.round((10 * 50) / 1024),
        })
      );
    });
  });

  // ─── Cross-method integration ──────────────────────────────────────

  describe('cross-method integration', () => {
    it('getCacheStats should only count microlearning content, not language content or inboxes', async () => {
      await service.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'ml-only' }));
      await service.storeLanguageContent('ml-only', 'en', createLanguageContent());
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-only');

      const stats = MicrolearningService.getCacheStats();
      expect(stats.microlearningCount).toBe(1);
    });

    it('getCachedMicrolearning should not be affected by language or inbox operations', async () => {
      await service.storeLanguageContent('ml-ghost', 'en', createLanguageContent());
      await service.assignMicrolearningToDepartment('IT', 'en', 'ml-ghost');

      expect(MicrolearningService.getCachedMicrolearning('ml-ghost')).toBeUndefined();
    });

    it('multiple service instances share the same static storage', async () => {
      const service1 = new MicrolearningService();
      const service2 = new MicrolearningService();

      await service1.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'shared-1' }));
      await service2.storeMicrolearning(createMicrolearningContent({ microlearning_id: 'shared-2' }));

      expect(MicrolearningService.getCacheStats().microlearningCount).toBe(2);
      expect(MicrolearningService.getCachedMicrolearning('shared-1')).toBeDefined();
      expect(MicrolearningService.getCachedMicrolearning('shared-2')).toBeDefined();
    });
  });
});
