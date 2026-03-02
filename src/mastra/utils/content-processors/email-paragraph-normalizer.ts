/**
 * Converts raw text + <br><br> paragraph breaks inside email <td> cells into
 * proper <p> elements for GrapeJS text editability.
 *
 * Problem: LLM generates body text as raw text nodes separated by <br><br>.
 * Raw text nodes have no DOM element boundary, so GrapeJS cannot make them
 * individually selectable or editable. Wrapping each chunk in a <p> gives
 * GrapeJS a proper element boundary per paragraph.
 *
 * Outlook safety: <p style='margin:0 0 12px 0'> is well-supported in all
 * Outlook versions (Word renderer). Nested table cells are skipped to preserve
 * email layout structure.
 */

const P_STYLE = "margin:0 0 12px 0;";

/**
 * Wraps <br><br>-separated text blocks inside a single <td> into <p> elements.
 * Preserves inline elements (<strong>, <em>, <a>, <br>, <span>).
 * Skips cells that already use <p> tags, contain nested tables, or have no double-br.
 */
export function normalizeEmailParagraphs(html: string): string {
  return html.replace(
    /(<td\b[^>]*>)([\s\S]*?)(<\/td>)/gi,
    (match, openTag, content, closeTag) => {
      // Skip cells that already have <p> tags — already normalized
      if (/<p\b/i.test(content)) return match;

      // Skip layout cells: those containing nested tables (header/footer/wrapper cells)
      // Processing these would corrupt the overall email structure
      if (/<table\b/i.test(content)) return match;

      // Skip cells with no double-br paragraph breaks — nothing to split
      if (!/<br\s*\/?>\s*<br\s*\/?>/i.test(content)) return match;

      // Skip structural/decorative cells — require meaningful text content
      const textContent = content.replace(/<[^>]+>/g, '').trim();
      if (textContent.length < 10) return match;

      // Split on double <br> (paragraph boundaries), keep single <br> within paragraphs
      const chunks = content
        .split(/<br\s*\/?>\s*<br\s*\/?>/gi)
        .map((chunk: string) => chunk.trim())
        .filter((chunk: string) => chunk.length > 0);

      if (chunks.length <= 1) return match;

      const wrapped = chunks
        .map((chunk: string) => {
          // Block elements stay as-is (div, h*, ul, ol, li)
          if (/^<(?:div|h[1-6]|ul|ol|li)\b/i.test(chunk)) return chunk;
          // Wrap text and inline content in <p>
          return `<p style='${P_STYLE}'>${chunk}</p>`;
        })
        .join('\n');

      return `${openTag}\n${wrapped}\n${closeTag}`;
    }
  );
}
