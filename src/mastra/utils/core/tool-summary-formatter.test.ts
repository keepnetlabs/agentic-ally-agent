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
    });
});
