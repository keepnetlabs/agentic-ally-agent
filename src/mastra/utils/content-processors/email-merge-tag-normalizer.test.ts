import { describe, expect, it } from 'vitest';
import { normalizeEmailMergeTags } from './email-merge-tag-normalizer';

describe('normalizeEmailMergeTags', () => {
  it('leaves valid merge tags untouched', () => {
    const html = '<a href="{PHISHINGURL}">Click {FIRSTNAME}</a>';
    const { html: out, corrections } = normalizeEmailMergeTags(html);
    expect(out).toBe(html);
    expect(corrections).toHaveLength(0);
  });

  it('fixes case typos ({phishingurl} → {PHISHINGURL})', () => {
    const { html, corrections } = normalizeEmailMergeTags('<a href="{phishingurl}">Go</a>');
    expect(html).toBe('<a href="{PHISHINGURL}">Go</a>');
    expect(corrections).toEqual([{ from: '{phishingurl}', to: '{PHISHINGURL}' }]);
  });

  it('fixes garbled tags ({PHISHINggg} → {PHISHINGURL})', () => {
    const { html } = normalizeEmailMergeTags('<a href="{PHISHINggg}">Go</a>');
    expect(html).toBe('<a href="{PHISHINGURL}">Go</a>');
  });

  it('fixes AI hallucination ({PHISHING_URL} → {PHISHINGURL})', () => {
    const { html } = normalizeEmailMergeTags('<a href="{PHISHING_URL}">Go</a>');
    expect(html).toBe('<a href="{PHISHINGURL}">Go</a>');
  });

  it('fixes {FRSTNAME} → {FIRSTNAME}', () => {
    const { html } = normalizeEmailMergeTags('Hello {FRSTNAME}');
    expect(html).toBe('Hello {FIRSTNAME}');
  });

  it('fixes {COMANYNAME} → {COMPANYNAME}', () => {
    const { html } = normalizeEmailMergeTags('{COMANYNAME}');
    expect(html).toBe('{COMPANYNAME}');
  });

  it('fixes {EMAL} → {EMAIL}', () => {
    const { html } = normalizeEmailMergeTags('{EMAL}');
    expect(html).toBe('{EMAIL}');
  });

  it('fixes {LASNAME} → {LASTNAME}', () => {
    const { html } = normalizeEmailMergeTags('{LASNAME}');
    expect(html).toBe('{LASTNAME}');
  });

  it('does NOT match completely unrelated tokens', () => {
    const input = '<td style="color:{red}">test</td>';
    const { html, corrections } = normalizeEmailMergeTags(input);
    expect(html).toBe(input);
    expect(corrections).toHaveLength(0);
  });

  it('handles multiple typos in one HTML string', () => {
    const input = 'Hi {FRSTNAME}, click <a href="{phishingurl}">here</a> - {COMANYNAME}';
    const { html, corrections } = normalizeEmailMergeTags(input);
    expect(html).toBe('Hi {FIRSTNAME}, click <a href="{PHISHINGURL}">here</a> - {COMPANYNAME}');
    expect(corrections).toHaveLength(3);
  });

  it('is a no-op for non-string input', () => {
    expect(normalizeEmailMergeTags(null as any).html).toBe(null);
    expect(normalizeEmailMergeTags(undefined as any).html).toBe(undefined);
    expect(normalizeEmailMergeTags('').html).toBe('');
  });

  it('preserves all valid tags in a complex template', () => {
    const input = `
      <p>Dear {FULLNAME},</p>
      <p>From: {FROMNAME} ({FROMEMAIL})</p>
      <p>Subject: {SUBJECT}</p>
      <p>Date: {DATEEMAILSENT} / {DATE_SENT} / {CURRENT_DATE}</p>
      <p>Expires: {CURRENT_DATE_PLUS_10_DAYS}</p>
      <p>Started: {CURRENT_DATE_MINUS_10_DAYS}</p>
      <p>Ref: {RANDOM_NUMBER_3_DIGITS}</p>
      <img src="{COMPANYLOGO}">
      <a href="{PHISHINGURL}">Click</a>
    `;
    const { html, corrections } = normalizeEmailMergeTags(input);
    expect(html).toBe(input);
    expect(corrections).toHaveLength(0);
  });

  it('fixes {DATESENT} → {DATE_SENT}', () => {
    const { html } = normalizeEmailMergeTags('{DATESENT}');
    expect(html).toBe('{DATE_SENT}');
  });

  it('fixes {COMPANY_NAME} → {COMPANYNAME}', () => {
    const { html } = normalizeEmailMergeTags('{COMPANY_NAME}');
    expect(html).toBe('{COMPANYNAME}');
  });

  it('fixes unclosed {phishing (missing closing brace)', () => {
    const { html } = normalizeEmailMergeTags('click <a href="{phishing">here</a>');
    expect(html).toContain('{PHISHINGURL}');
  });

  it('fixes unclosed {FIRSTNAME without brace', () => {
    const { html } = normalizeEmailMergeTags('Hello {FIRSTNAME, welcome');
    expect(html).toContain('{FIRSTNAME}');
  });

  it('fixes double closing brace {PHISHINGURL}}', () => {
    const { html } = normalizeEmailMergeTags('<a href="{PHISHINGURL}}">Legal</a>');
    expect(html).toBe('<a href="{PHISHINGURL}">Legal</a>');
  });

  it('fixes double opening brace {{FIRSTNAME}', () => {
    const { html } = normalizeEmailMergeTags('Hello {{FIRSTNAME}');
    expect(html).toBe('Hello {FIRSTNAME}');
  });

  it('fixes double both braces {{EMAIL}}', () => {
    const { html } = normalizeEmailMergeTags('{{EMAIL}}');
    expect(html).toBe('{EMAIL}');
  });

  it('does NOT touch short unclosed tokens like {a or {bg', () => {
    const input = '<td style="color: {red">test</td>';
    const { html, corrections } = normalizeEmailMergeTags(input);
    expect(html).toBe(input);
    expect(corrections).toHaveLength(0);
  });
});
