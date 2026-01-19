
import { describe, expect, it } from 'vitest';
import {
    normLang,
    getLanguagePrompt,
    buildGlossaryPrompt,
    buildSystemPrompt
} from './localization-language-rules';

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

        it('should replace underscores with dashes', () => {
            expect(normLang('en_US')).toBe('en');
            expect(normLang('pt_BR')).toBe('pt');
        });

        it('should handle Norwegian variants', () => {
            expect(normLang('nb')).toBe('no');
            expect(normLang('nn')).toBe('no');
            expect(normLang('no')).toBe('no');
        });

        it('should handle Chinese variants', () => {
            expect(normLang('zh-cn')).toBe('zh');
            expect(normLang('zh-sg')).toBe('zh');
            expect(normLang('zh-hans')).toBe('zh');
            expect(normLang('zh-hant')).toBe('zh');
            expect(normLang('zh-tw')).toBe('zh');
            expect(normLang('zh-hk')).toBe('zh');
            expect(normLang('zh-yue')).toBe('zh');
        });

        it('should handle Portuguese variants', () => {
            expect(normLang('pt-br')).toBe('pt');
            expect(normLang('pt-pt')).toBe('pt');
        });

        it('should handle Spanish variants', () => {
            expect(normLang('es-mx')).toBe('es');
            expect(normLang('es-419')).toBe('es');
        });

        it('should handle Serbian variants', () => {
            expect(normLang('sr-latn')).toBe('sr');
            expect(normLang('sr-cyrl')).toBe('sr');
        });

        it('should handle English variants', () => {
            expect(normLang('en-au')).toBe('en');
            expect(normLang('en-ca')).toBe('en');
        });

        it('should handle French variants', () => {
            expect(normLang('fr-ca')).toBe('fr');
        });

        it('should handle Turkish language names', () => {
            expect(normLang('Türkçe')).toBe('tr');
            expect(normLang('turkce')).toBe('tr');
            expect(normLang('turk')).toBe('tr');
        });

        it('should handle German language names', () => {
            expect(normLang('Deutsch')).toBe('de');
        });

        it('should handle French language names', () => {
            expect(normLang('Français')).toBe('fr');
            expect(normLang('francais')).toBe('fr');
        });

        it('should handle Spanish language names', () => {
            expect(normLang('Español')).toBe('es');
            expect(normLang('espanol')).toBe('es');
        });

        it('should handle Italian language names', () => {
            expect(normLang('Italiano')).toBe('it');
        });

        it('should handle Portuguese language names', () => {
            expect(normLang('Português')).toBe('pt');
        });

        it('should handle Russian language names', () => {
            expect(normLang('Россия')).toBe('ru');
        });

        it('should handle native language names', () => {
            expect(normLang('Українська')).toBe('uk');
            expect(normLang('Ελληνικά')).toBe('el');
            expect(normLang('Română')).toBe('ro');
            expect(normLang('Magyar')).toBe('hu');
        });

        it('should handle Arabic/Persian/Urdu names', () => {
            expect(normLang('کوردی')).toBe('ku');
            expect(normLang('עברית')).toBe('he');
            expect(normLang('اردو')).toBe('ur');
        });

        it('should handle Asian language names', () => {
            expect(normLang('chinese')).toBe('zh');
            expect(normLang('japanese')).toBe('ja');
            expect(normLang('korean')).toBe('ko');
            expect(normLang('thai')).toBe('th');
            expect(normLang('vietnamese')).toBe('vi');
        });

        it('should handle South Asian language names', () => {
            expect(normLang('hindi')).toBe('hi');
            expect(normLang('বাংলা')).toBe('bn');
        });

        it('should handle Nordic language names', () => {
            expect(normLang('Svenska')).toBe('sv');
            expect(normLang('Norsk')).toBe('no');
            expect(normLang('Dansk')).toBe('da');
            expect(normLang('Íslenska')).toBe('is');
            expect(normLang('Suomi')).toBe('fi');
        });

        it('should handle Eastern European language names', () => {
            expect(normLang('Polski')).toBe('pl');
            expect(normLang('Česky')).toBe('cs');
            expect(normLang('Slovenčina')).toBe('sk');
            expect(normLang('Hrvatski')).toBe('hr');
            expect(normLang('Србија')).toBe('sr');
            expect(normLang('Български')).toBe('bg');
            expect(normLang('Македонски')).toBe('mk');
        });

        it('should handle other language names', () => {
            expect(normLang('Nederlands')).toBe('nl');
            expect(normLang('Bahasa Indonesia')).toBe('id');
            expect(normLang('Swahili')).toBe('sw');
            expect(normLang('Shqiptare')).toBe('sq');
        });

        it('should handle Persian and Farsi aliases', () => {
            expect(normLang('persian')).toBe('fa');
            expect(normLang('farsi')).toBe('fa');
        });

        it('should handle English aliases', () => {
            expect(normLang('english')).toBe('en');
            expect(normLang('eng')).toBe('en');
        });

        it('should trim whitespace from input', () => {
            expect(normLang('  en  ')).toBe('en');
            expect(normLang('  Turkish  ')).toBe('tr');
        });

        it('should handle mixed case inputs', () => {
            expect(normLang('EN-us')).toBe('en');
            expect(normLang('TR-tr')).toBe('tr');
            expect(normLang('GERMAN')).toBe('de');
        });

        it('should handle all base language codes', () => {
            const allCodes = ['tr', 'en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'pl', 'cs', 'ru', 'ar', 'fa', 'hi', 'zh', 'ja', 'ko', 'th', 'vi', 'uk', 'el', 'ro', 'hu', 'sk', 'id', 'bn', 'ur', 'he', 'sw', 'ku', 'hr', 'sr', 'bg', 'mk', 'sq', 'is', 'fi'];
            allCodes.forEach(code => {
                expect(normLang(code)).toBe(code);
            });
        });

        it('should return generic for null input', () => {
            expect(normLang(null as any)).toBe('generic');
        });
    });

    describe('getLanguagePrompt', () => {
        it('should return Turkish rules for tr', () => {
            const prompt = getLanguagePrompt('tr');
            expect(prompt).toContain('Turkish Style Rules');
            expect(prompt).toContain('FORBIDDEN');
            expect(prompt).toContain('uyanık kalın');
        });

        it('should return English rules for en', () => {
            const prompt = getLanguagePrompt('en');
            expect(prompt).toContain('English Style Rules');
            expect(prompt).toContain('stay sharp');
        });

        it('should return French rules for fr', () => {
            const prompt = getLanguagePrompt('fr');
            expect(prompt).toContain('French Style Rules');
            expect(prompt).toContain('restez vigilants');
        });

        it('should return German rules for de', () => {
            const prompt = getLanguagePrompt('de');
            expect(prompt).toContain('German Style Rules');
            expect(prompt).toContain('Achtung!');
        });

        it('should return Spanish rules for es', () => {
            const prompt = getLanguagePrompt('es');
            expect(prompt).toContain('Spanish Style Rules');
            expect(prompt).toContain('¡bravo!');
        });

        it('should return generic rules for unknown language', () => {
            const prompt = getLanguagePrompt('klingon');
            expect(prompt).toContain('Generic Style Rules');
        });

        it('should normalize language code before lookup', () => {
            const prompt = getLanguagePrompt('en-US');
            expect(prompt).toContain('English Style Rules');
        });

        it('should memoize results', () => {
            const prompt1 = getLanguagePrompt('tr');
            const prompt2 = getLanguagePrompt('tr');
            expect(prompt1).toBe(prompt2);
        });

        it('should handle all supported languages', () => {
            const languages = ['tr', 'en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'pl', 'cs', 'ru', 'ar', 'fa', 'hi', 'zh', 'ja', 'ko', 'th', 'vi', 'uk', 'el', 'ro', 'hu', 'sk', 'id', 'bn', 'ur', 'he', 'sw', 'ku', 'hr', 'sr', 'bg', 'mk', 'sq', 'is', 'fi'];
            languages.forEach(lang => {
                const prompt = getLanguagePrompt(lang);
                expect(prompt).toBeDefined();
                expect(prompt.length).toBeGreaterThan(0);
            });
        });

        it('should return rules with FORBIDDEN section', () => {
            const prompt = getLanguagePrompt('tr');
            expect(prompt).toContain('FORBIDDEN');
            expect(prompt).toContain('CRITICAL ENFORCEMENT');
        });

        it('should return rules with approved alternatives', () => {
            const prompt = getLanguagePrompt('tr');
            expect(prompt).toContain('MANDATORY APPROVED ALTERNATIVES');
        });

        it('should return rules with runtime behavior', () => {
            const prompt = getLanguagePrompt('tr');
            expect(prompt).toContain('RUNTIME BEHAVIOR');
        });
    });

    describe('buildGlossaryPrompt', () => {
        it('should return empty string for empty glossary', () => {
            expect(buildGlossaryPrompt([])).toBe('');
        });

        it('should return empty string for undefined glossary', () => {
            expect(buildGlossaryPrompt()).toBe('');
        });

        it('should build prompt for single glossary entry', () => {
            const glossary = [{ 'phishing': 'oltalama' }];
            const prompt = buildGlossaryPrompt(glossary);
            expect(prompt).toContain('Terminology Glossary');
            expect(prompt).toContain('phishing');
            expect(prompt).toContain('oltalama');
        });

        it('should build prompt for multiple glossary entries', () => {
            const glossary = [
                { 'phishing': 'oltalama' },
                { 'malware': 'kötü amaçlı yazılım' },
                { 'ransomware': 'fidye yazılımı' }
            ];
            const prompt = buildGlossaryPrompt(glossary);
            expect(prompt).toContain('Terminology Glossary');
            expect(prompt).toContain('phishing');
            expect(prompt).toContain('malware');
            expect(prompt).toContain('ransomware');
        });

        it('should number glossary entries', () => {
            const glossary = [
                { 'term1': 'translation1' },
                { 'term2': 'translation2' }
            ];
            const prompt = buildGlossaryPrompt(glossary);
            expect(prompt).toContain('1.');
            expect(prompt).toContain('2.');
        });

        it('should contain HARD OVERRIDE instruction', () => {
            const glossary = [{ 'test': 'test' }];
            const prompt = buildGlossaryPrompt(glossary);
            expect(prompt).toContain('HARD OVERRIDE');
        });
    });

    describe('buildSystemPrompt', () => {
        it('should build basic system prompt', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10
            });
            expect(prompt).toContain('TASK: Localize JSON values from en to tr');
            expect(prompt).toContain('Turkish Style Rules');
        });

        it('should include topic context when provided', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10,
                topicContext: 'Phishing awareness training'
            });
            expect(prompt).toContain('Phishing awareness training');
        });

        it('should include glossary when provided', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10,
                glossary: [{ 'phishing': 'oltalama' }]
            });
            expect(prompt).toContain('Terminology Glossary');
            expect(prompt).toContain('phishing');
        });

        it('should include decoding discipline when enabled', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10,
                decodingDiscipline: true
            });
            expect(prompt).toContain('Decoding Discipline');
        });

        it('should not include decoding discipline when disabled', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10,
                decodingDiscipline: false
            });
            expect(prompt).not.toContain('Decoding Discipline');
        });

        it('should include extractedLength in JSON keys', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 5
            });
            expect(prompt).toContain('"0"…"4"');
        });

        it('should handle different language pairs', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'de',
                targetLanguage: 'fr',
                extractedLength: 10
            });
            expect(prompt).toContain('from de to fr');
            expect(prompt).toContain('French Style Rules');
        });

        it('should contain critical rules section', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10
            });
            expect(prompt).toContain('CRITICAL RULES');
            expect(prompt).toContain('LANGUAGE PURITY');
            expect(prompt).toContain('CONTEXT-AWARE LOCALIZATION');
            expect(prompt).toContain('STRUCTURE PRESERVATION');
        });

        it('should contain validation section', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10
            });
            expect(prompt).toContain('VALIDATION BEFORE OUTPUT');
        });

        it('should contain output format section', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10
            });
            expect(prompt).toContain('OUTPUT FORMAT');
        });

        it('should handle empty topic context', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10,
                topicContext: ''
            });
            expect(prompt).toBeDefined();
        });

        it('should handle empty glossary array', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10,
                glossary: []
            });
            expect(prompt).toBeDefined();
        });

        it('should contain multi-language intelligence section', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10
            });
            expect(prompt).toContain('MULTI-LANGUAGE INTELLIGENCE');
        });

        it('should contain faithfulness constraints', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10
            });
            expect(prompt).toContain('FAITHFULNESS CONSTRAINTS');
            expect(prompt).toContain('No-Embellishment');
        });

        it('should contain priority order', () => {
            const prompt = buildSystemPrompt({
                sourceLanguage: 'en',
                targetLanguage: 'tr',
                extractedLength: 10
            });
            expect(prompt).toContain('PRIORITY ORDER');
            expect(prompt).toContain('Faithfulness');
        });
    });
});
