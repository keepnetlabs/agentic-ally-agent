import { describe, it, expect } from 'vitest';
import { formatToolSummary, formatToolSummaryKV } from './tool-summary-formatter';

describe('tool-summary-formatter', () => {
    describe('formatToolSummaryKV', () => {
        it('should format valid key values', () => {
            const result = formatToolSummaryKV([
                { key: 'count', value: 10 },
                { key: 'active', value: true }
            ]);
            expect(result).toBe('count=10, active=true');
        });

        it('should filter out invalid values', () => {
            const result = formatToolSummaryKV([
                { key: 'valid', value: 'yes' },
                { key: 'null', value: null },
                { key: 'undefined', value: undefined },
                { key: 'empty', value: '' }
            ]);
            expect(result).toBe('valid=yes');
        });

        it('should return empty string for empty array', () => {
            expect(formatToolSummaryKV([])).toBe('');
        });

        it('should filter out all invalid values and return empty string', () => {
            const result = formatToolSummaryKV([
                { key: 'null', value: null },
                { key: 'undefined', value: undefined },
                { key: 'empty', value: '' },
                { key: 'whitespace', value: '   ' }
            ]);
            expect(result).toBe('');
        });

        it('should handle zero as valid value', () => {
            expect(formatToolSummaryKV([{ key: 'count', value: 0 }])).toBe('count=0');
        });

        it('should handle false as valid value', () => {
            expect(formatToolSummaryKV([{ key: 'enabled', value: false }])).toBe('enabled=false');
        });

        it('should handle true as valid value', () => {
            expect(formatToolSummaryKV([{ key: 'active', value: true }])).toBe('active=true');
        });

        it('should trim whitespace from string values', () => {
            expect(formatToolSummaryKV([{ key: 'name', value: '  test  ' }])).toBe('name=test');
        });

        it('should handle negative numbers', () => {
            expect(formatToolSummaryKV([{ key: 'delta', value: -100 }])).toBe('delta=-100');
        });

        it('should handle floating point numbers', () => {
            expect(formatToolSummaryKV([{ key: 'price', value: 99.99 }])).toBe('price=99.99');
        });

        it('should handle special characters in values', () => {
            const result = formatToolSummaryKV([
                { key: 'email', value: 'user@example.com' },
                { key: 'path', value: '/api/v1/resource' }
            ]);
            expect(result).toBe('email=user@example.com, path=/api/v1/resource');
        });

        it('should handle unicode characters in values', () => {
            expect(formatToolSummaryKV([{ key: 'text', value: '你好世界 🌍' }])).toBe('text=你好世界 🌍');
        });

        it('should handle very long values', () => {
            const longValue = 'A'.repeat(1000);
            expect(formatToolSummaryKV([{ key: 'data', value: longValue }])).toBe(`data=${longValue}`);
        });

        it('should preserve key ordering', () => {
            const result = formatToolSummaryKV([
                { key: 'first', value: 1 },
                { key: 'second', value: 2 },
                { key: 'third', value: 3 }
            ]);
            expect(result).toBe('first=1, second=2, third=3');
        });

        it('should handle single key-value pair without comma', () => {
            expect(formatToolSummaryKV([{ key: 'id', value: 'abc123' }])).toBe('id=abc123');
        });

        it('should filter entries with missing key', () => {
            const result = formatToolSummaryKV([
                { key: 'valid', value: 'yes' },
                // @ts-ignore - Testing invalid input
                { value: 'no-key' }
            ]);
            expect(result).toBe('valid=yes');
        });

        it('should filter entries with empty key', () => {
            const result = formatToolSummaryKV([
                { key: 'valid', value: 'yes' },
                { key: '', value: 'empty-key' }
            ]);
            expect(result).toBe('valid=yes');
        });

        it('should handle mixed types in single call', () => {
            const result = formatToolSummaryKV([
                { key: 'str', value: 'text' },
                { key: 'num', value: 42 },
                { key: 'bool', value: true },
                { key: 'zero', value: 0 },
                { key: 'false', value: false }
            ]);
            expect(result).toBe('str=text, num=42, bool=true, zero=0, false=false');
        });

        it('should handle newlines in values', () => {
            expect(formatToolSummaryKV([{ key: 'text', value: 'line1\nline2' }])).toBe('text=line1\nline2');
        });

        it('should handle quotes in values', () => {
            expect(formatToolSummaryKV([{ key: 'msg', value: 'He said "hello"' }])).toBe('msg=He said "hello"');
        });

        it('should handle equals sign in values', () => {
            expect(formatToolSummaryKV([{ key: 'formula', value: 'a=b+c' }])).toBe('formula=a=b+c');
        });

        it('should handle commas in values', () => {
            expect(formatToolSummaryKV([{ key: 'list', value: 'a, b, c' }])).toBe('list=a, b, c');
        });

        it('should return empty string on error with malformed input', () => {
            // @ts-ignore - Testing error handling
            expect(formatToolSummaryKV(null)).toBe('');
            // @ts-ignore - Testing error handling
            expect(formatToolSummaryKV(undefined)).toBe('');
            // @ts-ignore - Testing error handling
            expect(formatToolSummaryKV('not-an-array')).toBe('');
        });

        it('should handle entries with null key', () => {
            const result = formatToolSummaryKV([
                { key: 'valid', value: 'yes' },
                // @ts-ignore - Testing invalid input
                { key: null, value: 'null-key' }
            ]);
            expect(result).toBe('valid=yes');
        });

        it('should handle large numbers', () => {
            expect(formatToolSummaryKV([{ key: 'big', value: 999999999999 }])).toBe('big=999999999999');
        });

        it('should handle scientific notation', () => {
            expect(formatToolSummaryKV([{ key: 'sci', value: 1.23e10 }])).toBe('sci=12300000000');
        });
    });

    describe('formatToolSummary', () => {
        it('should format full summary', () => {
            const result = formatToolSummary({
                prefix: 'Processed',
                title: 'Data.csv',
                suffix: 'completed',
                kv: [{ key: 'rows', value: 100 }]
            });
            expect(result).toBe('Processed: "Data.csv". completed (rows=100).');
        });

        it('should handle missing optional parts', () => {
            // Just prefix
            expect(formatToolSummary({ prefix: 'Done' })).toBe('Done.');

            // Prefix + KV
            expect(formatToolSummary({ prefix: 'Done', kv: [{ key: 'id', value: 1 }] }))
                .toBe('Done. (id=1).');

            // Prefix + Title
            expect(formatToolSummary({ prefix: 'Done', title: 'File' }))
                .toBe('Done: "File".');
        });

        it('should handle prefix + suffix without kv', () => {
            expect(formatToolSummary({ prefix: 'Uploaded', suffix: 'successfully' }))
                .toBe('Uploaded. successfully.');
        });

        it('should handle prefix + title + suffix without kv', () => {
            expect(formatToolSummary({ prefix: 'Uploaded', title: 'image.png', suffix: 'successfully' }))
                .toBe('Uploaded: "image.png". successfully.');
        });

        it('should handle prefix + title + kv without suffix', () => {
            expect(formatToolSummary({
                prefix: 'Uploaded',
                title: 'file.txt',
                kv: [{ key: 'size', value: 1024 }]
            })).toBe('Uploaded: "file.txt". (size=1024).');
        });

        it('should trim whitespace from prefix', () => {
            expect(formatToolSummary({ prefix: '  Done  ' })).toBe('Done.');
        });

        it('should trim whitespace from title', () => {
            expect(formatToolSummary({ prefix: 'Done', title: '  File  ' }))
                .toBe('Done: "File".');
        });

        it('should trim whitespace from suffix', () => {
            expect(formatToolSummary({ prefix: 'Done', suffix: '  OK  ' }))
                .toBe('Done. OK.');
        });

        it('should handle empty prefix', () => {
            expect(formatToolSummary({ prefix: '' })).toBe('.');
        });

        it('should handle whitespace-only prefix', () => {
            expect(formatToolSummary({ prefix: '   ' })).toBe('.');
        });

        it('should ignore empty title', () => {
            expect(formatToolSummary({ prefix: 'Done', title: '' })).toBe('Done.');
        });

        it('should ignore whitespace-only title', () => {
            expect(formatToolSummary({ prefix: 'Done', title: '   ' })).toBe('Done.');
        });

        it('should ignore empty suffix', () => {
            expect(formatToolSummary({ prefix: 'Done', suffix: '' })).toBe('Done.');
        });

        it('should ignore whitespace-only suffix', () => {
            expect(formatToolSummary({ prefix: 'Done', suffix: '   ' })).toBe('Done.');
        });

        it('should handle empty kv array', () => {
            expect(formatToolSummary({ prefix: 'Done', kv: [] })).toBe('Done.');
        });

        it('should handle kv with all invalid values', () => {
            expect(formatToolSummary({
                prefix: 'Done',
                kv: [
                    { key: 'null', value: null },
                    { key: 'undefined', value: undefined },
                    { key: 'empty', value: '' }
                ]
            })).toBe('Done.');
        });

        it('should handle multiple kv pairs', () => {
            const result = formatToolSummary({
                prefix: 'Processed',
                kv: [
                    { key: 'rows', value: 100 },
                    { key: 'cols', value: 10 },
                    { key: 'errors', value: 0 }
                ]
            });
            expect(result).toBe('Processed. (rows=100, cols=10, errors=0).');
        });

        it('should handle title with quotes', () => {
            expect(formatToolSummary({ prefix: 'Done', title: 'File "test"' }))
                .toBe('Done: "File "test"".');
        });

        it('should handle title with special characters', () => {
            expect(formatToolSummary({ prefix: 'Done', title: 'file@2024.csv' }))
                .toBe('Done: "file@2024.csv".');
        });

        it('should handle unicode in prefix', () => {
            expect(formatToolSummary({ prefix: '✅ Success' }))
                .toBe('✅ Success.');
        });

        it('should handle unicode in title', () => {
            expect(formatToolSummary({ prefix: 'Done', title: '文件.txt' }))
                .toBe('Done: "文件.txt".');
        });

        it('should handle unicode in suffix', () => {
            expect(formatToolSummary({ prefix: 'Done', suffix: '✓ OK' }))
                .toBe('Done. ✓ OK.');
        });

        it('should handle very long prefix', () => {
            const longPrefix = 'A'.repeat(1000);
            expect(formatToolSummary({ prefix: longPrefix })).toBe(`${longPrefix}.`);
        });

        it('should handle very long title', () => {
            const longTitle = 'B'.repeat(1000);
            expect(formatToolSummary({ prefix: 'Done', title: longTitle }))
                .toBe(`Done: "${longTitle}".`);
        });

        it('should handle very long suffix', () => {
            const longSuffix = 'C'.repeat(1000);
            expect(formatToolSummary({ prefix: 'Done', suffix: longSuffix }))
                .toBe(`Done. ${longSuffix}.`);
        });

        it('should handle newlines in prefix', () => {
            expect(formatToolSummary({ prefix: 'Line1\nLine2' }))
                .toBe('Line1\nLine2.');
        });

        it('should handle newlines in title', () => {
            expect(formatToolSummary({ prefix: 'Done', title: 'Line1\nLine2' }))
                .toBe('Done: "Line1\nLine2".');
        });

        it('should handle newlines in suffix', () => {
            expect(formatToolSummary({ prefix: 'Done', suffix: 'Line1\nLine2' }))
                .toBe('Done. Line1\nLine2.');
        });

        it('should handle all fields with complex data', () => {
            const result = formatToolSummary({
                prefix: '✅ Training uploaded',
                title: 'Security Awareness 2024',
                suffix: 'Ready to assign',
                kv: [
                    { key: 'scenarioId', value: 'sc-123' },
                    { key: 'duration', value: 30 },
                    { key: 'interactive', value: true }
                ]
            });
            expect(result).toBe('✅ Training uploaded: "Security Awareness 2024". Ready to assign (scenarioId=sc-123, duration=30, interactive=true).');
        });

        it('should handle undefined kv', () => {
            expect(formatToolSummary({ prefix: 'Done', kv: undefined })).toBe('Done.');
        });

        it('should handle prefix with emoji', () => {
            expect(formatToolSummary({ prefix: '🎉 Success' })).toBe('🎉 Success.');
        });

        it('should handle title with path separators', () => {
            expect(formatToolSummary({ prefix: 'Done', title: 'folder/subfolder/file.txt' }))
                .toBe('Done: "folder/subfolder/file.txt".');
        });

        it('should handle suffix with punctuation', () => {
            expect(formatToolSummary({ prefix: 'Done', suffix: 'OK!' }))
                .toBe('Done. OK!.');
        });

        it('should handle kv with zero values', () => {
            const result = formatToolSummary({
                prefix: 'Stats',
                kv: [
                    { key: 'errors', value: 0 },
                    { key: 'warnings', value: 0 }
                ]
            });
            expect(result).toBe('Stats. (errors=0, warnings=0).');
        });

        it('should handle kv with false values', () => {
            const result = formatToolSummary({
                prefix: 'Settings',
                kv: [
                    { key: 'enabled', value: false },
                    { key: 'visible', value: false }
                ]
            });
            expect(result).toBe('Settings. (enabled=false, visible=false).');
        });

        it('should handle mixed valid and invalid kv', () => {
            const result = formatToolSummary({
                prefix: 'Result',
                kv: [
                    { key: 'valid', value: 'yes' },
                    { key: 'invalid', value: null },
                    { key: 'count', value: 5 }
                ]
            });
            expect(result).toBe('Result. (valid=yes, count=5).');
        });

        it('should handle title with backslashes', () => {
            expect(formatToolSummary({ prefix: 'Done', title: 'C:\\Users\\file.txt' }))
                .toBe('Done: "C:\\Users\\file.txt".');
        });

        it('should handle prefix with multiple spaces', () => {
            expect(formatToolSummary({ prefix: 'Done    Task' }))
                .toBe('Done    Task.');
        });

        it('should handle real-world phishing upload example', () => {
            const result = formatToolSummary({
                prefix: '✅ Phishing uploaded',
                title: 'CEO Fraud Scenario',
                suffix: 'Ready to assign',
                kv: [
                    { key: 'scenarioName', value: 'CEO Fraud Scenario' },
                    { key: 'resourceId', value: 'res-abc123' },
                    { key: 'phishingId', value: 'ph-777777' }
                ]
            });
            expect(result).toBe('✅ Phishing uploaded: "CEO Fraud Scenario". Ready to assign (scenarioName=CEO Fraud Scenario, resourceId=res-abc123, phishingId=ph-777777).');
        });

        it('should handle real-world training assignment example', () => {
            const result = formatToolSummary({
                prefix: '✅ Training assigned to USER user@company.com',
                kv: [
                    { key: 'resourceId', value: 'r1' },
                    { key: 'sendTrainingLanguageId', value: '' }
                ]
            });
            expect(result).toBe('✅ Training assigned to USER user@company.com. (resourceId=r1).');
        });

        it('should handle undefined parameters gracefully', () => {
            // @ts-ignore - Testing runtime behavior
            expect(formatToolSummary({ prefix: 'Done', title: undefined, suffix: undefined, kv: undefined }))
                .toBe('Done.');
        });

        it('should handle null title', () => {
            // @ts-ignore - Testing runtime behavior
            expect(formatToolSummary({ prefix: 'Done', title: null }))
                .toBe('Done.');
        });

        it('should handle null suffix', () => {
            // @ts-ignore - Testing runtime behavior
            expect(formatToolSummary({ prefix: 'Done', suffix: null }))
                .toBe('Done.');
        });
    });
});
