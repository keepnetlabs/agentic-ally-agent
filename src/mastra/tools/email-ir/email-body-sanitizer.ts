/**
 * Email Body Sanitizer
 * 
 * Removes token-heavy content that doesn't contribute to email classification:
 * - Base64 encoded images and content
 * - CSS styles
 * - HTML comments
 * - Script tags
 * - Excessive whitespace
 * 
 * This can reduce token usage by 80-95% for emails with embedded images.
 */

/**
 * Sanitizes email HTML body to reduce token usage while preserving meaningful content.
 * 
 * @param htmlBody - Raw HTML body from email
 * @returns Cleaned body suitable for LLM analysis
 */
export function sanitizeEmailBody(htmlBody: string): string {
    if (!htmlBody) return '';

    let cleaned = htmlBody;

    // 1. Remove base64 encoded images (biggest token consumer)
    // Matches: data:image/png;base64,iVBORw0KGgo...
    cleaned = cleaned.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/gi, '[IMAGE]');

    // 2. Remove other base64 content (attachments, fonts, etc.)
    // Matches long base64 strings (100+ chars)
    cleaned = cleaned.replace(/base64,[A-Za-z0-9+/=]{100,}/gi, '[BASE64_CONTENT]');

    // 3. Remove CSS style blocks
    // Matches: <style>...</style>
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // 4. Remove inline styles (often very long)
    // Matches: style="..."
    cleaned = cleaned.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '');

    // 5. Remove HTML comments
    // Matches: <!-- ... -->
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // 6. Remove script tags (security + token saving)
    // Matches: <script>...</script>
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // 7. Remove tracking pixels and 1x1 images
    // Matches: <img ... width="1" ... height="1" ...>
    cleaned = cleaned.replace(/<img[^>]*(?:width|height)\s*=\s*["']?1["']?[^>]*>/gi, '[TRACKING_PIXEL]');

    // 8. Remove empty tags
    // Matches: <div></div>, <span></span>, etc.
    cleaned = cleaned.replace(/<(\w+)[^>]*>\s*<\/\1>/gi, '');

    // 9. Remove excessive whitespace (newlines, tabs, multiple spaces)
    cleaned = cleaned.replace(/\s+/g, ' ');

    // 10. Trim leading/trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Extracts plain text from HTML, removing all tags.
 * Useful when HTML structure is not needed.
 * 
 * @param html - HTML content
 * @returns Plain text content
 */
export function htmlToPlainText(html: string): string {
    if (!html) return '';

    let text = html;

    // Replace common block elements with newlines
    text = text.replace(/<\/(p|div|br|h[1-6]|li|tr)>/gi, '\n');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode common HTML entities
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&amp;/gi, '&');
    text = text.replace(/&lt;/gi, '<');
    text = text.replace(/&gt;/gi, '>');
    text = text.replace(/&quot;/gi, '"');
    text = text.replace(/&#39;/gi, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}
