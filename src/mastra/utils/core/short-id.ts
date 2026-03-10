/**
 * Generates a short, URL-safe alphanumeric ID.
 * Used for batchResourceId which has a varchar(12) constraint in the platform DB.
 *
 * 62^12 ≈ 3.2 × 10²¹ combinations — collision-safe for our volume.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateBatchId(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}
