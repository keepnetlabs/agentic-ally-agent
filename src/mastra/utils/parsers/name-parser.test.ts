import { describe, it, expect } from 'vitest';
import { parseName, isValidName, normalizeName } from './name-parser';

describe('name-parser', () => {
    describe('parseName', () => {
        describe('Simple Names', () => {
            it('should parse simple First Last names', () => {
                const result = parseName('John Doe');
                expect(result).toEqual({ firstName: 'John', lastName: 'Doe', fullName: 'John Doe' });
            });

            it('should parse single names', () => {
                const result = parseName('Madonna');
                expect(result).toEqual({ firstName: 'Madonna', lastName: undefined, fullName: 'Madonna' });
            });

            it('should parse single name Cher', () => {
                const result = parseName('Cher');
                expect(result.firstName).toBe('Cher');
                expect(result.lastName).toBeUndefined();
                expect(result.fullName).toBe('Cher');
            });

            it('should parse two-word names', () => {
                const result = parseName('Jane Smith');
                expect(result.firstName).toBe('Jane');
                expect(result.lastName).toBe('Smith');
                expect(result.fullName).toBe('Jane Smith');
            });
        });

        describe('Multi-Part Names', () => {
            it('should parse multi-part last names', () => {
                const result = parseName('Jean-Claude Van Damme');
                expect(result.firstName).toBe('Jean-Claude');
                expect(result.lastName).toBe('Van Damme');
            });

            it('should parse three-word names', () => {
                const result = parseName('Ali Veli Mehmet');
                expect(result.firstName).toBe('Ali');
                expect(result.lastName).toBe('Veli Mehmet');
                expect(result.fullName).toBe('Ali Veli Mehmet');
            });

            it('should parse four-word names', () => {
                const result = parseName('John Paul George Ringo');
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Paul George Ringo');
            });

            it('should parse names with titles', () => {
                const result = parseName('Dr John Smith');
                expect(result.firstName).toBe('Dr');
                expect(result.lastName).toBe('John Smith');
            });

            it('should parse names with middle names', () => {
                const result = parseName('John Michael Doe');
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Michael Doe');
            });
        });

        describe('Object Input', () => {
            it('should handle pre-parsed objects', () => {
                const input = { firstName: 'Jane', lastName: 'Doe' };
                const result = parseName(input);
                expect(result.fullName).toBe('Jane Doe');
            });

            it('should handle object with only firstName', () => {
                const input = { firstName: 'Madonna' };
                const result = parseName(input);
                expect(result.firstName).toBe('Madonna');
                expect(result.lastName).toBeUndefined();
                expect(result.fullName).toBe('Madonna');
            });

            it('should handle object with empty lastName', () => {
                const input = { firstName: 'John', lastName: '' };
                const result = parseName(input);
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('');
                expect(result.fullName).toBe('John');
            });

            it('should handle object with undefined lastName', () => {
                const input = { firstName: 'Jane', lastName: undefined };
                const result = parseName(input);
                expect(result.firstName).toBe('Jane');
                expect(result.lastName).toBeUndefined();
                expect(result.fullName).toBe('Jane');
            });

            it('should preserve exact object values', () => {
                const input = { firstName: 'JOHN', lastName: 'DOE' };
                const result = parseName(input);
                expect(result.firstName).toBe('JOHN');
                expect(result.lastName).toBe('DOE');
                expect(result.fullName).toBe('JOHN DOE');
            });
        });

        describe('Whitespace Handling', () => {
            it('should trim leading whitespace', () => {
                const result = parseName('   John Doe');
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Doe');
            });

            it('should trim trailing whitespace', () => {
                const result = parseName('John Doe   ');
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Doe');
            });

            it('should trim both leading and trailing whitespace', () => {
                const result = parseName('  John Doe  ');
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Doe');
            });

            it('should collapse multiple spaces', () => {
                const result = parseName('John    Doe');
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Doe');
            });

            it('should treat tabs as single name (no space)', () => {
                // Implementation only checks for space character, not all whitespace
                const result = parseName('John\tDoe');
                expect(result.firstName).toBe('John\tDoe');
                expect(result.lastName).toBeUndefined();
            });

            it('should handle mixed whitespace', () => {
                const result = parseName('John \t  Doe');
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Doe');
            });

            it('should treat newlines as single name (no space)', () => {
                // Implementation only checks for space character, not all whitespace
                const result = parseName('John\nDoe');
                expect(result.firstName).toBe('John\nDoe');
                expect(result.lastName).toBeUndefined();
            });
        });

        describe('Special Characters', () => {
            it('should handle hyphens in firstName', () => {
                const result = parseName('Jean-Claude Doe');
                expect(result.firstName).toBe('Jean-Claude');
                expect(result.lastName).toBe('Doe');
            });

            it('should handle hyphens in lastName', () => {
                const result = parseName('John Smith-Jones');
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Smith-Jones');
            });

            it('should handle apostrophes in names', () => {
                const result = parseName("O'Connor Smith");
                expect(result.firstName).toBe("O'Connor");
                expect(result.lastName).toBe('Smith');
            });

            it('should handle apostrophes in lastName', () => {
                const result = parseName("John O'Brien");
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe("O'Brien");
            });

            it('should handle multiple hyphens', () => {
                const result = parseName('Jean-Claude-Marie Doe');
                expect(result.firstName).toBe('Jean-Claude-Marie');
                expect(result.lastName).toBe('Doe');
            });
        });

        describe('Case Sensitivity', () => {
            it('should preserve uppercase names', () => {
                const result = parseName('JOHN DOE');
                expect(result.firstName).toBe('JOHN');
                expect(result.lastName).toBe('DOE');
            });

            it('should preserve lowercase names', () => {
                const result = parseName('john doe');
                expect(result.firstName).toBe('john');
                expect(result.lastName).toBe('doe');
            });

            it('should preserve mixed case names', () => {
                const result = parseName('JoHn DoE');
                expect(result.firstName).toBe('JoHn');
                expect(result.lastName).toBe('DoE');
            });

            it('should preserve single uppercase name', () => {
                const result = parseName('MADONNA');
                expect(result.firstName).toBe('MADONNA');
                expect(result.fullName).toBe('MADONNA');
            });
        });

        describe('International Names', () => {
            it('should handle names with accents', () => {
                const result = parseName('José García');
                expect(result.firstName).toBe('José');
                expect(result.lastName).toBe('García');
            });

            it('should handle Chinese names', () => {
                const result = parseName('Li Wei');
                expect(result.firstName).toBe('Li');
                expect(result.lastName).toBe('Wei');
            });

            it('should handle Arabic names', () => {
                const result = parseName('محمد علي');
                expect(result.firstName).toBe('محمد');
                expect(result.lastName).toBe('علي');
            });

            it('should handle Russian names', () => {
                const result = parseName('Иван Петров');
                expect(result.firstName).toBe('Иван');
                expect(result.lastName).toBe('Петров');
            });

            it('should handle German names with umlauts', () => {
                const result = parseName('Müller Schmidt');
                expect(result.firstName).toBe('Müller');
                expect(result.lastName).toBe('Schmidt');
            });
        });

        describe('Error Handling', () => {
            it('should throw on empty input', () => {
                expect(() => parseName('')).toThrow('Name cannot be empty');
            });

            it('should throw on whitespace only', () => {
                expect(() => parseName('   ')).toThrow('Name cannot be empty');
            });

            it('should throw on tab only', () => {
                expect(() => parseName('\t')).toThrow('Name cannot be empty');
            });

            it('should throw on newline only', () => {
                expect(() => parseName('\n')).toThrow('Name cannot be empty');
            });

            it('should throw on mixed whitespace only', () => {
                expect(() => parseName('  \t\n  ')).toThrow('Name cannot be empty');
            });
        });

        describe('Edge Cases', () => {
            it('should handle very long names', () => {
                const longName = 'A'.repeat(100) + ' ' + 'B'.repeat(100);
                const result = parseName(longName);
                expect(result.firstName).toBe('A'.repeat(100));
                expect(result.lastName).toBe('B'.repeat(100));
            });

            it('should handle single character names', () => {
                const result = parseName('A B');
                expect(result.firstName).toBe('A');
                expect(result.lastName).toBe('B');
            });

            it('should handle single character first name only', () => {
                const result = parseName('X');
                expect(result.firstName).toBe('X');
                expect(result.lastName).toBeUndefined();
            });

            it('should return correct fullName for all cases', () => {
                expect(parseName('John Doe').fullName).toBe('John Doe');
                expect(parseName('Madonna').fullName).toBe('Madonna');
                expect(parseName('A B C').fullName).toBe('A B C');
            });

            it('should handle names with numbers (not validated)', () => {
                const result = parseName('User123 Test456');
                expect(result.firstName).toBe('User123');
                expect(result.lastName).toBe('Test456');
            });
        });
    });

    describe('isValidName', () => {
        describe('Valid Names', () => {
            it('should return true for valid names', () => {
                expect(isValidName('John Doe')).toBe(true);
            });

            it('should return true for names with apostrophes', () => {
                expect(isValidName("O'Connor")).toBe(true);
            });

            it('should return true for hyphenated names', () => {
                expect(isValidName('Mary-Jane')).toBe(true);
            });

            it('should return true for single names', () => {
                expect(isValidName('Madonna')).toBe(true);
            });

            it('should return true for names with spaces', () => {
                expect(isValidName('Jean Claude Van Damme')).toBe(true);
            });

            it('should return true for names with accents', () => {
                expect(isValidName('José García')).toBe(true);
            });

            it('should return true for Arabic names', () => {
                expect(isValidName('محمد علي')).toBe(true);
            });

            it('should return true for Chinese names', () => {
                expect(isValidName('李伟')).toBe(true);
            });

            it('should return true for German umlauts', () => {
                expect(isValidName('Müller')).toBe(true);
            });

            it('should return true for multiple apostrophes', () => {
                expect(isValidName("O'Brien O'Connor")).toBe(true);
            });

            it('should return true for multiple hyphens', () => {
                expect(isValidName('Jean-Claude-Marie')).toBe(true);
            });
        });

        describe('Invalid Characters', () => {
            it('should return false for names with numbers', () => {
                expect(isValidName('User123')).toBe(false);
            });

            it('should return false for email addresses', () => {
                expect(isValidName('admin@test.com')).toBe(false);
            });

            it('should return false for script tags', () => {
                expect(isValidName('<script>')).toBe(false);
            });

            it('should return false for names with exclamation marks', () => {
                expect(isValidName('John!')).toBe(false);
            });

            it('should return false for names with question marks', () => {
                expect(isValidName('John?')).toBe(false);
            });

            it('should return false for names with periods', () => {
                expect(isValidName('John.Doe')).toBe(false);
            });

            it('should return false for names with commas', () => {
                expect(isValidName('Doe, John')).toBe(false);
            });

            it('should return false for names with semicolons', () => {
                expect(isValidName('John;Doe')).toBe(false);
            });

            it('should return false for names with colons', () => {
                expect(isValidName('John:Doe')).toBe(false);
            });

            it('should return false for names with underscores', () => {
                expect(isValidName('John_Doe')).toBe(false);
            });

            it('should return false for names with brackets', () => {
                expect(isValidName('John[Doe]')).toBe(false);
            });

            it('should return false for names with parentheses', () => {
                expect(isValidName('John(Doe)')).toBe(false);
            });

            it('should return false for names with plus signs', () => {
                expect(isValidName('John+Doe')).toBe(false);
            });

            it('should return false for names with equals signs', () => {
                expect(isValidName('John=Doe')).toBe(false);
            });

            it('should return false for names with asterisks', () => {
                expect(isValidName('John*Doe')).toBe(false);
            });

            it('should return false for names with ampersands', () => {
                expect(isValidName('John&Doe')).toBe(false);
            });

            it('should return false for names with percentage signs', () => {
                expect(isValidName('John%Doe')).toBe(false);
            });

            it('should return false for names with dollar signs', () => {
                expect(isValidName('John$Doe')).toBe(false);
            });

            it('should return false for names with hash signs', () => {
                expect(isValidName('John#Doe')).toBe(false);
            });
        });

        describe('Empty and Null', () => {
            it('should return false for empty string', () => {
                expect(isValidName('')).toBe(false);
            });

            it('should return false for whitespace only', () => {
                expect(isValidName('   ')).toBe(false);
            });

            it('should return false for null', () => {
                expect(isValidName(null as any)).toBe(false);
            });

            it('should return false for undefined', () => {
                expect(isValidName(undefined as any)).toBe(false);
            });

            it('should return false for tab only', () => {
                expect(isValidName('\t')).toBe(false);
            });

            it('should return false for newline only', () => {
                expect(isValidName('\n')).toBe(false);
            });
        });

        describe('Type Checking', () => {
            it('should return false for numbers', () => {
                expect(isValidName(123 as any)).toBe(false);
            });

            it('should return false for objects', () => {
                expect(isValidName({} as any)).toBe(false);
            });

            it('should return false for arrays', () => {
                expect(isValidName([] as any)).toBe(false);
            });

            it('should return false for booleans', () => {
                expect(isValidName(true as any)).toBe(false);
            });
        });

        describe('Edge Cases', () => {
            it('should handle very long valid names', () => {
                const longName = 'A'.repeat(1000);
                expect(isValidName(longName)).toBe(true);
            });

            it('should handle single character names', () => {
                expect(isValidName('A')).toBe(true);
            });

            it('should reject names starting with numbers', () => {
                expect(isValidName('123John')).toBe(false);
            });

            it('should reject names ending with numbers', () => {
                expect(isValidName('John123')).toBe(false);
            });

            it('should reject names with numbers in middle', () => {
                expect(isValidName('Jo123hn')).toBe(false);
            });
        });
    });

    describe('normalizeName', () => {
        describe('Title Casing', () => {
            it('should title case and trim names', () => {
                expect(normalizeName('  john   doe  ')).toBe('John Doe');
            });

            it('should lower case mixed input', () => {
                expect(normalizeName('JoHN dOE')).toBe('John Doe');
            });

            it('should title case all lowercase', () => {
                expect(normalizeName('john doe')).toBe('John Doe');
            });

            it('should title case all uppercase', () => {
                expect(normalizeName('JOHN DOE')).toBe('John Doe');
            });

            it('should title case single name', () => {
                expect(normalizeName('madonna')).toBe('Madonna');
            });

            it('should title case uppercase single name', () => {
                expect(normalizeName('MADONNA')).toBe('Madonna');
            });

            it('should title case three-word names', () => {
                expect(normalizeName('john paul jones')).toBe('John Paul Jones');
            });

            it('should title case four-word names', () => {
                expect(normalizeName('john paul george ringo')).toBe('John Paul George Ringo');
            });
        });

        describe('Hyphenated Names', () => {
            it('should handle hyphens correctly', () => {
                expect(normalizeName('jean-claude')).toBe('Jean-Claude');
            });

            it('should title case both parts of hyphenated names', () => {
                expect(normalizeName('JEAN-CLAUDE')).toBe('Jean-Claude');
            });

            it('should handle multiple hyphens', () => {
                expect(normalizeName('jean-claude-marie')).toBe('Jean-Claude-Marie');
            });

            it('should handle hyphenated last names', () => {
                expect(normalizeName('smith-jones')).toBe('Smith-Jones');
            });

            it('should handle mixed case hyphenated names', () => {
                expect(normalizeName('JeAn-cLaUdE')).toBe('Jean-Claude');
            });

            it('should handle hyphenated names in full names', () => {
                expect(normalizeName('jean-claude van damme')).toBe('Jean-Claude Van Damme');
            });
        });

        describe('Whitespace Handling', () => {
            it('should trim leading whitespace', () => {
                expect(normalizeName('   john doe')).toBe('John Doe');
            });

            it('should trim trailing whitespace', () => {
                expect(normalizeName('john doe   ')).toBe('John Doe');
            });

            it('should trim both sides', () => {
                expect(normalizeName('  john doe  ')).toBe('John Doe');
            });

            it('should collapse multiple spaces', () => {
                expect(normalizeName('john    doe')).toBe('John Doe');
            });

            it('should handle tabs', () => {
                expect(normalizeName('john\tdoe')).toBe('John Doe');
            });

            it('should handle newlines', () => {
                expect(normalizeName('john\ndoe')).toBe('John Doe');
            });

            it('should handle mixed whitespace', () => {
                expect(normalizeName('john \t\n  doe')).toBe('John Doe');
            });

            it('should handle very excessive whitespace', () => {
                expect(normalizeName('   john     doe   ')).toBe('John Doe');
            });
        });

        describe('Special Characters', () => {
            it('should preserve apostrophes (but not split by them)', () => {
                // Implementation only splits by hyphens, not apostrophes
                // So "o'connor" becomes "O'connor" (first letter uppercase, rest lowercase)
                expect(normalizeName("o'connor")).toBe("O'connor");
            });

            it('should handle apostrophes in multiple words', () => {
                // Each word is title-cased independently, apostrophes don't split
                expect(normalizeName("o'brien o'connor")).toBe("O'brien O'connor");
            });

            it('should title case with apostrophes', () => {
                // Uppercase input becomes title case
                expect(normalizeName("O'CONNOR")).toBe("O'connor");
            });
        });

        describe('Edge Cases', () => {
            it('should handle empty strings', () => {
                expect(normalizeName('')).toBe('');
            });

            it('should handle whitespace-only strings', () => {
                expect(normalizeName('   ')).toBe('');
            });

            it('should handle single character', () => {
                expect(normalizeName('a')).toBe('A');
            });

            it('should handle single uppercase character', () => {
                expect(normalizeName('A')).toBe('A');
            });

            it('should handle very long names', () => {
                const longName = 'john '.repeat(100).trim();
                const expected = 'John '.repeat(100).trim();
                expect(normalizeName(longName)).toBe(expected);
            });

            it('should handle names with numbers (not filtered)', () => {
                expect(normalizeName('john123')).toBe('John123');
            });

            it('should handle names with special chars (not filtered)', () => {
                expect(normalizeName('john@doe')).toBe('John@doe');
            });

            it('should handle single hyphen', () => {
                expect(normalizeName('-')).toBe('-');
            });

            it('should handle multiple hyphens only', () => {
                expect(normalizeName('---')).toBe('---');
            });
        });

        describe('International Names', () => {
            it('should preserve accented characters', () => {
                expect(normalizeName('josé garcía')).toBe('José García');
            });

            it('should handle uppercase accented characters', () => {
                expect(normalizeName('JOSÉ GARCÍA')).toBe('José García');
            });

            it('should preserve German umlauts', () => {
                expect(normalizeName('müller schmidt')).toBe('Müller Schmidt');
            });

            it('should handle non-Latin scripts', () => {
                // Non-Latin scripts don't have case distinctions in the same way
                expect(normalizeName('محمد علي')).toBe('محمد علي');
            });
        });

        describe('Consistency', () => {
            it('should be idempotent', () => {
                const name = 'john doe';
                const normalized = normalizeName(name);
                expect(normalizeName(normalized)).toBe(normalized);
            });

            it('should produce same result for equivalent inputs', () => {
                expect(normalizeName('JOHN DOE')).toBe(normalizeName('john doe'));
            });

            it('should handle already normalized names', () => {
                const normalized = 'John Doe';
                expect(normalizeName(normalized)).toBe(normalized);
            });
        });
    });
});
