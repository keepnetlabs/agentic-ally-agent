import { describe, it, expect } from 'vitest';
import { parseName, isValidName, normalizeName } from './name-parser';

describe('name-parser', () => {
    describe('parseName', () => {
        it('should parse simple First Last names', () => {
            const result = parseName('John Doe');
            expect(result).toEqual({ firstName: 'John', lastName: 'Doe', fullName: 'John Doe' });
        });

        it('should parse single names', () => {
            const result = parseName('Madonna');
            expect(result).toEqual({ firstName: 'Madonna', lastName: undefined, fullName: 'Madonna' });
        });

        it('should parse multi-part last names', () => {
            const result = parseName('Jean-Claude Van Damme');
            expect(result.firstName).toBe('Jean-Claude'); // Implementation splits by first space
            expect(result.lastName).toBe('Van Damme');
        });

        it('should handle pre-parsed objects', () => {
            const input = { firstName: 'Jane', lastName: 'Doe' };
            const result = parseName(input);
            expect(result.fullName).toBe('Jane Doe');
        });

        it('should throw on empty input', () => {
            expect(() => parseName('')).toThrow('Name cannot be empty');
            expect(() => parseName('   ')).toThrow('Name cannot be empty');
        });
    });

    describe('isValidName', () => {
        it('should return true for valid names', () => {
            expect(isValidName('John Doe')).toBe(true);
            expect(isValidName("O'Connor")).toBe(true);
            expect(isValidName('Mary-Jane')).toBe(true);
        });

        it('should return false for invalid characters', () => {
            expect(isValidName('User123')).toBe(false);
            expect(isValidName('admin@test.com')).toBe(false);
            expect(isValidName('<script>')).toBe(false);
        });

        it('should return false for empty/non-string', () => {
            expect(isValidName('')).toBe(false);
            expect(isValidName(null as any)).toBe(false);
        });
    });

    describe('normalizeName', () => {
        it('should title case and trim names', () => {
            expect(normalizeName('  john   doe  ')).toBe('John Doe');
        });

        it('should handle hyphens correctly', () => {
            expect(normalizeName('jean-claude')).toBe('Jean-Claude');
        });

        it('should lower case mixed input', () => {
            expect(normalizeName('JoHN dOE')).toBe('John Doe');
        });
    });
});
