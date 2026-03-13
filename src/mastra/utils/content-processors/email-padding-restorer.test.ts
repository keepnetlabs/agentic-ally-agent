import { describe, it, expect } from 'vitest';
import { restoreLostPadding } from './email-padding-restorer';

describe('restoreLostPadding', () => {
  it('restores padding when AI completely removed it', () => {
    const original = `<td id="abc" style="padding: 32px; color: #333;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: #333;">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toContain('padding: 32px');
    expect(result).toContain('color: #333');
  });

  it('does not override AI padding choices', () => {
    const original = `<td id="abc" style="padding: 32px;">Content</td>`;
    const aiOutput = `<td id="abc" style="padding: 16px;">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toContain('padding: 16px');
    expect(result).not.toContain('padding: 32px');
  });

  it('does not override when AI has longhand padding', () => {
    const original = `<td id="abc" style="padding: 32px;">Content</td>`;
    const aiOutput = `<td id="abc" style="padding-top: 20px; padding-bottom: 20px;">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toContain('padding-top: 20px');
    expect(result).not.toContain('padding: 32px');
  });

  it('adds style attribute when AI td has none', () => {
    const original = `<td id="abc" style="padding: 24px 32px;">Content</td>`;
    const aiOutput = `<td id="abc">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toContain('padding: 24px 32px');
  });

  it('returns unchanged when IDs do not match', () => {
    const original = `<td id="abc" style="padding: 32px;">Content</td>`;
    const aiOutput = `<td id="xyz" style="color: red;">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toBe(aiOutput);
  });

  it('ignores zero padding in original', () => {
    const original = `<td id="abc" style="padding: 0;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: red;">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toBe(aiOutput);
  });

  it('restores longhand padding values', () => {
    const original = `<td id="abc" style="padding-top: 20px; padding-left: 32px; padding-right: 32px;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: #333;">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toContain('padding-top: 20px');
    expect(result).toContain('padding-left: 32px');
    expect(result).toContain('padding-right: 32px');
  });

  it('handles multiple elements', () => {
    const original = `
      <td id="card1" style="padding: 32px;">Card 1</td>
      <td id="card2" style="padding: 16px;">Card 2</td>
    `;
    const aiOutput = `
      <td id="card1" style="color: #333;">Card 1</td>
      <td id="card2" style="color: #333;">Card 2</td>
    `;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toContain('padding: 32px');
    expect(result).toContain('padding: 16px');
  });

  it('returns unchanged when original has no padding', () => {
    const original = `<td id="abc" style="color: red;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: blue;">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toBe(aiOutput);
  });

  it('handles id before style in tag', () => {
    const original = `<td id="abc" style="padding: 32px;">Content</td>`;
    const aiOutput = `<td id="abc" style="font-size: 14px;">Content</td>`;

    const result = restoreLostPadding(original, aiOutput);
    expect(result).toContain('padding: 32px');
    expect(result).toContain('font-size: 14px');
  });
});
