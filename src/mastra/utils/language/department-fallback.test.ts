/**
 * Unit tests for department-fallback
 * Covers getDepartmentFallbackForLanguage
 */
import { describe, it, expect } from 'vitest';
import { getDepartmentFallbackForLanguage } from './department-fallback';

describe('department-fallback', () => {
  describe('getDepartmentFallbackForLanguage', () => {
    it('should return All for en', () => {
      expect(getDepartmentFallbackForLanguage('en')).toBe('All');
    });

    it('should return All for en-gb', () => {
      expect(getDepartmentFallbackForLanguage('en-gb')).toBe('All');
    });

    it('should return Tümü for tr', () => {
      expect(getDepartmentFallbackForLanguage('tr')).toBe('Tümü');
    });

    it('should return Tümü for tr-tr', () => {
      expect(getDepartmentFallbackForLanguage('tr-tr')).toBe('Tümü');
    });

    it('should return Alle for de', () => {
      expect(getDepartmentFallbackForLanguage('de')).toBe('Alle');
    });

    it('should return Tous for fr', () => {
      expect(getDepartmentFallbackForLanguage('fr')).toBe('Tous');
    });

    it('should return Todos for es', () => {
      expect(getDepartmentFallbackForLanguage('es')).toBe('Todos');
    });

    it('should return 全部 for zh', () => {
      expect(getDepartmentFallbackForLanguage('zh')).toBe('全部');
    });

    it('should return すべて for ja', () => {
      expect(getDepartmentFallbackForLanguage('ja')).toBe('すべて');
    });

    it('should return 모두 for ko', () => {
      expect(getDepartmentFallbackForLanguage('ko')).toBe('모두');
    });

    it('should default to All for unknown language', () => {
      expect(getDepartmentFallbackForLanguage('xx')).toBe('All');
    });

    it('should extract primary language from full code', () => {
      expect(getDepartmentFallbackForLanguage('en-US')).toBe('All');
      expect(getDepartmentFallbackForLanguage('de-DE')).toBe('Alle');
    });

    it('should handle empty string', () => {
      expect(getDepartmentFallbackForLanguage('')).toBe('All');
    });
  });
});
