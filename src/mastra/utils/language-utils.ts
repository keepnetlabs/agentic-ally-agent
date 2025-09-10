
// BCP-47 language code validation and normalization
export function validateBCP47LanguageCode(code: string): string {
  const bcp47Codes: Record<string, string> = {
    'en': 'en', 'english': 'en', 'eng': 'en',
    'tr': 'tr', 'turkish': 'tr', 'tur': 'tr', 'turkce': 'tr', 'türkçe': 'tr',
    'de': 'de', 'german': 'de', 'deutsch': 'de', 'ger': 'de',
    'fr': 'fr', 'french': 'fr', 'francais': 'fr', 'français': 'fr',
    'es': 'es', 'spanish': 'es', 'español': 'es', 'espanol': 'es',
    'it': 'it', 'italian': 'it', 'italiano': 'it',
    'pt': 'pt', 'portuguese': 'pt', 'português': 'pt',
    'ru': 'ru', 'russian': 'ru', 'русский': 'ru',
    'zh': 'zh', 'chinese': 'zh', '中文': 'zh',
    'ja': 'ja', 'japanese': 'ja', '日本語': 'ja',
    'ar': 'ar', 'arabic': 'ar', 'العربية': 'ar',
    'ko': 'ko', 'korean': 'ko', '한국어': 'ko',
    'nl': 'nl', 'dutch': 'nl', 'nederlands': 'nl',
    'pl': 'pl', 'polish': 'pl', 'polski': 'pl',
    'sv': 'sv', 'swedish': 'sv', 'svenska': 'sv',
    'no': 'no', 'norwegian': 'no', 'norsk': 'no',
    'da': 'da', 'danish': 'da', 'dansk': 'da',
    'fi': 'fi', 'finnish': 'fi', 'suomi': 'fi'
  };

  const normalized = code.toLowerCase().trim();
  return bcp47Codes[normalized] || 'en'; // default to English if not found
}

// Generate unique microlearning ID from topic
export function generateMicrolearningId(topic: string): string {
  return topic.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30) + '-' + Date.now().toString().slice(-6);
}

// Normalize department name for file paths (replace spaces with hyphens)
export function normalizeDepartmentName(department: string): string {
  return department.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}