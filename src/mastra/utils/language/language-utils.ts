import { getLogger } from '../core/logger';
import { generateSlugId } from '../core/id-utils';

const logger = getLogger('LanguageUtils');

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
    chinese: "zh", mandarin: "zh", cantonese: "yue",
    "simplified chinese": "zh-hans", "traditional chinese": "zh-hant",
    japanese: "ja",
    arabic: "ar",
    korean: "ko", hangul: "ko",
    dutch: "nl", nederlands: "nl",
    polish: "pl", polski: "pl",
    swedish: "sv", svenska: "sv",
    norwegian: "no", norsk: "no",
    danish: "da", dansk: "da",
    finnish: "fi", suomi: "fi",
    greek: "el", hellenic: "el",
    czech: "cs", cesky: "cs", "čeština": "cs",
    slovak: "sk", slovencina: "sk", "slovenčina": "sk",
    hungarian: "hu", magyar: "hu",
    romanian: "ro", romana: "ro", "română": "ro",
    bulgarian: "bg", bulgarski: "bg", "български": "bg",
    ukrainian: "uk", ukrainska: "uk", "українська": "uk",
    hebrew: "he", ivrit: "he",
    hindi: "hi",
    nepali: "ne",
    sinhala: "si",
    indonesian: "id", bahasa: "id", "bahasa indonesia": "id",
    malay: "ms", "bahasa melayu": "ms",
    thai: "th",
    vietnamese: "vi", tiengviet: "vi", "tiếng việt": "vi",
    filipino: "fil", tagalog: "tl", tagalog_ph: "tl",
    lao: "lo",
    khmer: "km",
    burmese: "my", myanmar: "my",
    estonian: "et", eesti: "et",
    latvian: "lv", latviski: "lv",
    lithuanian: "lt", lietuviu: "lt", "lietuvių": "lt",
    slovenian: "sl", slovenscina: "sl", "slovenščina": "sl",
    croatian: "hr", hrvatski: "hr",
    serbian: "sr", srpski: "sr", "српски": "sr",
    bosnian: "bs", bosanski: "bs",
    macedonian: "mk", makedonski: "mk", "македонски": "mk",
    albanian: "sq", shqip: "sq",
    icelandic: "is", islenska: "is", "íslenska": "is",
    irish: "ga", gaelic: "ga",
    catalan: "ca", catala: "ca", "català": "ca",
    basque: "eu", euskara: "eu",
    galician: "gl", galego: "gl",
    persian: "fa", farsi: "fa",
    urdu: "ur",
    bengali: "bn", bangla: "bn",
    tamil: "ta",
    telugu: "te",
    marathi: "mr",
    gujarati: "gu",
    kannada: "kn",
    malayalam: "ml",
    punjabi: "pa",
    oriya: "or", odia: "or",
    assamese: "as",
    swahili: "sw", kiswahili: "sw",
    afrikaans: "af",
    zulu: "zu",
    xhosa: "xh",
    somali: "so",
    amharic: "am",
    yoruba: "yo",
    igbo: "ig",
    hausa: "ha",
    kazakh: "kk",
    uzbek: "uz",
    azerbaijani: "az", azeri: "az",
    georgian: "ka",
    armenian: "hy",
    mongolian: "mn"
  };

  const regionAliases: Record<string, string> = {
    "united kingdom": "GB",
    "united states": "US",
    "united arab emirates": "AE",
    "turkey": "TR",
    "germany": "DE",
    "france": "FR",
    "spain": "ES",
    "portugal": "PT",
    "brazil": "BR",
    "mexico": "MX",
    "argentina": "AR",
    "colombia": "CO",
    "italy": "IT",
    "philippines": "PH",
    "netherlands": "NL",
    "sweden": "SE",
    "norway": "NO",
    "denmark": "DK",
    "finland": "FI",
    "poland": "PL",
    "russia": "RU",
    "estonia": "EE",
    "latvia": "LV",
    "lithuania": "LT",
    "slovenia": "SI",
    "croatia": "HR",
    "serbia": "RS",
    "bosnia": "BA",
    "north macedonia": "MK",
    "albania": "AL",
    "iceland": "IS",
    "ireland": "IE",
    "spain (catalonia)": "ES",
    "spain (basque country)": "ES",
    "ukraine": "UA",
    "greece": "GR",
    "czech republic": "CZ",
    "slovakia": "SK",
    "hungary": "HU",
    "romania": "RO",
    "bulgaria": "BG",
    "china": "CN",
    "japan": "JP",
    "iran": "IR",
    "pakistan": "PK",
    "bangladesh": "BD",
    "nepal": "NP",
    "myanmar": "MM",
    "laos": "LA",
    "cambodia": "KH",
    "south korea": "KR",
    "korea": "KR",
    "north korea": "KP",
    "saudi arabia": "SA",
    "egypt": "EG",
    "morocco": "MA",
    "nigeria": "NG",
    "south africa": "ZA",
    "kenya": "KE",
    "tanzania": "TZ",
    "somalia": "SO",
    "ethiopia": "ET",
    "ghana": "GH",
    "israel": "IL",
    "india": "IN",
    "indonesia": "ID",
    "malaysia": "MY",
    "thailand": "TH",
    "vietnam": "VN",
    "singapore": "SG",
    "australia": "AU",
    "canada": "CA",
    "new zealand": "NZ",
    "kazakhstan": "KZ",
    "uzbekistan": "UZ",
    "azerbaijan": "AZ",
    "georgia": "GE",
    "armenia": "AM",
    "mongolia": "MN",
    "hong kong": "HK",
    "taiwan": "TW"
  };

  const lower = raw.toLowerCase().replace(/_/g, "-");
  const parenMatch = lower.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (parenMatch) {
    const langPart = parenMatch[1].trim();
    const regionPart = parenMatch[2].trim();
    const mappedLang = aliases[langPart] ?? langPart;
    const mappedRegion = regionAliases[regionPart] ?? regionPart.toUpperCase();
    const combined = `${mappedLang}-${mappedRegion}`.replace(/\s+/g, "-");
    return validateBCP47LanguageCode(combined);
  }

  let tag = aliases[lower] ?? lower;

  // 3) Legacy/typo fixes
  if (tag === "en-uk") tag = "en-gb"; // normalize UK -> GB (preserve variant)

  // 4) Try Intl canonicalization when available
  try {
    // @ts-ignore
    const canon = (Intl.getCanonicalLocales?.(tag) || [])[0];
    if (canon) tag = canon;
  } catch {
    // Fallback if Intl.getCanonicalLocales not available (older Node.js)
    logger.info('Intl.getCanonicalLocales not available, using fallback BCP-47 normalization');
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
    yue: "HK",
    "zh-hans": "CN",
    "zh-hant": "TW",
    ja: "JP",
    ar: "SA",
    ko: "KR",
    hi: "IN",
    ur: "PK",
    bn: "BD",
    ne: "NP",
    si: "LK",
    id: "ID",
    ms: "MY",
    th: "TH",
    vi: "VN",
    fil: "PH",
    tl: "PH",
    km: "KH",
    lo: "LA",
    my: "MM",
    fa: "IR",
    sw: "KE",
    kk: "KZ",
    uz: "UZ",
    az: "AZ",
    ka: "GE",
    hy: "AM",
    mn: "MN"
  };

  if (!hasRegion) {
    const preferred = defaultRegionForLang[lang];
    if (preferred) normalized = `${lang}-${preferred}`;
  }

  // 7) Final safety default
  if (!normalized) normalized = DEFAULT_LANGUAGE;

  return normalized.toLowerCase();
}



// Generate unique microlearning ID from topic
export function generateMicrolearningId(topic: string): string {
  return generateSlugId(topic);
}

// Normalize department name for file paths (replace spaces with hyphens)
export function normalizeDepartmentName(department: string): string {
  return department.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

