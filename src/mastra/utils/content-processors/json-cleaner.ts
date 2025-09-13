import { jsonrepair } from 'jsonrepair';

export function cleanResponse(text: string, sectionName: string): string {
  try {
    console.log(`🧹 Cleaning ${sectionName} response (${text.length} chars)`);

    // Use json-repair to fix all JSON issues automatically
    const clean = jsonrepair(text.trim());
    console.log(`🔧 Applied json-repair to ${sectionName}`);

    console.log(`✅ ${sectionName} cleaned successfully (${clean.length} chars)`);
    return clean;
  } catch (cleanErr) {
    console.error(`❌ Error cleaning ${sectionName}:`, cleanErr);
    console.log(`🔍 Raw ${sectionName} text (first 500 chars):`, text.substring(0, 500));
    throw new Error(`Failed to clean ${sectionName} response: ${cleanErr instanceof Error ? cleanErr.message : String(cleanErr)}`);
  }
}
