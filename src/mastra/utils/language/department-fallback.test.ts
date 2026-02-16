/**
 * Unit tests for getDepartmentFallbackForLanguage
 */
import { describe, it, expect } from 'vitest';
import { getDepartmentFallbackForLanguage } from './department-fallback';

describe('getDepartmentFallbackForLanguage', () => {
  it('should return "All" for en and en-gb', () => {
    expect(getDepartmentFallbackForLanguage('en')).toBe('All');
    expect(getDepartmentFallbackForLanguage('en-gb')).toBe('All');
  });

  it('should return localized fallback for Turkish', () => {
    expect(getDepartmentFallbackForLanguage('tr')).toBe('Tümü');
    expect(getDepartmentFallbackForLanguage('tr-tr')).toBe('Tümü');
  });

  it('should return localized fallback for German', () => {
    expect(getDepartmentFallbackForLanguage('de')).toBe('Alle');
    expect(getDepartmentFallbackForLanguage('de-de')).toBe('Alle');
  });

  it('should return "All" for unknown language codes', () => {
    expect(getDepartmentFallbackForLanguage('xx')).toBe('All');
    expect(getDepartmentFallbackForLanguage('unknown')).toBe('All');
  });

  it('should handle empty string', () => {
    expect(getDepartmentFallbackForLanguage('')).toBe('All');
  });

  it('should use first segment of BCP-47 code', () => {
    expect(getDepartmentFallbackForLanguage('zh-hans')).toBe('全部');
    expect(getDepartmentFallbackForLanguage('zh-hant')).toBe('全部');
  });
});
