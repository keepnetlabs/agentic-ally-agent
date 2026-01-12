
import { describe, expect, it } from 'vitest';
import { normLang } from './localization-language-rules';

describe('localization-language-rules', () => {
    describe('normLang', () => {
        it('defaults to generic if code is undefined/empty', () => {
            expect(normLang(undefined)).toBe('generic');
            expect(normLang('')).toBe('generic');
        });

        it('normalizes simple language codes', () => {
            expect(normLang('tr')).toBe('tr');
            expect(normLang('en')).toBe('en');
            expect(normLang('FR')).toBe('fr');
        });

        it('handles regional variants by falling back to primary', () => {
            expect(normLang('en-US')).toBe('en');
            expect(normLang('en-GB')).toBe('en');
            expect(normLang('tr-TR')).toBe('tr');
        });

        it('maps full language names to codes', () => {
            expect(normLang('turkish')).toBe('tr');
            expect(normLang('German')).toBe('de');
        });

        it('returns generic for unknown languages', () => {
            expect(normLang('klingon')).toBe('generic');
        });
    });
});
