
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getLogoUrl, getLogoUrlFallbacks, getRandomLetterLogoUrl } from './logo-resolver';

// Mock logger
vi.mock('../core/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    })
}));

describe('logo-resolver', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getRandomLetterLogoUrl', () => {
        it('returns a valid apistemic url', () => {
            const url = getRandomLetterLogoUrl();
            expect(url).toMatch(/https:\/\/logos-api\.apistemic\.com\/domain:[a-z]\.com/);
        });

        it('returns url with single letter domain', () => {
            const url = getRandomLetterLogoUrl();
            const match = url.match(/domain:([a-z])\.com/);
            expect(match).toBeTruthy();
            expect(match![1]).toHaveLength(1);
        });

        it('returns different letters over multiple calls', () => {
            const urls = new Set<string>();
            // Generate 50 URLs - very high probability of getting different letters
            for (let i = 0; i < 50; i++) {
                urls.add(getRandomLetterLogoUrl());
            }
            // Should get at least 2 different URLs
            expect(urls.size).toBeGreaterThan(1);
        });

        it('always returns lowercase letter', () => {
            for (let i = 0; i < 10; i++) {
                const url = getRandomLetterLogoUrl();
                const match = url.match(/domain:([a-z])\.com/);
                expect(match![1]).toMatch(/^[a-z]$/);
            }
        });

        it('returns url with correct format', () => {
            const url = getRandomLetterLogoUrl();
            expect(url).toContain('https://');
            expect(url).toContain('logos-api.apistemic.com');
            expect(url).toContain('domain:');
            expect(url).toContain('.com');
        });

        it('does not return uppercase letters', () => {
            for (let i = 0; i < 20; i++) {
                const url = getRandomLetterLogoUrl();
                expect(url).not.toMatch(/[A-Z]/);
            }
        });

        it('does not return numbers', () => {
            for (let i = 0; i < 20; i++) {
                const url = getRandomLetterLogoUrl();
                expect(url).not.toMatch(/domain:\d/);
            }
        });

        it('does not return special characters', () => {
            for (let i = 0; i < 20; i++) {
                const url = getRandomLetterLogoUrl();
                const match = url.match(/domain:([a-z])\.com/);
                expect(match![1]).not.toMatch(/[^a-z]/);
            }
        });
    });

    describe('getLogoUrl', () => {
        describe('Valid Domains', () => {
            it('returns logo.dev url (direct) for valid domain', () => {
                const url = getLogoUrl('google.com');
                expect(url).toContain('img.logo.dev/google.com');
                expect(url).toContain('token=');
                expect(url).toContain('size=96'); // Default size
            });

            it('handles domain with subdomain', () => {
                const url = getLogoUrl('mail.google.com');
                expect(url).toContain('img.logo.dev/mail.google.com');
            });

            it('handles domain with country code TLD', () => {
                const url = getLogoUrl('google.co.uk');
                expect(url).toContain('img.logo.dev/google.co.uk');
            });

            it('handles domain with multiple subdomains', () => {
                const url = getLogoUrl('api.mail.google.com');
                expect(url).toContain('img.logo.dev/api.mail.google.com');
            });

            it('handles .io domains', () => {
                const url = getLogoUrl('github.io');
                expect(url).toContain('img.logo.dev/github.io');
            });

            it('handles .ai domains', () => {
                const url = getLogoUrl('anthropic.ai');
                expect(url).toContain('img.logo.dev/anthropic.ai');
            });

            it('handles .org domains', () => {
                const url = getLogoUrl('wikipedia.org');
                expect(url).toContain('img.logo.dev/wikipedia.org');
            });

            it('handles .net domains', () => {
                const url = getLogoUrl('example.net');
                expect(url).toContain('img.logo.dev/example.net');
            });

            it('handles hyphenated domains', () => {
                const url = getLogoUrl('my-company.com');
                expect(url).toContain('img.logo.dev/my-company.com');
            });

            it('handles numeric domains', () => {
                const url = getLogoUrl('123example.com');
                expect(url).toContain('img.logo.dev/123example.com');
            });
        });

        describe('Domain Cleaning', () => {
            it('cleans domain input', () => {
                const url = getLogoUrl('https://www.google.com/search');
                expect(url).toContain('img.logo.dev/google.com');
            });

            it('removes https:// protocol', () => {
                const url = getLogoUrl('https://example.com');
                expect(url).toContain('img.logo.dev/example.com');
                expect(url).not.toContain('https://https://');
            });

            it('removes http:// protocol', () => {
                const url = getLogoUrl('http://example.com');
                expect(url).toContain('img.logo.dev/example.com');
            });

            it('removes www. prefix', () => {
                const url = getLogoUrl('www.example.com');
                expect(url).toContain('img.logo.dev/example.com');
                expect(url).not.toContain('www.www.');
            });

            it('removes both protocol and www', () => {
                const url = getLogoUrl('https://www.example.com');
                expect(url).toContain('img.logo.dev/example.com');
            });

            it('removes path segments', () => {
                const url = getLogoUrl('example.com/path/to/page');
                expect(url).toContain('img.logo.dev/example.com');
                expect(url).not.toContain('/path');
            });

            it('removes query parameters', () => {
                const url = getLogoUrl('example.com?param=value');
                expect(url).toContain('img.logo.dev/example.com');
                expect(url).not.toContain('?param');
            });

            it('removes both path and query', () => {
                const url = getLogoUrl('example.com/page?param=value');
                expect(url).toContain('img.logo.dev/example.com');
            });

            it('converts to lowercase', () => {
                const url = getLogoUrl('EXAMPLE.COM');
                expect(url).toContain('img.logo.dev/example.com');
                expect(url).not.toContain('EXAMPLE');
            });

            it('trims whitespace', () => {
                const url = getLogoUrl('  example.com  ');
                expect(url).toContain('img.logo.dev/example.com');
            });

            it('handles mixed case with protocol', () => {
                const url = getLogoUrl('HTTPS://WWW.EXAMPLE.COM');
                expect(url).toContain('img.logo.dev/example.com');
            });

            it('cleans complex URL', () => {
                const url = getLogoUrl('HTTPS://WWW.Example.COM/path/to/page?query=1#anchor');
                expect(url).toContain('img.logo.dev/example.com');
            });
        });

        describe('Size Parameter', () => {
            it('supports custom size', () => {
                const url = getLogoUrl('google.com', 128);
                expect(url).toContain('size=128');
            });

            it('uses default size of 96', () => {
                const url = getLogoUrl('google.com');
                expect(url).toContain('size=96');
            });

            it('supports size 32', () => {
                const url = getLogoUrl('google.com', 32);
                expect(url).toContain('size=32');
            });

            it('supports size 64', () => {
                const url = getLogoUrl('google.com', 64);
                expect(url).toContain('size=64');
            });

            it('supports size 256', () => {
                const url = getLogoUrl('google.com', 256);
                expect(url).toContain('size=256');
            });

            it('supports size 512', () => {
                const url = getLogoUrl('google.com', 512);
                expect(url).toContain('size=512');
            });

            it('passes size as number in URL', () => {
                const url = getLogoUrl('google.com', 200);
                expect(url).toContain('size=200');
                expect(url).not.toContain('size="200"');
            });
        });

        describe('Invalid Domains', () => {
            it('returns random letter for invalid domain', () => {
                const url = getLogoUrl('invalid');
                expect(url).toContain('logos-api.apistemic.com/domain:');
                expect(url).toMatch(/\.com$/);
            });

            it('returns random letter for null/empty domain', () => {
                const url = getLogoUrl('');
                expect(url).toContain('logos-api.apistemic.com/domain:');
            });

            it('returns random letter for domain without dot', () => {
                const url = getLogoUrl('nodot');
                expect(url).toContain('logos-api.apistemic.com/domain:');
            });

            it('returns random letter for whitespace only', () => {
                const url = getLogoUrl('   ');
                expect(url).toContain('logos-api.apistemic.com/domain:');
            });

            it('returns random letter for single character', () => {
                const url = getLogoUrl('a');
                expect(url).toContain('logos-api.apistemic.com/domain:');
            });

            it('returns logo.dev URL for just a dot', () => {
                const url = getLogoUrl('.');
                expect(url).toContain('img.logo.dev/.');
            });

            it('returns random letter for protocol only', () => {
                const url = getLogoUrl('https://');
                expect(url).toContain('logos-api.apistemic.com/domain:');
            });

            it('returns random letter for www only', () => {
                const url = getLogoUrl('www.');
                expect(url).toContain('logos-api.apistemic.com/domain:');
            });

            it('returns random letter when cleaning results in empty', () => {
                const url = getLogoUrl('https://www.');
                expect(url).toContain('logos-api.apistemic.com/domain:');
            });

            it('returns random letter for path only', () => {
                const url = getLogoUrl('/path/to/page');
                expect(url).toContain('logos-api.apistemic.com/domain:');
            });
        });

        describe('Environment Variables', () => {
            it('uses LOGO_DEV_TOKEN from environment', () => {
                process.env.LOGO_DEV_TOKEN = 'custom-token-123';
                const url = getLogoUrl('google.com');
                expect(url).toContain('token=custom-token-123');
            });

            it('uses default token when env var not set', () => {
                delete process.env.LOGO_DEV_TOKEN;
                const url = getLogoUrl('google.com');
                expect(url).toContain('token=LOGO_DEV_PUBLISHABLE_KEY');
            });

            it('handles empty LOGO_DEV_TOKEN', () => {
                process.env.LOGO_DEV_TOKEN = '';
                const url = getLogoUrl('google.com');
                expect(url).toContain('token=');
            });
        });

        describe('URL Structure', () => {
            it('returns HTTPS URL', () => {
                const url = getLogoUrl('google.com');
                expect(url).toMatch(/^https:\/\//);
            });

            it('includes img.logo.dev domain', () => {
                const url = getLogoUrl('google.com');
                expect(url).toContain('img.logo.dev');
            });

            it('includes token parameter', () => {
                const url = getLogoUrl('google.com');
                expect(url).toMatch(/token=[^&]+/);
            });

            it('includes size parameter', () => {
                const url = getLogoUrl('google.com');
                expect(url).toMatch(/size=\d+/);
            });

            it('returns string type', () => {
                const url = getLogoUrl('google.com');
                expect(typeof url).toBe('string');
            });

            it('returns non-empty string', () => {
                const url = getLogoUrl('google.com');
                expect(url.length).toBeGreaterThan(0);
            });
        });

        describe('Edge Cases', () => {
            it('handles very long domain', () => {
                const longDomain = 'a'.repeat(100) + '.com';
                const url = getLogoUrl(longDomain);
                expect(url).toContain('img.logo.dev/');
            });

            it('handles domain with many dots', () => {
                const url = getLogoUrl('a.b.c.d.e.example.com');
                expect(url).toContain('img.logo.dev/a.b.c.d.e.example.com');
            });

            it('handles unicode domain', () => {
                const url = getLogoUrl('例え.jp');
                expect(url).toContain('img.logo.dev/');
            });

            it('handles domain with port', () => {
                const url = getLogoUrl('example.com:8080');
                expect(url).toContain('img.logo.dev/example.com:8080');
            });
        });
    });

    describe('getLogoUrlFallbacks', () => {
        describe('Valid Domains', () => {
            it('returns multiple options', () => {
                const urls = getLogoUrlFallbacks('openai.com');
                expect(urls).toHaveLength(5);
                expect(urls[0]).toContain('img.logo.dev/openai.com');
                expect(urls[0]).toContain('size=96'); // Check optimized size
                expect(urls[1]).toBe('https://logos-api.apistemic.com/domain:openai.com');
                expect(urls[2]).toContain('icon.horse');
                expect(urls[3]).toContain('google.com/s2/favicons');
            });

            it('returns exactly 5 fallback URLs', () => {
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls).toHaveLength(5);
            });

            it('first URL is logo.dev', () => {
                const urls = getLogoUrlFallbacks('google.com');
                expect(urls[0]).toContain('img.logo.dev');
            });

            it('second URL is apistemic', () => {
                const urls = getLogoUrlFallbacks('google.com');
                expect(urls[1]).toContain('logos-api.apistemic.com');
            });

            it('third URL is icon.horse', () => {
                const urls = getLogoUrlFallbacks('google.com');
                expect(urls[2]).toContain('icon.horse');
            });

            it('fourth URL is google favicons', () => {
                const urls = getLogoUrlFallbacks('google.com');
                expect(urls[3]).toContain('google.com/s2/favicons');
            });

            it('fifth URL is random letter logo', () => {
                const urls = getLogoUrlFallbacks('google.com');
                expect(urls[4]).toMatch(/logos-api\.apistemic\.com\/domain:[a-z]\.com/);
            });

            it('all URLs are different', () => {
                const urls = getLogoUrlFallbacks('example.com');
                const uniqueUrls = new Set(urls);
                expect(uniqueUrls.size).toBe(5);
            });

            it('all URLs are strings', () => {
                const urls = getLogoUrlFallbacks('example.com');
                urls.forEach(url => {
                    expect(typeof url).toBe('string');
                });
            });

            it('all URLs are non-empty', () => {
                const urls = getLogoUrlFallbacks('example.com');
                urls.forEach(url => {
                    expect(url.length).toBeGreaterThan(0);
                });
            });

            it('all URLs start with https://', () => {
                const urls = getLogoUrlFallbacks('example.com');
                urls.forEach(url => {
                    expect(url).toMatch(/^https:\/\//);
                });
            });
        });

        describe('Domain Cleaning in Fallbacks', () => {
            it('cleans domain for all fallback URLs', () => {
                const urls = getLogoUrlFallbacks('https://www.example.com/path');
                expect(urls[0]).toContain('img.logo.dev/example.com');
                expect(urls[1]).toContain('domain:example.com');
                expect(urls[2]).toContain('icon.horse/icon/example.com');
                expect(urls[3]).toContain('favicons?domain=example.com');
            });

            it('removes protocol from all URLs', () => {
                const urls = getLogoUrlFallbacks('https://example.com');
                urls.slice(0, 4).forEach(url => {
                    expect(url).not.toContain('https://https://');
                    expect(url).not.toContain('domain=https://');
                });
            });

            it('removes www from all URLs', () => {
                const urls = getLogoUrlFallbacks('www.example.com');
                expect(urls[0]).not.toContain('www.example');
                expect(urls[1]).not.toContain('www.example');
                expect(urls[2]).not.toContain('www.example');
            });

            it('converts to lowercase for all URLs', () => {
                const urls = getLogoUrlFallbacks('EXAMPLE.COM');
                expect(urls[0]).toContain('example.com');
                expect(urls[1]).toContain('example.com');
                expect(urls[2]).toContain('example.com');
            });
        });

        describe('Size Parameter in Fallbacks', () => {
            it('supports custom size', () => {
                const urls = getLogoUrlFallbacks('example.com', 128);
                expect(urls[0]).toContain('size=128');
                expect(urls[3]).toContain('sz=128');
            });

            it('uses default size 96', () => {
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls[0]).toContain('size=96');
                expect(urls[3]).toContain('sz=96');
            });

            it('passes size to logo.dev', () => {
                const urls = getLogoUrlFallbacks('example.com', 256);
                expect(urls[0]).toContain('size=256');
            });

            it('passes size to google favicons', () => {
                const urls = getLogoUrlFallbacks('example.com', 256);
                expect(urls[3]).toContain('sz=256');
            });

            it('does not pass size to apistemic', () => {
                const urls = getLogoUrlFallbacks('example.com', 256);
                expect(urls[1]).not.toContain('256');
                expect(urls[1]).not.toContain('size');
            });

            it('does not pass size to icon.horse', () => {
                const urls = getLogoUrlFallbacks('example.com', 256);
                expect(urls[2]).not.toContain('256');
                expect(urls[2]).not.toContain('size');
            });
        });

        describe('Invalid Domains in Fallbacks', () => {
            it('returns single random letter URL for invalid domain', () => {
                const urls = getLogoUrlFallbacks('invalid');
                expect(urls).toHaveLength(1);
                expect(urls[0]).toContain('logos-api.apistemic.com/domain:');
            });

            it('returns single URL for empty domain', () => {
                const urls = getLogoUrlFallbacks('');
                expect(urls).toHaveLength(1);
            });

            it('returns single URL for domain without dot', () => {
                const urls = getLogoUrlFallbacks('nodot');
                expect(urls).toHaveLength(1);
            });

            it('returns single URL for whitespace', () => {
                const urls = getLogoUrlFallbacks('   ');
                expect(urls).toHaveLength(1);
            });

            it('returns single URL when cleaning results in invalid', () => {
                const urls = getLogoUrlFallbacks('https://www.');
                expect(urls).toHaveLength(1);
            });
        });

        describe('Environment Variables in Fallbacks', () => {
            it('uses LOGO_DEV_TOKEN in first URL', () => {
                process.env.LOGO_DEV_TOKEN = 'fallback-token-456';
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls[0]).toContain('token=fallback-token-456');
            });

            it('uses default token when env var not set', () => {
                delete process.env.LOGO_DEV_TOKEN;
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls[0]).toContain('token=LOGO_DEV_PUBLISHABLE_KEY');
            });
        });

        describe('Specific Fallback URLs', () => {
            it('logo.dev URL has correct structure', () => {
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls[0]).toMatch(/^https:\/\/img\.logo\.dev\/example\.com\?token=.+&size=\d+$/);
            });

            it('apistemic URL has correct structure', () => {
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls[1]).toBe('https://logos-api.apistemic.com/domain:example.com');
            });

            it('icon.horse URL has correct structure', () => {
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls[2]).toBe('https://icon.horse/icon/example.com');
            });

            it('google favicons URL has correct structure', () => {
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls[3]).toMatch(/^https:\/\/www\.google\.com\/s2\/favicons\?domain=example\.com&sz=\d+$/);
            });

            it('random letter URL has correct structure', () => {
                const urls = getLogoUrlFallbacks('example.com');
                expect(urls[4]).toMatch(/^https:\/\/logos-api\.apistemic\.com\/domain:[a-z]\.com$/);
            });
        });

        describe('Edge Cases in Fallbacks', () => {
            it('handles long domain names', () => {
                const longDomain = 'very-long-domain-name-example.com';
                const urls = getLogoUrlFallbacks(longDomain);
                expect(urls).toHaveLength(5);
                expect(urls[0]).toContain(longDomain);
            });

            it('handles subdomains', () => {
                const urls = getLogoUrlFallbacks('mail.google.com');
                expect(urls).toHaveLength(5);
                expect(urls[0]).toContain('mail.google.com');
            });

            it('handles country code TLDs', () => {
                const urls = getLogoUrlFallbacks('example.co.uk');
                expect(urls).toHaveLength(5);
                expect(urls[0]).toContain('example.co.uk');
            });
        });
    });
});
