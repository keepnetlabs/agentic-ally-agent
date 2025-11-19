
// Default language constant
export const DEFAULT_LANGUAGE = "en-gb";

// BCP-47 language code validation and normalization (standalone, no deps)
export function validateBCP47LanguageCode(input: string): string {
  // 1) Sanitize
  const raw = String(input || "").trim().replace(/^['"]|['"]$/g, "");
  if (!raw) return DEFAULT_LANGUAGE;

  // 2) Minimal synonyms (optional – extend as needed)
  const aliases: Record<string, string> = {
    english: "en", eng: "en",
    turkish: "tr", tur: "tr", turkce: "tr", "türkçe": "tr",
    german: "de", deutsch: "de",
    french: "fr", francais: "fr", "français": "fr",
    spanish: "es", espanol: "es", "español": "es",
    italian: "it", italiano: "it",
    portuguese: "pt", "português": "pt",
    russian: "ru",
    chinese: "zh",
    japanese: "ja",
    arabic: "ar",
    korean: "ko",
    dutch: "nl", nederlands: "nl",
    polish: "pl", polski: "pl",
    swedish: "sv", svenska: "sv",
    norwegian: "no", norsk: "no",
    danish: "da", dansk: "da",
    finnish: "fi", suomi: "fi"
  };
  const lower = raw.toLowerCase().replace(/_/g, "-");
  let tag = aliases[lower] ?? lower;

  // 3) Legacy/typo fixes
  if (tag === "en-uk") tag = "en-gb"; // normalize UK -> GB (preserve variant)

  // 4) Try Intl canonicalization when available
  try {
    // @ts-ignore
    const canon = (Intl.getCanonicalLocales?.(tag) || [])[0];
    if (canon) tag = canon;
  } catch (error) {
    // Fallback if Intl.getCanonicalLocales not available (older Node.js)
    console.log('ℹ️ Intl.getCanonicalLocales not available, using fallback BCP-47 normalization');
  }

  // 5) BCP-47 casing: language lower, script Title, region UPPER
  const parts = tag.split("-");
  const lang = (parts[0] || "").toLowerCase();
  const rest = parts.slice(1).map(p => {
    if (/^[A-Za-z]{4}$/.test(p)) return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); // Script
    if (/^[A-Za-z]{2}$/.test(p) || /^\d{3}$/.test(p)) return p.toUpperCase(); // Region
    return p.toLowerCase(); // Variants/extensions
  });
  let normalized = [lang, ...rest].filter(Boolean).join("-");

  // 6) Preferred regional defaults if no region was provided
  const hasRegion = !!rest.find(p => /^[A-Z]{2}$/.test(p) || /^\d{3}$/.test(p));
  const defaultRegionForLang: Record<string, string> = {
    en: "GB",  // Default English to GB (when no region specified)
    tr: "TR",
    fr: "FR",
    es: "ES",
    pt: "PT",
    de: "DE",
    it: "IT",
    nl: "NL",
    sv: "SE",
    no: "NO",
    da: "DK",
    fi: "FI",
    pl: "PL",
    ru: "RU",
    zh: "CN",
    ja: "JP",
    ar: "SA",
    ko: "KR"
  };

  if (!hasRegion) {
    const preferred = defaultRegionForLang[lang];
    if (preferred) normalized = `${lang}-${preferred}`;
  }

  // 7) Final safety default
  if (!normalized) normalized = DEFAULT_LANGUAGE;

  return normalized;
}

// Generate unique microlearning ID from topic
export function generateMicrolearningId(topic: string): string {
  return topic.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + '-' + Date.now().toString().slice(-6);
}

// Normalize department name for file paths (replace spaces with hyphens)
export function normalizeDepartmentName(department: string): string {
  return department.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}