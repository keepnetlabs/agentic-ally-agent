// =========================
// Localization Prompt Pack
// (Production-ready, JS-safe, durable)
// =========================

type LangKey =
  | 'tr'
  | 'en'
  | 'fr'
  | 'es'
  | 'de'
  | 'it'
  | 'pt'
  | 'nl'
  | 'sv'
  | 'no'
  | 'da'
  | 'pl'
  | 'cs'
  | 'ru'
  | 'ar'
  | 'fa'
  | 'hi'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'th'
  | 'vi'
  | 'uk'
  | 'el'
  | 'ro'
  | 'hu'
  | 'sk'
  | 'id'
  | 'bn'
  | 'ur'
  | 'he'
  | 'sw'
  | 'ku'
  | 'hr'
  | 'sr'
  | 'bg'
  | 'mk'
  | 'sq'
  | 'is'
  | 'fi'
  | 'cy'
  | 'ms'
  | 'tl'
  | 'lt'
  | 'lv'
  | 'et'
  | 'sl'
  | 'az'
  | 'ka'
  | 'af'
  | 'ca'
  | 'ta'
  | 'te'
  | 'mr'
  | 'gu'
  | 'pa'
  | 'ml'
  | 'ne'
  | 'si'
  | 'my'
  | 'km'
  | 'lo'
  | 'mn'
  | 'kk'
  | 'uz'
  | 'hy'
  | 'am'
  | 'gl'
  | 'eu'
  | 'mt'
  | 'ga'
  | 'lb'
  | 'bs'
  | 'zu'
  | 'xh'
  | 'yo'
  | 'ha'
  | 'ig'
  | 'so'
  | 'rw'
  | 'sn'
  | 'ky'
  | 'tk'
  | 'tg'
  | 'ps'
  | 'mi'
  | 'jv'
  | 'tt'
  | 'generic';

// --- 1) Lang-code normalizer (aliases + fallback) ---
export function normLang(code?: string): LangKey {
  if (!code) return 'generic';
  const raw = code.toLowerCase().trim().replace(/_/g, '-');
  const primary = raw.split('-')[0];

  const aliases: Record<string, LangKey> = {
    // Base language codes (39 languages)
    tr: 'tr',
    en: 'en',
    fr: 'fr',
    es: 'es',
    de: 'de',
    it: 'it',
    pt: 'pt',
    nl: 'nl',
    sv: 'sv',
    no: 'no',
    nb: 'no',
    nn: 'no',
    da: 'da',
    pl: 'pl',
    cs: 'cs',
    ru: 'ru',
    ar: 'ar',
    fa: 'fa',
    hi: 'hi',
    zh: 'zh',
    ja: 'ja',
    ko: 'ko',
    th: 'th',
    vi: 'vi',
    uk: 'uk',
    el: 'el',
    ro: 'ro',
    hu: 'hu',
    sk: 'sk',
    id: 'id',
    bn: 'bn',
    ur: 'ur',
    he: 'he',
    sw: 'sw',
    ku: 'ku',
    hr: 'hr',
    sr: 'sr',
    bg: 'bg',
    mk: 'mk',
    sq: 'sq',
    is: 'is',
    fi: 'fi',
    cy: 'cy',
    ms: 'ms',
    tl: 'tl',
    lt: 'lt',
    lv: 'lv',
    et: 'et',
    sl: 'sl',
    az: 'az',
    ka: 'ka',
    af: 'af',
    ca: 'ca',
    ta: 'ta',
    te: 'te',
    mr: 'mr',
    gu: 'gu',
    pa: 'pa',
    ml: 'ml',
    ne: 'ne',
    si: 'si',
    my: 'my',
    km: 'km',
    lo: 'lo',
    mn: 'mn',
    kk: 'kk',
    uz: 'uz',
    hy: 'hy',
    am: 'am',
    gl: 'gl',
    eu: 'eu',
    mt: 'mt',
    ga: 'ga',
    lb: 'lb',
    bs: 'bs',
    zu: 'zu',
    xh: 'xh',
    yo: 'yo',
    ha: 'ha',
    ig: 'ig',
    so: 'so',
    rw: 'rw',
    sn: 'sn',
    ky: 'ky',
    tk: 'tk',
    tg: 'tg',
    ps: 'ps',
    mi: 'mi',
    jv: 'jv',
    tt: 'tt',
    // Common regional variants
    'pt-br': 'pt',
    'pt-pt': 'pt',
    'zh-cn': 'zh',
    'zh-sg': 'zh',
    'zh-hans': 'zh',
    'zh-hant': 'zh',
    'zh-tw': 'zh',
    'zh-hk': 'zh',
    'en-gb': 'en',
    'en-us': 'en',
    'en-au': 'en',
    'en-ca': 'en',
    'fr-ca': 'fr',
    'es-mx': 'es',
    'es-419': 'es',
    'tr-tr': 'tr',
    'de-de': 'de',
    'it-it': 'it',
    'sr-latn': 'sr',
    'sr-cyrl': 'sr',
    'zh-yue': 'zh',
    'cy-gb': 'cy',
    'ms-my': 'ms',
    'ms-sg': 'ms',
    'tl-ph': 'tl',
    fil: 'tl',
    'fil-ph': 'tl',
    'lt-lt': 'lt',
    'lv-lv': 'lv',
    'et-ee': 'et',
    'sl-si': 'sl',
    'az-az': 'az',
    'az-latn': 'az',
    'ka-ge': 'ka',
    'af-za': 'af',
    'ca-es': 'ca',
    'ta-in': 'ta',
    'te-in': 'te',
    'mr-in': 'mr',
    'gu-in': 'gu',
    'pa-in': 'pa',
    'pa-guru': 'pa',
    'pa-pk': 'pa',
    'ml-in': 'ml',
    'ne-np': 'ne',
    'ne-in': 'ne',
    'si-lk': 'si',
    'my-mm': 'my',
    'km-kh': 'km',
    'lo-la': 'lo',
    'mn-mn': 'mn',
    'mn-cyrl': 'mn',
    'kk-kz': 'kk',
    'kk-cyrl': 'kk',
    'kk-latn': 'kk',
    'uz-uz': 'uz',
    'uz-latn': 'uz',
    'uz-cyrl': 'uz',
    'hy-am': 'hy',
    'am-et': 'am',
    'gl-es': 'gl',
    'eu-es': 'eu',
    'mt-mt': 'mt',
    'ga-ie': 'ga',
    'lb-lu': 'lb',
    'bs-ba': 'bs',
    'bs-latn': 'bs',
    'bs-cyrl': 'bs',
    'zu-za': 'zu',
    'xh-za': 'xh',
    'yo-ng': 'yo',
    'yo-bj': 'yo',
    'ha-ng': 'ha',
    'ha-ne': 'ha',
    'ha-gh': 'ha',
    'ig-ng': 'ig',
    'so-so': 'so',
    'so-et': 'so',
    'so-ke': 'so',
    'so-dj': 'so',
    'rw-rw': 'rw',
    'sn-zw': 'sn',
    'ky-kg': 'ky',
    'ky-cyrl': 'ky',
    'tk-tm': 'tk',
    'tk-latn': 'tk',
    'tg-tj': 'tg',
    'tg-cyrl': 'tg',
    'ps-af': 'ps',
    'ps-pk': 'ps',
    'mi-nz': 'mi',
    'jv-id': 'jv',
    'jv-latn': 'jv',
    'tt-ru': 'tt',
    'tt-cyrl': 'tt',
    // Full language names (for AI outputs like "Turkish", "English", etc.)
    turkish: 'tr',
    türkçe: 'tr',
    turkce: 'tr',
    turk: 'tr',
    english: 'en',
    eng: 'en',
    german: 'de',
    deutsch: 'de',
    french: 'fr',
    francais: 'fr',
    français: 'fr',
    spanish: 'es',
    espanol: 'es',
    español: 'es',
    italian: 'it',
    italiano: 'it',
    portuguese: 'pt',
    português: 'pt',
    russian: 'ru',
    россия: 'ru',
    chinese: 'zh',
    japanese: 'ja',
    arabic: 'ar',
    korean: 'ko',
    dutch: 'nl',
    nederlands: 'nl',
    polish: 'pl',
    polski: 'pl',
    swedish: 'sv',
    svenska: 'sv',
    norwegian: 'no',
    norsk: 'no',
    danish: 'da',
    dansk: 'da',
    czech: 'cs',
    česky: 'cs',
    persian: 'fa',
    farsi: 'fa',
    hindi: 'hi',
    thai: 'th',
    vietnamese: 'vi',
    ukrainian: 'uk',
    українська: 'uk',
    greek: 'el',
    ελληνικά: 'el',
    romanian: 'ro',
    română: 'ro',
    hungarian: 'hu',
    magyar: 'hu',
    slovak: 'sk',
    slovenčina: 'sk',
    indonesian: 'id',
    'bahasa indonesia': 'id',
    bengali: 'bn',
    বাংলা: 'bn',
    urdu: 'ur',
    اردو: 'ur',
    hebrew: 'he',
    עברית: 'he',
    swahili: 'sw',
    kurdish: 'ku',
    کوردی: 'ku',
    croatian: 'hr',
    hrvatski: 'hr',
    serbian: 'sr',
    србија: 'sr',
    bulgarian: 'bg',
    български: 'bg',
    macedonian: 'mk',
    македонски: 'mk',
    albanian: 'sq',
    shqiptare: 'sq',
    icelandic: 'is',
    íslenska: 'is',
    finnish: 'fi',
    suomi: 'fi',
    welsh: 'cy',
    cymraeg: 'cy',
    malay: 'ms',
    'bahasa melayu': 'ms',
    melayu: 'ms',
    filipino: 'tl',
    tagalog: 'tl',
    lithuanian: 'lt',
    lietuvių: 'lt',
    latvian: 'lv',
    latviešu: 'lv',
    estonian: 'et',
    eesti: 'et',
    slovenian: 'sl',
    slovenščina: 'sl',
    slovene: 'sl',
    azerbaijani: 'az',
    azərbaycan: 'az',
    azeri: 'az',
    georgian: 'ka',
    ქართული: 'ka',
    afrikaans: 'af',
    catalan: 'ca',
    català: 'ca',
    tamil: 'ta',
    தமிழ்: 'ta',
    telugu: 'te',
    తెలుగు: 'te',
    marathi: 'mr',
    मराठी: 'mr',
    gujarati: 'gu',
    ગુજરાતી: 'gu',
    punjabi: 'pa',
    panjabi: 'pa',
    ਪੰਜਾਬੀ: 'pa',
    پنجابی: 'pa',
    malayalam: 'ml',
    മലയാളം: 'ml',
    nepali: 'ne',
    नेपाली: 'ne',
    sinhala: 'si',
    sinhalese: 'si',
    සිංහල: 'si',
    burmese: 'my',
    myanmar: 'my',
    မြန်မာ: 'my',
    khmer: 'km',
    cambodian: 'km',
    ខ្មែរ: 'km',
    lao: 'lo',
    laotian: 'lo',
    ລາວ: 'lo',
    mongolian: 'mn',
    монгол: 'mn',
    kazakh: 'kk',
    қазақ: 'kk',
    қазақша: 'kk',
    uzbek: 'uz',
    oʻzbek: 'uz',
    ўзбек: 'uz',
    armenian: 'hy',
    հայերեն: 'hy',
    amharic: 'am',
    አማርኛ: 'am',
    galician: 'gl',
    galego: 'gl',
    basque: 'eu',
    euskara: 'eu',
    maltese: 'mt',
    malti: 'mt',
    irish: 'ga',
    gaeilge: 'ga',
    luxembourgish: 'lb',
    lëtzebuergesch: 'lb',
    bosnian: 'bs',
    bosanski: 'bs',
    zulu: 'zu',
    isizulu: 'zu',
    xhosa: 'xh',
    isixhosa: 'xh',
    yoruba: 'yo',
    yorùbá: 'yo',
    hausa: 'ha',
    igbo: 'ig',
    somali: 'so',
    soomaali: 'so',
    kinyarwanda: 'rw',
    ikinyarwanda: 'rw',
    shona: 'sn',
    chishona: 'sn',
    kyrgyz: 'ky',
    кыргызча: 'ky',
    kirghiz: 'ky',
    turkmen: 'tk',
    türkmençe: 'tk',
    tajik: 'tg',
    тоҷикӣ: 'tg',
    pashto: 'ps',
    پښتو: 'ps',
    pushto: 'ps',
    maori: 'mi',
    māori: 'mi',
    'te reo māori': 'mi',
    javanese: 'jv',
    'basa jawa': 'jv',
    tatar: 'tt',
    татарча: 'tt',
    татар: 'tt',
  };

  return aliases[raw] || aliases[primary] || 'generic';
}

// --- 2) Language-specific guardrails (map-based) ---
const RULES_BY_LANG: Record<LangKey, string> = {
  tr: `
### 🇹🇷 Turkish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "uyanık kalın", "uyanık kal", "uyanık olun", "gözünüz açık", "gözünüz açık olsun"
  - FORBIDDEN: "aferin", "bravo", "helal", "hadi bakalım", "sakın ola", "aman dikkat"
  - FORBIDDEN: Any variations of these phrases in ANY form

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Dikkat edin", "Lütfen dikkat", "Lütfen doğrulayın", "Kontrol edin", "Düşünün"
For praise/completion: "Tebrikler!", "Başarılı bir şekilde tamamladınız.", "Başarı ile tamamlandı."
For instruction: Use active imperative verbs naturally (e.g., "Yapın", "Kontrol edin", "Öğrenin")

📝 TERMINOLOGY & NATURALNESS (Turkish-specific):
  - "phishing" → "oltalama" (preferred native term) or "phishing" (accepted loanword)
  - "email" → "e-posta" (ALWAYS use Turkish term, NEVER "email")
  - "password" → "parola" or "şifre" (pick one consistently per module)
  - "security" → "güvenlik"
  - "training" → "eğitim"
  - "download" → "indirme" (NEVER "download")
  - "link" → "bağlantı" (NEVER "link")
  - CRITICAL: Avoid mixing Turkish with English in the same phrase or sentence. If a loanword like "phishing" is used, the rest of the sentence must be fully natural Turkish.
    ❌ "Phishing email'lerine dikkat edin" → ✅ "Oltalama e-postalarına dikkat edin"
  - Use consistent Turkish suffixes and vowel harmony when adapting loanwords.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- If multiple valid alternatives exist, choose the most neutral/professional
- Keep tone respectful, confident, and adult. Avoid teacher–student or parental tone.
`.trim(),

  en: `
### 🇬🇧 English Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "stay sharp", "stay alert", "stay vigilant", "keep your eyes open", "keep eyes open"
  - FORBIDDEN: "good job buddy", "attagirl", "attaboy", "way to go"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Pay attention", "Check carefully", "Verify before proceeding", "Review thoroughly"
For praise/completion: "Well done", "Excellent", "You've completed the training successfully"

📝 TERMINOLOGY & NATURALNESS (English-specific):
  - "phishing" → "phishing" (standard)
  - "email" → "email" (standard)
  - "password" → "password" (standard)
  - "security" → "security" (standard)
  - "training" → "training" (standard)
  - "download" → "download" (standard)
  - "link" → "link" (standard)
  - Use plain, direct language — avoid corporate jargon or overly technical phrasing where simpler alternatives exist:
    ❌ "Leverage your cybersecurity awareness capabilities" → ✅ "Use what you've learned to stay safe"
    ❌ "Facilitate the reporting of anomalous communications" → ✅ "Report suspicious emails"
  - Prefer active voice over passive:
    ❌ "The link should be verified before being clicked" → ✅ "Verify the link before you click"
  - Distinguish en-GB vs en-US where relevant:
    GB: "organisation", "recognise", "analyse", "colour"
    US: "organization", "recognize", "analyze", "color"
  - When target audience is unknown, default to British English (en-GB).
  - Keep sentences short (8-18 words). One idea per sentence.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Tone: professional, concise, confident.
`.trim(),

  fr: `
### 🇫🇷 French Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "restez vigilants", "restez alerte", "soyez attentif", "gardez l'œil ouvert"
  - FORBIDDEN: "bravo", "bien joué", "c'est bien"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Faites attention", "Veuillez vérifier", "Examinez attentivement", "Vérifiez avant de cliquer"
For praise/completion: "Félicitations", "Excellent", "Formation terminée avec succès"

📝 TERMINOLOGY & NATURALNESS (French-specific):
  - "phishing" → "hameçonnage" (formal/official) or "phishing" (accepted in IT contexts) — pick one consistently per module
  - "email" → "e-mail" or "courriel" (pick ONE and use consistently throughout; "courriel" is more formal/Canadian)
  - "password" → "mot de passe"
  - "security" → "sécurité"
  - "training" → "formation"
  - "download" → "télécharger" (verb) / "téléchargement" (noun) — NEVER "downloader"
  - "link" → "lien"
  - Use "vous" (formal) — NEVER "tu" in professional content.
  - Avoid anglicisms where standard French terms exist:
    ❌ "Cliquez pour downloader" → ✅ "Cliquez pour télécharger"
    ❌ "Le training de sécurité" → ✅ "La formation en sécurité"
  - Prefer natural French phrasing over literal English calques.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Keep tone calm, courteous, professional (avoid multiple exclamations).
`.trim(),

  es: `
### 🇪🇸 Spanish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "¡bravo!", "¡cuidado!", "¡ojo!", "¡atención!", "¡esté atento!", "vigile"
  - FORBIDDEN: "buen trabajo", "mantente alerta"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Por favor verifica", "Revisa cuidadosamente", "Examina antes de hacer clic", "Confirma"
For praise/completion: "¡Felicidades!", "Excelente", "Completaste la formación con éxito"

📝 TERMINOLOGY & NATURALNESS (Spanish-specific):
  - "phishing" → "phishing" (accepted loanword in Spanish IT) or "suplantación de identidad" (descriptive, for formal docs)
  - "email" → "correo electrónico" (formal) or "correo" (shorter, for UI) — NEVER "email" alone in full sentences
  - "password" → "contraseña"
  - "security" → "seguridad"
  - "training" → "formación" (Spain) or "capacitación" (Latin America) — pick one consistently per module
  - "download" → "descargar" (verb) / "descarga" (noun) — NEVER "downloadear"
  - "link" → "enlace" (preferred) or "vínculo" — NEVER "link" in formal content
  - Use "usted"/"ustedes" (formal) for professional content — NEVER "tú"/"vosotros".
  - Distinguish Spain vs Latin American Spanish where relevant:
    ES: "ordenador", "formación", "móvil"
    LATAM: "computadora", "capacitación", "celular"
  - When target audience is unknown, default to neutral international Spanish.
  - Avoid anglicisms where standard Spanish terms exist:
    ❌ "Clickea el link" → ✅ "Haga clic en el enlace"
    ❌ "Forwardear el mail" → ✅ "Reenviar el correo"

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Tone: friendly yet professional.
`.trim(),

  de: `
### 🇩🇪 German Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Achtung!", "Seien Sie wachsam!", "Passen Sie auf!", "Seien Sie vorsichtig!"
  - FORBIDDEN: "Bravo!", "Sehr gut!", "Gut gemacht!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Bitte überprüfen", "Prüfen Sie sorgfältig", "Kontrollieren Sie", "Verifizieren Sie vor dem Klick"
For praise/completion: "Glückwunsch", "Ausgezeichnet", "Schulung erfolgreich abgeschlossen"

📝 TERMINOLOGY & NATURALNESS (German-specific):
  - "phishing" → "Phishing" (accepted loanword, capitalize as German noun)
  - "email" → "E-Mail" (standard German spelling with hyphen and capital M)
  - "password" → "Passwort"
  - "security" → "Sicherheit"
  - "training" → "Schulung" (formal) or "Training" (accepted loanword) — pick one consistently
  - "download" → "herunterladen" (NEVER "downloaden" — this is non-standard)
  - "link" → "Link" (accepted loanword, capitalize as noun)
  - CRITICAL: Avoid excessively long compound nouns — break into shorter, natural phrases:
    ❌ "Phishing-E-Mail-Erkennungsschulung" → ✅ "Schulung zur Erkennung von Phishing-E-Mails"
    ❌ "Sicherheitsbewusstseinsübung" → ✅ "Übung zum Sicherheitsbewusstsein"
  - Use "Sie" (formal) — NEVER "du" in professional content.
  - German capitalizes ALL nouns — ensure correct capitalization of translated terms.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Maintain formal corporate tone (Sie-Form), polite but not stiff.
`.trim(),

  it: `
### 🇮🇹 Italian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "bravo!", "stai attento!", "fai attenzione!", "sta' in guardia!"
  - FORBIDDEN: "ben fatto!", "complimenti!", "bene!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Controlla", "Verifica attentamente", "Esamina prima", "Assicurati di verificare"
For praise/completion: "Felicitazioni", "Eccellente", "Formazione completata con successo"

📝 TERMINOLOGY & NATURALNESS (Italian-specific):
  - "phishing" → "phishing" (accepted loanword in Italian IT)
  - "email" → "e-mail" or "posta elettronica" (pick one consistently; "e-mail" is more common in IT)
  - "password" → "password" (accepted loanword) or "parola d'accesso" (native alternative)
  - "security" → "sicurezza"
  - "training" → "formazione"
  - "download" → "scaricare" (verb) / "scaricamento" (noun) — NEVER "downloadare"
  - "link" → "link" (accepted loanword) or "collegamento" (native alternative)
  - Use formal "Lei" form — NEVER informal "tu" in professional content.
  - Avoid pseudo-Italian adaptations of English verbs:
    ❌ "downloadare il file" → ✅ "scaricare il file"
    ❌ "cliccare il link" → ✅ "fare clic sul collegamento" or "cliccare sul link" (accepted)
  - Keep phrasing modern and direct, not bureaucratic.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Warm yet professional; simple, modern phrasing.
`.trim(),

  pt: `
### 🇵🇹 Portuguese Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "cuidado!", "atenção!", "fique atento!", "vigie-se!", "cuidado com"
  - FORBIDDEN: "bom trabalho!", "parabéns!", "bravo!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Verifique", "Examine cuidadosamente", "Confirme antes", "Valide"
For praise/completion: "Parabéns", "Excelente", "Formação concluída com sucesso"

📝 TERMINOLOGY & NATURALNESS (Portuguese-specific):
  - "phishing" → "phishing" (accepted loanword in Portuguese IT)
  - "email" → "e-mail" (standard in both BR and PT)
  - "password" → "senha" (Brazilian Portuguese) / "palavra-passe" (European Portuguese) — choose based on target audience
  - "security" → "segurança"
  - "training" → "treinamento" (BR) / "formação" (PT) — choose based on target audience
  - "download" → "download" (accepted loanword) or "transferência" (native alternative)
  - "link" → "link" (accepted loanword)
  - Note: Distinguish Brazilian vs European Portuguese where relevant. Key differences:
    BR: "senha", "treinamento", "celular", "clicar"
    PT: "palavra-passe", "formação", "telemóvel", "clicar"
  - When target audience is unknown, default to Brazilian Portuguese (larger speaker base).
  - Avoid mixing BR and PT vocabulary in the same content — pick one variant and stay consistent.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Formal yet friendly workplace tone.
`.trim(),

  nl: `
### 🇳🇱 Dutch Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Goed bezig!", "Wees alert!", "Let op!", "Pas op!", "Zorg ervoor"
  - FORBIDDEN: "Goed gedaan!", "Prima!", "Knap werk!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Controleer", "Verifieer zorgvuldig", "Controleer voordat u klikt", "Bevestig"
For praise/completion: "Gefeliciteerd", "Uitstekend", "Training voltooid"

📝 TERMINOLOGY & NATURALNESS (Dutch-specific):
  - "phishing" → "phishing" (accepted loanword in Dutch IT)
  - "email" → "e-mail" (standard Dutch spelling with hyphen)
  - "password" → "wachtwoord"
  - "security" → "beveiliging" (IT security) or "veiligheid" (general safety) — pick based on context
  - "training" → "training" (accepted loanword) or "opleiding" (native, for formal) — pick one consistently
  - "download" → "downloaden" (accepted loanword, standard in Dutch) or "ophalen" (native alternative)
  - "link" → "link" (accepted loanword) or "koppeling" (native alternative)
  - Use formal "u" in professional content — NEVER informal "je"/"jij" unless audience is explicitly casual.
  - Distinguish Netherlands vs Belgian Dutch (Flemish) where relevant:
    NL: "computer", "e-mail", "mobiel"
    BE: "computer", "e-mail", "gsm"
  - Avoid unnecessary anglicisms where natural Dutch exists:
    ❌ "Clicken op de link" → ✅ "Klik op de link"
    ❌ "Saven van het bestand" → ✅ "Het bestand opslaan"
  - Dutch compound nouns are written as one word — ensure correct spelling:
    ❌ "wacht woord" → ✅ "wachtwoord"
    ❌ "e mail" → ✅ "e-mail"

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Neutral, clear, professional phrasing.
`.trim(),

  sv: `
### 🇸🇪 Swedish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Bra jobbat!", "Var försiktig!", "Akta dig!", "Var på din vakt!", "Passa på"
  - FORBIDDEN: "Bra gjort!", "Utmärkt!", "Snyggt!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Kontrollera", "Verifiera noggrant", "Granska innan", "Bekräfta"
For praise/completion: "Grattis", "Utmärkt", "Utbildning slutförd"

📝 NATURALNESS & TERMINOLOGY (Swedish-specific):
  - "phishing" → "nätfiske" (use Swedish term in titles and descriptions)
  - "email" → "e-post" (standard Swedish)
  - "password" → "lösenord"
  - "security" → "säkerhet"
  - "training" → "utbildning"
  - "download" → "ladda ner"
  - "link" → "länk"
  - AVOID heavy compound nouns that sound artificial:
    ❌ "phishing-attackdetektering" → ✅ "upptäckt av nätfiskeattacker"
    ❌ "phishingdetektering" → ✅ "skydd mot nätfiske"
  - AVOID English calques (direct pattern copies):
    ❌ "röda flaggor" (from "red flags") → ✅ "varningssignaler"
    ❌ "Rapportera hotet" (too vague) → ✅ "Rapportera misstänkt e-post" (specific)
  - UI TEXT: Never use "Klicka för att..." — use direct action instead:
    ❌ "Klicka för att starta" → ✅ "Starta utbildningen"
  - Prefer natural Swedish phrase order over English-influenced structure. Titles should be clear and action-oriented, not technical compound chains.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Factual, polite, workplace-appropriate tone.
`.trim(),

  no: `
### 🇳🇴 Norwegian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Bra jobba!", "Vær på vakt!", "Pass på!", "Vær forsiktig!", "Hold øye med"
  - FORBIDDEN: "Bra gjort!", "Flott!", "Bra!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Kontroller", "Verifiser nøye", "Sjekk før", "Bekreft"
For praise/completion: "Gratulerer", "Utmerket", "Opplæring fullført"

📝 TERMINOLOGY & NATURALNESS (Norwegian-specific):
  - "phishing" → "nettfiske" (use Norwegian term, not English)
  - "email" → "e-post" (standard Norwegian)
  - "password" → "passord"
  - "download" → "laste ned"
  - "security" → "sikkerhet"
  - "training" → "opplæring"
  - "link" → "lenke"
  - AVOID long compound words that sound unnatural. Break them into shorter, natural phrases:
    ❌ "Phishing-e-postmeldinger" → ✅ "phishing-e-poster" or "falske e-poster"
    ❌ "Utfør phishing-deteksjon" → ✅ "Oppdag nettfiske"
    ❌ "Phishing-forebyggingsopplæring" → ✅ "Opplæring i nettfiskevern"
  - Write short, clear Norwegian — not German-style compound chains.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  da: `
### 🇩🇰 Danish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Godt klaret!", "Pas på!", "Vær på vagt!", "Husk at være opmærksom!", "Vær forsigtig"
  - FORBIDDEN: "Fint arbejde!", "Flot!", "Godt!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Kontroller", "Verificer omhyggeligt", "Tjek før", "Bekræft"
For praise/completion: "Tillykke", "Udmærket", "Træning afsluttet"

📝 TERMINOLOGY & NATURALNESS (Danish-specific):
  - "phishing" → "phishing" (accepted loanword in Danish IT)
  - "email" → "e-mail" (standard Danish spelling with hyphen)
  - "password" → "adgangskode" (preferred native term)
  - "security" → "sikkerhed"
  - "training" → "uddannelse" (formal) or "træning" (informal/IT context) — pick one consistently per module
  - "download" → "download" (accepted loanword) or "hente" (native alternative) — pick one consistently
  - "link" → "link" (accepted loanword) or "henvisning" (native alternative)
  - Similar to Norwegian/Swedish — avoid heavy compound nouns, prefer natural Danish phrasing:
    ❌ "Phishing-e-mail-genkendelsestræning" → ✅ "Træning i at genkende phishing-e-mails"
    ❌ "Sikkerhedsopmærksomhedsuddannelse" → ✅ "Uddannelse i sikkerhed"
  - Write short, clear Danish — prefer natural phrase structures over long compound chains.
  - Use formal "De"/"Dem" only in very formal contexts; standard professional Danish uses "du"/"dig" but in a respectful tone.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  pl: `
### 🇵🇱 Polish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Uważaj!", "Bądź czujny!", "Strzeż się!", "Miej oczy otwarte!", "Bądź ostrożny"
  - FORBIDDEN: "Dobrze się trzymaj!", "Świetnie!", "Super!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Sprawdzaj", "Weryfikuj uważnie", "Przeanalizuj przed", "Potwierdź"
For praise/completion: "Gratulacje", "Doskonale", "Szkolenie ukończone"

📝 TERMINOLOGY & NATURALNESS (Polish-specific):
  - "phishing" → "phishing" (accepted loanword in Polish IT)
  - "email" → "e-mail" or "wiadomość e-mail" (for full phrase; NEVER "mejl")
  - "password" → "hasło"
  - "security" → "bezpieczeństwo"
  - "training" → "szkolenie"
  - "download" → "pobrać" (verb) / "pobieranie" (noun) — NEVER "downloadować"
  - "link" → "link" (accepted loanword) or "odnośnik" (native alternative)
  - Polish has complex declension — ensure proper case endings when technical terms are used in sentences:
    ❌ "Kliknij na link" → ✅ "Kliknij w link" or "Kliknij odnośnik"
    ❌ "Otwórz email" → ✅ "Otwórz wiadomość e-mail"
  - Maintain grammatical gender agreement with borrowed nouns (e.g., "ten e-mail" is masculine).
  - Keep phrasing natural and professional — avoid overly literal translations from English.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  cs: `
### 🇨🇿 Czech Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Buďte opatrní!", "Pozor!", "Mějte oči otevřené!", "Buďte ostražití!", "Hlídejte si"
  - FORBIDDEN: "Výborně!", "Skvěle!", "Dobré!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Ověřte", "Ověřte pečlivě", "Zkontrolujte před", "Potvrďte"
For praise/completion: "Gratuluji", "Vynikající", "Školení dokončeno"

📝 TERMINOLOGY & NATURALNESS (Czech-specific):
  - "phishing" → "phishing" (accepted loanword in Czech IT)
  - "email" → "e-mail" (standard Czech spelling with hyphen)
  - "password" → "heslo"
  - "security" → "bezpečnost"
  - "training" → "školení"
  - "download" → "stáhnout" (verb) / "stažení" (noun) — NEVER "downloadovat"
  - "link" → "odkaz"
  - Czech has complex declension — ensure proper case endings on all terms:
    ❌ "Otevřte e-mail" (wrong case) → ✅ "Otevřete e-mail"
    ❌ "Klikněte na odkaz" → ✅ "Klikněte na odkaz" (correct, accusative matches nominative here)
  - When adapting loanwords, apply Czech grammatical patterns naturally:
    ❌ "phishing útok" (wrong word order for Czech genitive) → ✅ "phishingový útok" (adjectival form)
  - Keep phrasing natural and professional — avoid overly literal translations from English.
  - Use formal "vy" (vykání) in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ru: `
### 🇷🇺 Russian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Будьте бдительны!", "Молодцы!", "Будьте осторожны!", "Смотрите в оба!", "Помните о"
  - FORBIDDEN: "Отлично!", "Спасибо!", "Хорошо!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Проверьте", "Проверьте внимательно", "Убедитесь перед", "Подтвердите"
For praise/completion: "Поздравляем", "Превосходно", "Обучение завершено"

📝 TERMINOLOGY & NATURALNESS (Russian-specific):
  - "phishing" → "фишинг" (accepted loanword, widely used in Russian IT)
  - "email" → "электронная почта" (formal) or "письмо" (for individual message) — NEVER "емейл" or "имейл"
  - "password" → "пароль"
  - "security" → "безопасность"
  - "training" → "обучение"
  - "download" → "скачать" or "загрузить" (pick one consistently)
  - "link" → "ссылка"
  - Avoid overly formal bureaucratic tone — use natural professional Russian as spoken in modern IT workplaces:
    ❌ "Данное учебное пособие направлено на повышение осведомлённости" (bureaucratic) → ✅ "Это обучение поможет вам распознавать фишинг" (natural)
  - Use "вы" (formal) consistently in professional content.
  - Ensure correct Russian case declensions for loanwords (e.g., "о фишинге" in prepositional case).

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Calm, professional, respectful.
`.trim(),

  ar: `
### Arabic Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "انتبه!", "احذر!", "كن حذراً!", "راقب نفسك!", "تذكر أن تكون آمناً"
  - FORBIDDEN: "ممتاز!", "برافو!", "أحسنت!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "يرجى التحقق", "تحقق بعناية", "أكد قبل النقر", "اختبر"
For praise/completion: "تهانينا", "ممتاز", "اكتمل التدريب بنجاح"

📝 NATURALNESS & TERMINOLOGY (Arabic-specific):
  - Use simplified Modern Standard Arabic (MSA) — professional but NOT academic/literary. Write as a modern Arab IT professional would in a corporate email, not as a newspaper editorial.
  - "phishing" → "التصيد الاحتيالي" (standard) or "تصيد" (shorter, for titles)
  - "email" → "بريد إلكتروني" (NEVER "إيميل")
  - "password" → "كلمة المرور"
  - "security" → "أمان" or "حماية" (pick one per module)
  - "training" → "تدريب"
  - "download" → "تحميل" (noun) / "حمّل" (imperative) — NEVER "داونلود"
  - "link" → "رابط"
  - SIMPLIFY verbose phrases — Arabic tends toward long formal constructions. Prefer shorter, clearer alternatives:
    ❌ "تطبيق كشف التصيد الاحتيالي" (heavy) → ✅ "اكتشاف التصيد" (direct)
    ❌ "رسائل البريد الإلكتروني التصيدية" (long) → ✅ "رسائل التصيد" (natural shorthand)
    ❌ "حدد البريد الإلكتروني المشبوه" (literal) → ✅ "تعرّف على الرسائل المشبوهة" (more natural)
  - Keep RTL text flow natural. Do not insert LTR fragments mid-sentence.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Use neutral, professional Modern Standard Arabic (no dialects).
`.trim(),

  fa: `
### 🇮🇷 Persian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "مواظب باش!", "آفرین!", "هوشیار باشید!", "دقت کنید!", "مراقب باشید"
  - FORBIDDEN: "عالی!", "درست است!", "بسیار خوب!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "لطفاً بررسی کنید", "بدقت تأیید کنید", "قبل از کلیک تصدیق کنید", "تحقق"
For praise/completion: "تبریک می‌گوییم", "عالی", "آموزش با موفقیت اتمام یافت"

📝 TERMINOLOGY & NATURALNESS (Persian-specific):
  - "phishing" → "فیشینگ" (standard Persian transliteration)
  - "email" → "ایمیل" (widely accepted) or "رایانامه" (formal/official Farsi Academy term) — pick one consistently
  - "password" → "رمز عبور" (NEVER "پسورد")
  - "security" → "امنیت"
  - "training" → "آموزش"
  - "download" → "دانلود" (accepted loanword) or "بارگیری" (formal native term) — pick one consistently
  - "link" → "لینک" (accepted loanword) or "پیوند" (native term)
  - CRITICAL: RTL text — never mix LTR fragments mid-sentence. English terms like "URL" or "IP" should be isolated properly.
  - Use formal "شما" in professional content — NEVER informal "تو".
  - Persian uses zero-width non-joiner (ZWNJ) between compound words — ensure proper usage:
    ❌ "می گوییم" → ✅ "می‌گوییم" (with ZWNJ)
    ❌ "نمیتوانید" → ✅ "نمی‌توانید" (with ZWNJ)
  - Avoid Arabic-heavy vocabulary when simpler Persian alternatives exist:
    ❌ "مراقبت نمایید" (overly formal/Arabic) → ✅ "مراقب باشید" (natural Persian)
  - Keep phrasing natural and modern — avoid overly formal or literary Persian.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  hi: `
### 🇮🇳 Hindi Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "शाबाश", "सावधान रहें", "होशियार रहो", "ध्यान दो", "सतर्क रहें"
  - FORBIDDEN: "बहुत अच्छा", "शानदार", "वाह!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "कृपया जांचें", "सावधानी से सत्यापित करें", "क्लिक करने से पहले कन्फर्म करें", "पुष्टि करें"
For praise/completion: "बधाई हो", "उत्कृष्ट", "प्रशिक्षण सफलतापूर्वक पूर्ण"

📝 TERMINOLOGY STANDARDIZATION (Hindi-specific):
  - "email" → "ई-मेल" (ALWAYS hyphenated, NEVER "ईमेल", "ई-ल", or "ईमेंल")
  - "password" → "पासवर्ड"
  - "phishing" → "फ़िशिंग"
  - "link" → "लिंक"
  - "download" → "डाउनलोड"
  - "security" → "सुरक्षा"
  - "training" → "प्रशिक्षण"
  - "login" → "लॉगिन"
  RULE: Pick ONE spelling per term and use it identically in EVERY screen/scene. Inconsistent spelling across screens is a critical UX failure.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Polite, modern, workplace-professional.
`.trim(),

  zh: `
### 🇨🇳 Chinese (Simplified) Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "注意安全!", "保持警惕!", "小心!", "注意!", "要小心"
  - FORBIDDEN: "太棒了!", "很好!", "对！"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "请确认", "仔细验证", "点击前确认", "验证"
For praise/completion: "恭喜您", "非常好", "培训已成功完成"

📝 TERMINOLOGY & NATURALNESS (Chinese Simplified-specific):
  - "phishing" → "钓鱼攻击" or "网络钓鱼" (use Chinese term, NEVER English "phishing" in Chinese text)
  - "email" → "电子邮件" (formal) or "邮件" (shorter, preferred in UI)
  - "password" → "密码"
  - "security" → "安全"
  - "training" → "培训"
  - "download" → "下载"
  - "link" → "链接"
  - Keep sentences short and direct — Chinese UI text should be concise (2-4 characters per action label):
    ❌ "请点击此处以下载文件" (verbose) → ✅ "下载文件"
    ❌ "网络钓鱼安全意识培训课程" (too long) → ✅ "钓鱼防护培训"
  - Use simplified characters ONLY — NEVER use traditional characters (繁体字).
  - Avoid overly formal or literary Chinese; use modern professional tone.
  - Numbers and punctuation: Use Chinese punctuation marks (。，！？) not English ones.

🏢 CHINA MARKET TERMINOLOGY:
  - "CEO fraud / BEC" → "商业邮件欺诈" or "CEO欺诈"
  - "wire transfer fraud" → "电汇欺诈"
  - "social engineering" → "社会工程学"
  - "ransomware" → "勒索软件"
  - "data breach" → "数据泄露"
  - "compliance" → "合规"
  - "incident response" → "事件响应"
  - Reference Chinese regulations where relevant: 《网络安全法》(Cybersecurity Law)、《个人信息保护法》(PIPL)、《数据安全法》(Data Security Law)

🛡️ ENGLISH LOANWORD RULES (Chinese-specific):
  Accepted English terms (keep as-is): VPN, Wi-Fi, MFA, CEO, IT, IP, URL, HTTPS, DNS, API
  MUST translate to Chinese (NEVER keep English):
  | English | Chinese |
  | password | 密码 |
  | download | 下载 |
  | security | 安全 |
  | training | 培训 |
  | email | 邮件/电子邮件 |
  | link | 链接 |
  | click | 点击 |
  | login | 登录 |
  | report | 举报/报告 |
  | account | 账户 |
  If unsure whether an English term should stay, translate it to Chinese.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Concise, polite, business tone (no exclamation stacking).
`.trim(),

  ja: `
### 🇯🇵 Japanese Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "よくできました!", "気をつけて!", "注意して!", "警戒してください!", "気を付けろ"
  - FORBIDDEN: "素晴らしい!", "いいね!", "完璧です!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "確認してください", "慎重に検証してください", "クリック前に確認してください", "検証する"
For praise/completion: "おめでとうございます", "素晴らしい", "トレーニングが完了しました"

📝 TERMINOLOGY & NATURALNESS (Japanese-specific):
  - "phishing" → "フィッシング" (katakana, standard IT term)
  - "email" → "メール" (common) or "電子メール" (formal) — pick one consistently
  - "password" → "パスワード" (katakana, standard)
  - "security" → "セキュリティ" (katakana, standard IT term)
  - "training" → "トレーニング" (katakana) or "研修" (native Japanese) — pick one consistently
  - "download" → "ダウンロード" (katakana, standard)
  - "link" → "リンク" (katakana, standard)
  - Use polite form (です/ます体) consistently — NEVER casual form (だ/である) in professional content.
  - Prefer katakana for established IT loanwords — do not over-translate into kanji when katakana is standard:
    ❌ "電子通信詐欺" → ✅ "フィッシング"
  - Keep sentences short and clear — avoid long nested clauses:
    ❌ "セキュリティに関するトレーニングを完了していただくことが重要です" → ✅ "セキュリティ研修を完了してください"
  - Use appropriate particles and honorific language for workplace context.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Polite workplace style (です・ます調), no casual tone.
`.trim(),

  ko: `
### 🇰🇷 Korean Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "잘했어요!", "조심하세요!", "조심해!", "주의하세요!", "경계하세요"
  - FORBIDDEN: "대단해!", "멋있어!", "훌륭해!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "확인해주세요", "주의깊게 확인해주세요", "클릭 전에 확인하세요", "검증하세요"
For praise/completion: "축하합니다", "훌륭합니다", "교육이 완료되었습니다"

📝 TERMINOLOGY & NATURALNESS (Korean-specific):
  - "phishing" → "피싱" (standard Korean IT term)
  - "email" → "이메일" (standard)
  - "password" → "비밀번호" (native Korean term, preferred over "패스워드")
  - "security" → "보안" (native Korean term)
  - "training" → "교육" or "훈련" (pick one consistently; "교육" is more common in corporate context)
  - "download" → "다운로드" (accepted loanword)
  - "link" → "링크" (accepted loanword)
  - Use formal polite speech level (합니다체/하십시오체) — NEVER casual speech (해요체 or 해체) in professional content.
  - Prefer Korean-origin terms where natural over English loanwords:
    ❌ "패스워드를 체인지하세요" → ✅ "비밀번호를 변경하세요"
    ❌ "시큐리티 트레이닝" → ✅ "보안 교육"
  - Maintain proper spacing (띄어쓰기) — Korean words must be correctly spaced per Korean orthography rules.
  - Use Korean particles correctly (은/는, 이/가, 을/를, etc.).

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Professional, adult, polite.
`.trim(),

  th: `
### 🇹🇭 Thai Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "เก่งมาก!", "ระวังนะ!", "ระวัง!", "ระวังด้วย!", "จำไว้ว่า"
  - FORBIDDEN: "ยอดเยี่ยม!", "ชอบมาก!", "ดีมาก!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "กรุณาตรวจสอบ", "ตรวจสอบอย่างระมัดระวัง", "ยืนยันก่อนคลิก", "ยืนยัน"
For praise/completion: "ขอแสดงความยินดี", "ยอดเยี่ยม", "การฝึกอบรมเสร็จสิ้น"

📝 TERMINOLOGY & NATURALNESS (Thai-specific):
  - "phishing" → "ฟิชชิง" (standard Thai transliteration)
  - "email" → "อีเมล" (standard Thai transliteration)
  - "password" → "รหัสผ่าน"
  - "security" → "ความปลอดภัย"
  - "training" → "การฝึกอบรม"
  - "download" → "ดาวน์โหลด" (standard Thai transliteration)
  - "link" → "ลิงก์" (standard Thai transliteration)
  - Use polite particles (ครับ/ค่ะ) in instructional content to maintain professional courtesy.
  - Thai has no spaces between words — ensure proper word segmentation. Spaces are used between sentences/clauses, NOT between words.
  - CRITICAL: Ensure correct Thai vowel and tone mark placement — incorrect placement changes meaning entirely.
  - Avoid mixing Thai script with English words mid-sentence where Thai transliterations exist:
    ❌ "กรุณา download ไฟล์" → ✅ "กรุณาดาวน์โหลดไฟล์"
  - Use formal register (ภาษาทางการ) for professional content — avoid casual/slang terms.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Polite, corporate, natural.
`.trim(),

  vi: `
### 🇻🇳 Vietnamese Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Tốt lắm!", "Hãy cẩn thận!", "Cẩn thận!", "Chú ý!", "Cảnh báo"
  - FORBIDDEN: "Tuyệt vời!", "Rất tốt!", "Tốt!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Vui lòng kiểm tra", "Xác minh cẩn thận", "Xác nhận trước khi nhấp", "Xác minh"
For praise/completion: "Chúc mừng", "Tuyệt vời", "Khóa đào tạo hoàn thành"

📝 TERMINOLOGY STANDARDIZATION (Vietnamese-specific):
  Accepted loanwords (keep as-is, widely used in Vietnamese IT):
  - "email" → OK (but "thư điện tử" also acceptable if full localization is preferred)
  - "phishing" → OK (no widely-used Vietnamese equivalent)
  Use Vietnamese terms for (NEVER English loanwords):
  - "password" → "mật khẩu" (NEVER "password")
  - "download" → "tải xuống" (NEVER "download")
  - "login" → "đăng nhập" (NEVER "login")
  - "security" → "bảo mật" (NEVER "security")
  - "training" → "đào tạo" (NEVER "training")
  - "link" → "liên kết" (NEVER "link")
  - "click" → "nhấp" or "bấm" (NEVER "click")
  RULE: Use the Vietnamese term wherever one exists and is natural. Only keep English loanwords when the Vietnamese equivalent would sound forced or unfamiliar to IT professionals.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Polite workplace tone.
`.trim(),

  uk: `
### 🇺🇦 Ukrainian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Будьте обережні!", "Стережіться!", "Уважайте!", "Тримайте вухо востро!", "Обережно!"
  - FORBIDDEN: "Браво!", "Молодці!", "Чудово!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Будь ласка, перевірте", "Ретельно переконайтесь", "Перевірте перед кліком", "Підтвердьте"
For praise/completion: "Вітаємо", "Відмінно", "Навчання завершено"

📝 TERMINOLOGY & NATURALNESS (Ukrainian-specific):
  - "phishing" → "фішинг" (standard Ukrainian transliteration)
  - "email" → "електронна пошта" (formal) or "імейл" (informal/IT context) — pick one consistently per module
  - "password" → "пароль"
  - "security" → "безпека"
  - "training" → "навчання"
  - "download" → "завантажити" (verb) / "завантаження" (noun)
  - "link" → "посилання"
  - CRITICAL: Avoid Russian-influenced terms — use proper Ukrainian vocabulary (not surzhyk):
    ❌ "безопасність" (Russian influence) → ✅ "безпека" (correct Ukrainian)
    ❌ "скачати" (Russian calque) → ✅ "завантажити" (correct Ukrainian)
    ❌ "ссилка" (Russian) → ✅ "посилання" (correct Ukrainian)
  - Use Ukrainian letter "і" (not Russian "и") and "ї" where appropriate.
  - Use formal "ви" (з великої літери "Ви" in direct address) in professional content.
  - Keep phrasing natural and modern Ukrainian — avoid overly formal or bureaucratic Soviet-era constructions.

🛡️ CONTAMINATION SHIELD (Ukrainian is commonly confused with Russian):
  | Wrong (Russian) | Correct Ukrainian |
  | безопасность | безпека |
  | скачать | завантажити |
  | ссылка | посилання |
  | пароль | пароль (same — OK) |
  | нажмите | натисніть |
  | проверьте | перевірте |
  | обучение | навчання |
  | пожалуйста | будь ласка |
  | сообщите | повідомте |
  | электронная почта | електронна пошта |

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  el: `
### 🇬🇷 Greek Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Προσοχή!", "Πρόσεχε!", "Να είσαι προσεκτικός!", "Μην ξεχάσεις!", "Φύλαξε το"
  - FORBIDDEN: "Μπράβο!", "Πολύ καλά!", "Ωραία!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Παρακαλώ επαληθεύστε", "Ελέγξτε προσεκτικά", "Επιβεβαιώστε πριν κάνετε κλικ", "Δείξτε"
For praise/completion: "Συγχαρητήρια", "Εξαιρετικά", "Η εκπαίδευση ολοκληρώθηκε"

📝 TERMINOLOGY & NATURALNESS (Greek-specific):
  ALL titles and content MUST be fully in Greek — NEVER mix English words in Greek text:
  - "phishing" → "ηλεκτρονικό ψάρεμα" or "phishing" (if kept, use lowercase and NEVER mix with Greek in same phrase)
    ❌ "Σταματήστε το Phishing" → ✅ "Σταματήστε το ηλεκτρονικό ψάρεμα"
    ❌ "Phishing Επίθεσης" → ✅ "Επίθεση ηλεκτρονικού ψαρέματος" (correct Greek genitive order)
  - "email" → "ηλεκτρονικό μήνυμα" or "email" (pick ONE, use consistently)
  - "password" → "κωδικός πρόσβασης"
  - "security" → "ασφάλεια"
  - "training" → "εκπαίδευση"
  - "download" → "λήψη"
  - "link" → "σύνδεσμος"
  WORD ORDER: Greek has different noun-adjective order than English. Always use natural Greek order:
    ❌ "Phishing Επίθεσης" (English order) → ✅ "Επίθεση ηλεκτρονικού ψαρέματος" (Greek order)
  TONE: Keep professional but conversational — avoid overly formal/bureaucratic phrasing:
    ❌ "Αυτή η εκπαίδευση θα σας βοηθήσει στα εξής" (heavy) → ✅ "Σε αυτή την εκπαίδευση θα μάθετε:" (direct)

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ro: `
### 🇷🇴 Romanian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Atenție!", "Fii atent!", "Aveți grijă!", "Rămâi vigilent!", "Caut"
  - FORBIDDEN: "Bravo!", "Foarte bine!", "Excelent!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Vă rugăm să verificați", "Verificați cu atenție", "Confirmați înainte de a face clic", "Validați"
For praise/completion: "Felicitări", "Excelent", "Antrenamentul completat"

📝 TERMINOLOGY & NATURALNESS (Romanian-specific):
  - "phishing" → "phishing" (accepted loanword in Romanian IT)
  - "email" → "e-mail" (standard Romanian spelling with hyphen)
  - "password" → "parolă"
  - "security" → "securitate"
  - "training" → "instruire" (formal) or "formare" (alternative) — pick one consistently per module
  - "download" → "descărcare" (noun) / "a descărca" (verb) — NEVER "download" as Romanian word
  - "link" → "link" (accepted loanword) or "legătură" (native alternative)
  - CRITICAL: Use diacritics correctly (ă, â, î, ș, ț) — missing diacritics is a quality failure:
    ❌ "securitate", "invatare" → ✅ "securitate", "învățare"
    ❌ "descarcare" → ✅ "descărcare"
    ❌ "stiinta" → ✅ "știință"
  - Note: ș (s-comma) and ț (t-comma) are correct — NOT ş (s-cedilla) or ţ (t-cedilla). Use Unicode U+0219/U+021B.
  - Use formal "dumneavoastră" in professional content.
  - Avoid literal English calques — rephrase naturally for Romanian:
    ❌ "Faceți clic pentru a descărca" → ✅ "Descărcați fișierul"

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  hu: `
### 🇭🇺 Hungarian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Figyelem!", "Légy óvatos!", "Vigyázz!", "Maradj résen!", "Óvakodj"
  - FORBIDDEN: "Bravo!", "Nagyon jó!", "Kitűnő!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Kérjük, ellenőrizze", "Ellenőrizze figyelmesen", "Erősítse meg a kattintás előtt", "Igazoljon"
For praise/completion: "Gratulálunk", "Kitűnő", "A képzés befejeződött"

📝 TERMINOLOGY & NATURALNESS (Hungarian-specific):
  - "phishing" → "adathalászat" (preferred native term) or "phishing" (accepted loanword in IT contexts)
  - "email" → "e-mail" (standard Hungarian spelling with hyphen)
  - "password" → "jelszó"
  - "security" → "biztonság"
  - "training" → "képzés"
  - "download" → "letöltés" (noun) / "letölteni" (verb)
  - "link" → "hivatkozás" (native) or "link" (accepted loanword) — pick one consistently per module
  - Hungarian is agglutinative — suffixes change words significantly. Ensure proper suffix usage:
    ❌ "e-mail-ek" (incorrect plural) → ✅ "e-mailek" (correct agglutinated plural)
    ❌ "Kattintson a linkre" → ✅ "Kattintson a hivatkozásra" (native term with correct suffix)
  - CRITICAL: Hungarian word order is flexible but topic-focus structure matters. Place the most important information in focus position (before the verb):
    ❌ "Kattintson a gombra a letöltéshez" (English calque) → ✅ "A letöltéshez kattintson a gombra" (focus on purpose)
  - Use formal "Ön" form in professional content.
  - Keep phrasing natural — avoid literal translations that sound robotic in Hungarian.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  sk: `
### 🇸🇰 Slovak Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Pozor!", "Buď opatrný!", "Majte sa na pozore!", "Buďte ostražití!", "Dávajte si"
  - FORBIDDEN: "Bravo!", "Veľmi dobre!", "Výborně!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Prosím, skontrolujte", "Starostlivo skontrolujte", "Potvrďte pred kliknutím", "Overte"
For praise/completion: "Gratulujem", "Výborné", "Školenie dokončené"

📝 TERMINOLOGY & NATURALNESS (Slovak-specific):
  - "phishing" → "phishing" (accepted loanword in Slovak IT)
  - "email" → "e-mail" (standard Slovak spelling with hyphen)
  - "password" → "heslo"
  - "security" → "bezpečnosť"
  - "training" → "školenie"
  - "download" → "stiahnuť" (verb) / "stiahnutie" (noun) — NEVER "downloadovať"
  - "link" → "odkaz"
  - CRITICAL: Slovak is similar to Czech but distinct — NEVER substitute Czech terms for Slovak:
    ❌ "stáhnout" (Czech) → ✅ "stiahnuť" (Slovak)
    ❌ "bezpečnost" (Czech) → ✅ "bezpečnosť" (Slovak)
    ❌ "školení" (Czech) → ✅ "školenie" (Slovak)
  - Slovak has complex declension — ensure proper case endings on all terms in sentences.
  - When adapting loanwords, apply Slovak grammatical patterns naturally:
    ❌ "phishing útok" → ✅ "phishingový útok" (adjectival form)
  - Use formal "vy" (vykanie) in professional content.

🛡️ CONTAMINATION SHIELD (Slovak is commonly confused with Czech):
  | Wrong (Czech) | Correct Slovak |
  | stáhnout | stiahnuť |
  | bezpečnost | bezpečnosť |
  | školení | školenie |
  | heslo | heslo (same — OK) |
  | odkaz | odkaz (same — OK) |
  | otevřete | otvorte |
  | klikněte | kliknite |
  | výborně | výborne |
  | počítač | počítač (same — OK) |
  | uložit | uložiť |

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  id: `
### 🇮🇩 Indonesian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Hati-hati!", "Berhati-hatilah!", "Awas!", "Waspada!", "Jangan lupa"
  - FORBIDDEN: "Bravo!", "Sangat bagus!", "Sempurna!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Silakan periksa", "Periksa dengan hati-hati", "Konfirmasi sebelum mengklik", "Validasi"
For praise/completion: "Selamat", "Luar biasa", "Pelatihan selesai"

📝 TERMINOLOGY STANDARDIZATION (Indonesian-specific):
  Use Indonesian terms for (NEVER leave English):
  - "email" → "email" or "surel" (both accepted, pick ONE and be consistent)
  - "Email phishing" → "Surel phishing" or "Phishing melalui email" (NEVER half-English "Email phishing")
  - "phishing" → "phishing" OK (accepted loanword in Indonesian IT)
  - "password" → "kata sandi" (NEVER "password")
  - "download" → "unduh" (NEVER "download")
  - "login" → "masuk" (NEVER "login")
  - "security" → "keamanan" (NEVER "security")
  - "training" → "pelatihan" (NEVER "training")
  - "link" → "tautan" (NEVER "link")
  - "click" → "klik" (accepted loanword)
  RULE: When combining English loanwords with Indonesian, always use natural Indonesian grammar. "Email phishing" is wrong — use "phishing melalui email" or "surel phishing". A phrase that is half-English half-Indonesian is a localization failure.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  bn: `
### 🇧🇩 Bengali Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "সাবধান!", "সতর্ক থাকুন!", "সাবধানে থাকুন!", "মনোযোগ দিন!", "খেয়াল রাখুন"
  - FORBIDDEN: "ব্রাভো!", "খুব ভালো!", "দুর্দান্ত!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "অনুগ্রহ করে যাচাই করুন", "সাবধানে যাচাই করুন", "ক্লিক করার আগে নিশ্চিত করুন", "যাচাই"
For praise/completion: "অভিনন্দন", "চমৎকার", "প্রশিক্ষণ সম্পন্ন"

📝 TERMINOLOGY & NATURALNESS (Bengali-specific):
  - "phishing" → "ফিশিং" (standard Bengali transliteration)
  - "email" → "ইমেইল" or "ই-মেইল" (pick one consistently; "ই-মেইল" is more formal)
  - "password" → "পাসওয়ার্ড" (accepted transliteration)
  - "security" → "নিরাপত্তা"
  - "training" → "প্রশিক্ষণ"
  - "download" → "ডাউনলোড" (accepted transliteration)
  - "link" → "লিঙ্ক" (accepted transliteration)
  - Use standard Bangla (Bangladesh/West Bengal neutral) — avoid regional dialectal forms.
  - Avoid overly formal sadhu bhasha (সাধু ভাষা) — use modern cholito bhasha (চলিত ভাষা) for natural, professional tone:
    ❌ "ইহা একটি প্রশিক্ষণ" (sadhu) → ✅ "এটি একটি প্রশিক্ষণ" (cholito)
  - Ensure proper conjunct consonants (যুক্তবর্ণ) are rendered correctly.
  - Keep phrasing direct and professional — avoid literary or poetic constructions in IT content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ur: `
### 🇵🇰 Urdu Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "احتیاط!", "احتیاط سے!", "خطرے سے بچیں!", "تنبیہ!", "فوری توجہ"
  - FORBIDDEN: "شاباش!", "بہت اچھا!", "بہترین!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "براہ کرم تصدیق کریں", "احتیاط سے تصدیق کریں", "کلک سے پہلے تصدیق کریں", "توثیق"
For praise/completion: "مبارک ہو", "شاندار", "تربیت مکمل"

📝 TERMINOLOGY & NATURALNESS (Urdu-specific):
  - "phishing" → "فشنگ" (Urdu transliteration)
  - "email" → "ای میل" (standard Urdu transliteration)
  - "password" → "پاس ورڈ" (accepted transliteration)
  - "security" → "سیکیورٹی" (IT context) or "حفاظت" (native term) — pick one consistently per module
  - "training" → "تربیت"
  - "download" → "ڈاؤن لوڈ" (accepted transliteration)
  - "link" → "لنک" (accepted transliteration)
  - CRITICAL: RTL text — never mix LTR fragments mid-sentence. If English terms must appear, isolate them properly.
  - Use formal Urdu, not Hindi-Urdu mix (Hindustani):
    ❌ "सिक्योरिटी/سکیورٹی" mixing → ✅ "حفاظت" or "سیکیورٹی" (pure Urdu)
  - Prefer Urdu-origin or Arabic/Persian-origin vocabulary over Hindi-influenced terms where both exist.
  - Maintain proper Nastaliq script conventions where possible.
  - Use formal register and respectful tone — "آپ" (aap) for "you" in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  he: `
### 🇮🇱 Hebrew Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "זהירות!", "היזהר!", "תיזהר!", "עמוד בתיקבה!", "הזהרה"
  - FORBIDDEN: "ברavo!", "מעולה!", "מדהים!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "אנא אמת", "אמת בעדינות", "אמת לפני הלחיצה", "אמת"
For praise/completion: "ברכות", "מעולה", "ההכשרה הושלמה"

📝 TERMINOLOGY & NATURALNESS (Hebrew-specific):
  - "phishing" → "פישינג" (standard Hebrew transliteration)
  - "email" → "דוא״ל" (formal, abbreviation of דואר אלקטרוני) or "אימייל" (informal/IT context) — pick one consistently per module
  - "password" → "סיסמה"
  - "security" → "אבטחה"
  - "training" → "הדרכה"
  - "download" → "הורדה" (noun) / "להוריד" (verb)
  - "link" → "קישור"
  - CRITICAL: RTL text — never mix LTR fragments mid-sentence. If English terms must appear, use proper Unicode bidirectional controls.
  - Use gender-neutral phrasing where possible. When addressing the user directly, prefer plural or imperative forms that avoid gendered endings:
    ❌ "אתה מוזמן" (masculine only) → ✅ "הנכם מוזמנים" (plural neutral) or imperative form
  - Use Modern Hebrew (עברית מודרנית), not biblical or liturgical Hebrew.
  - Keep professional tone — avoid overly casual or slang terms common in spoken Hebrew:
    ❌ "תלחץ על הלינק" (casual) → ✅ "לחצו על הקישור" (professional plural imperative)

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  sw: `
### 🇹🇿 Swahili Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Onyo!", "Kuwa na tahadhari!", "Nenda nyuma!", "Jitambue!", "Karibu na hatari"
  - FORBIDDEN: "Bravo!", "Vyema sana!", "Nzuri!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Tafadhali thibitisha", "Thibitisha kwa haraka", "Thibitisha kabla ya kubofya", "Thibitisha"
For praise/completion: "Karibu", "Safi", "Mafunzo yamekamilika"

📝 TERMINOLOGY & NATURALNESS (Swahili-specific):
  - "phishing" → "udanganyifu wa mtandaoni" (descriptive native term) or "phishing" (accepted loanword in IT contexts)
  - "email" → "barua pepe" (standard Swahili term — ALWAYS use this, NEVER "email")
  - "password" → "nenosiri" (NEVER "password")
  - "security" → "usalama" (NEVER "security")
  - "training" → "mafunzo" (NEVER "training")
  - "download" → "pakua" (verb) / "upakuaji" (noun) — NEVER "download"
  - "link" → "kiungo" (NEVER "link")
  - Use standard Swahili (Kiswahili sanifu) — not regional dialects (Kiunguja, Kimvita, etc.).
  - CRITICAL: NEVER let source language words leak through — Swahili is a common target for contamination. Every technical term must be translated:
    ❌ "Bofya link ili ku-download file" → ✅ "Bofya kiungo ili kupakua faili"
    ❌ "Security training" → ✅ "Mafunzo ya usalama"
  - Use Swahili noun class agreements correctly — verbs, adjectives, and pronouns must agree with the noun class.
  - Keep professional, clear tone appropriate for East African corporate context.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ku: `
### 🇹🇷 Kurdish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Ava!", "Mezinbîn!", "Mîna!", "Ewledarî!", "Heşdarî"
  - FORBIDDEN: "Bravo!", "Pir baş!", "Guzerat!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Kerema kontrolê bikin", "Kontrolê bi baldarî bikin", "Berî bitikînê pestqinê bikin", "Pestkirin"
For praise/completion: "Piraz", "Gelek baş", "Hûnîndinê qediya bû"

📝 TERMINOLOGY & NATURALNESS (Kurdish-specific):
  - "phishing" → "phishing" (accepted loanword) or "fîşîng" (Kurmanji transliteration)
  - "email" → "e-peyam" (native term) or "îmêl" (transliteration) — pick one consistently per module
  - "password" → "şîfre" (common) or "nasname" (alternative) — pick one consistently
  - "security" → "ewlehî" (general security) or "asayîş" (safety/order) — pick based on context
  - "training" → "perwerde" (education/training) or "rahênan" (practice/drill) — pick one consistently
  - "download" → "daxistin" (verb/noun)
  - "link" → "girêdan" (native term) or "lînk" (accepted loanword) — pick one consistently
  - Use Kurmanji (Northern Kurdish) as default dialect. ALWAYS use Latin script (not Arabic script).
  - Kurmanji has grammatical gender (masculine/feminine) and case system — ensure correct agreement:
    ❌ "e-peyama nû" (wrong gender agreement) → ensure noun-adjective gender match
  - Kurdish uses circumflex accents (î, û, ê) — never omit these, as they distinguish different sounds and meanings.
  - Keep phrasing natural and professional — avoid overly literary or archaic Kurdish.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  hr: `
### 🇭🇷 Croatian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Oprez!", "Budi oprezan!", "Čuvaj se!", "Ostani bdjagen!", "Paziti"
  - FORBIDDEN: "Bravo!", "Odličan!", "Fenomenalno!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Molim provjerite", "Provjerite pažljivo", "Potvrdi prije klikanja", "Potvrdi"
For praise/completion: "Čestitam", "Odličan", "Obuka je završena"

📝 TERMINOLOGY & NATURALNESS (Croatian-specific):
  - "phishing" → "phishing" (accepted loanword) or "krađa identiteta" (descriptive native term for identity theft context)
  - "email" → "e-pošta" (preferred native term) or "e-mail" (accepted loanword) — pick one consistently per module
  - "password" → "lozinka"
  - "security" → "sigurnost"
  - "training" → "obuka" (formal) or "trening" (informal/IT context) — pick one consistently
  - "download" → "preuzimanje" (noun) / "preuzeti" (verb) — NEVER "downloadati"
  - "link" → "poveznica" (preferred native term)
  - Use ijekavian Croatian (NOT Serbian ekavian):
    ❌ "bezbednost" (Serbian ekavian) → ✅ "sigurnost" (Croatian)
    ❌ "preuzimanje" is shared — but watch for "безбедност" → ✅ "sigurnost"
  - Proper case declension is required — Croatian has 7 grammatical cases:
    ❌ "Kliknite na poveznica" (wrong case) → ✅ "Kliknite na poveznicu" (accusative)
  - Keep phrasing natural and professional — avoid literal English calques.

🛡️ CONTAMINATION SHIELD (Croatian is commonly confused with Serbian):
  | Wrong (Serbian) | Correct Croatian |
  | bezbednost | sigurnost |
  | obuka | obuka (same — OK) or izobrazba |
  | lozinka | lozinka (same — OK) |
  | preuzimanje | preuzimanje (same — OK) |
  | veza | poveznica |
  | prijavite | prijavite (same — OK) |
  | tačno | točno |
  | greška | greška (same — OK) or pogreška |
  | nalog | račun |
  | podešavanja | postavke |

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  sr: `
### 🇷🇸 Serbian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Опрез!", "Будите опрезни!", "Чувајте се!", "Останите бдели!", "Пазите"
  - FORBIDDEN: "Браво!", "Одличан!", "Одлично!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Молим проверите", "Пажљиво проверите", "Потврдите пре клика", "Потврди"
For praise/completion: "Честитам", "Одличан", "Обука је завршена"

📝 TERMINOLOGY & NATURALNESS (Serbian-specific):
  - "phishing" → "фишинг" (Cyrillic) / "phishing" (Latin) — accepted loanword
  - "email" → "имејл" (Cyrillic) / "imejl" (Latin) or "е-пошта"/"e-pošta" — pick one consistently per module
  - "password" → "лозинка" / "lozinka"
  - "security" → "безбедност" / "bezbednost"
  - "training" → "обука" / "obuka"
  - "download" → "преузимање" / "preuzimanje" (noun) / "преузети" / "preuzeti" (verb)
  - "link" → "линк" / "link" (accepted loanword) or "веза" / "veza" (native alternative)
  - Serbian can use both Cyrillic and Latin script — be consistent within a module. Do NOT mix scripts in the same content.
  - Use ekavian Serbian (NOT ijekavian Croatian):
    ❌ "sigurnost" (Croatian ijekavian) → ✅ "безбедност"/"bezbednost" (Serbian ekavian)
  - Proper case declension is required — Serbian has 7 grammatical cases.
  - Keep professional, modern Serbian tone — avoid archaic or overly formal constructions.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  bg: `
### 🇧🇬 Bulgarian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Внимание!", "Будете внимателни!", "Пазете се!", "Останете начеку!", "Обърнете внимание"
  - FORBIDDEN: "Браво!", "Много добре!", "Отлично!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Моля, проверете", "Внимателно проверете", "Потвърдете преди щракване", "Потвърдете"
For praise/completion: "Поздравления", "Отлично", "Обучението е завършено"

📝 TERMINOLOGY & NATURALNESS (Bulgarian-specific):
  - "phishing" → "фишинг" (accepted loanword)
  - "email" → "имейл" (standard Bulgarian)
  - "password" → "парола"
  - "security" → "сигурност" or "безопасност" (pick one consistently)
  - "training" → "обучение"
  - "download" → "изтегляне" (noun) / "изтеглете" (imperative) — NEVER "даунлоуд"
  - "link" → "връзка" or "линк" (accepted loanword) — pick one consistently
  - Bulgarian uses DEFINITE ARTICLES suffixed to nouns (e.g., "проверката" not "проверка" when definite). Never omit articles where Bulgarian grammar requires them — incomplete articles make text sound robotic.
  - Verb conjugation: Always match person/number correctly. "ние поискаме" is WRONG — correct form: "ние поискахме" (past) or "ние искаме" (present).
  - "фишинг осведоменост" is the natural term for "phishing awareness" — NEVER use "съзнанието за фишинг" (literally "consciousness about phishing", unnatural).
  - Write complete, grammatically correct sentences. Every sentence must read as if written by a native Bulgarian professional, not machine-translated.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  mk: `
### 🇲🇰 Macedonian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Внимание!", "Будете внимателни!", "Пазете се!", "Останете бдени!", "Обра внимание"
  - FORBIDDEN: "Браво!", "Многу добро!", "Одлично!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Молиме проверете", "Внимателно проверете", "Потврдите пред клик", "Потврди"
For praise/completion: "Честитаме", "Одлично", "Обука е завршена"

📝 TERMINOLOGY & NATURALNESS (Macedonian-specific):
  - "phishing" → "фишинг" (accepted loanword)
  - "email" → "е-пошта" (standard Macedonian) or "имејл" (informal/IT) — pick one consistently
  - "password" → "лозинка"
  - "security" → "безбедност"
  - "training" → "обука"
  - "download" → "преземање" (noun) / "преземи" (verb) — NEVER "даунлоуд"
  - "link" → "врска" (native) or "линк" (accepted loanword)
  - Macedonian uses definite article suffixes — apply correctly:
    "обуката" (the training), "лозинката" (the password)
  - Use Macedonian Cyrillic — includes letters not in Serbian (ќ, ѓ, ѕ, љ, њ, џ).
  - Keep phrasing natural and professional.

🛡️ CONTAMINATION SHIELD (Macedonian is commonly confused with Serbian, Bulgarian, and Russian):
  NEVER use these — they are NOT Macedonian:
  | Wrong (language) | Correct Macedonian |
  | никада (Serbian) | никогаш |
  | фалшив (Bulgarian) | лажен / лажна |
  | вопрос (Russian) | прашање |
  | робусни (English calque) | силни / цврсти |
  | делете (wrong meaning: "share") | направете (for "do/act") |
  | доделете (wrong meaning: "assign") | донесете (for "make a decision") |
  | креативам (non-word) | создавам / креирам |
  | имплементација (heavy calque) | примена / воведување |
  | ескалирајте (English calque) | пријавете |
  | неодменно (non-standard) | веднаш |
  | изключително (Bulgarian) | исклучително |
  | стопраете (non-standard) | застанете |
  | погодни (wrong meaning: "suitable") | повеќе (for "many/several") |
  If you are uncertain about a Macedonian word, use a simpler common alternative.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  sq: `
### 🇦🇱 Albanian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Kujdes!", "Ki kujdes!", "Ruhu!", "Mbetet vigjilent!", "Ngat përpara"
  - FORBIDDEN: "Bravo!", "Shumë mirë!", "Shkëlqyeshëm!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Ju lutemi verifikoni", "Verifikoni me kujdes", "Konfirmoni para se të klikoni", "Verifikoni"
For praise/completion: "Urime", "Shumë mirë", "Trajnimi ka përfunduar me sukses"

📝 TERMINOLOGY & NATURALNESS (Albanian-specific):
  - "phishing" → "phishing" (accepted loanword) or "mashtrim elektronik" (descriptive native term)
  - "email" → "email" (accepted loanword) or "postë elektronike" (formal native term) — pick one consistently per module
  - "password" → "fjalëkalim"
  - "security" → "siguri"
  - "training" → "trajnim"
  - "download" → "shkarko" (verb) / "shkarkimi" (noun) — NEVER "downloadoj"
  - "link" → "lidhje" (native) or "link" (accepted loanword)
  - Use Standard Albanian (Tosk-based, gjuha standarde) — avoid Gheg dialectal forms:
    ❌ "me shkarku" (Gheg) → ✅ "të shkarkosh" / "shkarko" (standard)
  - Albanian has definite/indefinite noun forms — use them correctly:
    ❌ "Klikoni mbi link" → ✅ "Klikoni mbi lidhjen" (definite form with correct case)
  - Keep phrasing natural and professional — avoid overly literal translations from English.
  - Use formal "ju"/"Ju" in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  is: `
### 🇮🇸 Icelandic Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Varúð!", "Vertu varkár!", "Passaðu þig!", "Farðu á varðið!", "Gættu þín"
  - FORBIDDEN: "Bravo!", "Mjög gott!", "Frábæra!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Vertu sannarlega að sannreyna", "Sannreyna vandlega", "Staðfestu fyrir kliki", "Sannreyna"
For praise/completion: "Til hamingju", "Frábæra", "Þjálfun lokið"

📝 TERMINOLOGY & NATURALNESS (Icelandic-specific):
  - "phishing" → "vefveiðar" (ALWAYS use Icelandic term — the Language Committee prefers native terms)
  - "email" → "tölvupóstur" (ALWAYS use Icelandic term, NEVER "email")
  - "password" → "lykilorð" (NEVER "password")
  - "security" → "öryggi" (NEVER "security")
  - "training" → "þjálfun" (NEVER "training")
  - "download" → "hlaða niður" or "sækja" — pick one consistently per module (NEVER "downloada")
  - "link" → "hlekkur" or "tengill" — pick one consistently per module (NEVER "link")
  - CRITICAL: Icelandic is very linguistically conservative — ALWAYS use Icelandic terms, never English loanwords. The Icelandic Language Committee (Íslensk málnefnd) actively creates native terms for new concepts.
    ❌ "Klikkaðu á linkinn" → ✅ "Smelltu á hlekkinn"
    ❌ "Downloadaðu skrána" → ✅ "Sæktu skrána"
  - Icelandic has 4 grammatical cases and gendered nouns — ensure correct declension in all contexts.
  - Use proper Icelandic characters: ð, þ, æ — never substitute with d, th, ae.
  - Keep phrasing natural and clear — Icelandic readers expect pure Icelandic in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  fi: `
### 🇫🇮 Finnish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Varoitus!", "Ole varovainen!", "Varo!", "Pysy valppaana!", "Kiinnitä huomiota"
  - FORBIDDEN: "Bravo!", "Erittäin hyviä!", "Loistava!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Varmista yksityiskohdat", "Varmista huolellisesti", "Vahvista ennen napsauttamista", "Vahvista"
For praise/completion: "Onnittelen", "Erinomainen", "Koulutus valmis"

📝 TERMINOLOGY & NATURALNESS (Finnish-specific):
  - "phishing" → "tietojen kalastelu" (descriptive native term) or "phishing" (accepted loanword in IT contexts)
  - "email" → "sähköposti" (ALWAYS use Finnish term, NEVER "email")
  - "password" → "salasana" (NEVER "password")
  - "security" → "tietoturva" (information security) or "turvallisuus" (general security) — pick based on context
  - "training" → "koulutus"
  - "download" → "lataa" (imperative) / "ladata" (infinitive) / "lataus" (noun) — NEVER "downloadata"
  - "link" → "linkki" (accepted loanword, widely used in Finnish)
  - Finnish is agglutinative — ensure proper case suffixes (Finnish has 15 grammatical cases):
    ❌ "Avaa sähköposti" → ✅ "Avaa sähköpostiviesti" (more specific, natural Finnish)
    ❌ "Klikkaa linkki" → ✅ "Klikkaa linkkiä" (partitive case required after "klikkaa")
  - Avoid unnecessary compound words — break into shorter natural phrases when compounds sound artificial:
    ❌ "tietoturvatietoisuuskoulutus" → ✅ "tietoturvakoulutus" (shorter, natural)
  - Keep phrasing direct and professional — Finnish communication style values clarity and brevity.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  cy: `
### 🏴󠁧󠁢󠁷󠁬󠁳󠁿 Welsh Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Rhybudd!", "Byddwch yn ofalus!", "Gwyliwch!", "Cadwch lygad!", "Byddwch yn wyliadwrus!"
  - FORBIDDEN: "Da iawn ti!", "Gwych!", "Ardderchog!" (when used in patronizing/teacherly tone)

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Gwiriwch y manylion", "Gwiriwch yn ofalus", "Cadarnhewch cyn clicio", "Cadarnhewch"
For praise/completion: "Llongyfarchiadau", "Da iawn", "Hyfforddiant wedi'i gwblhau"

📝 TERMINOLOGY & NATURALNESS (Welsh-specific):
  - "phishing" → "gwe-rwydo" (native Welsh term coined by Canolfan Bedwyr) or "phishing" (if native term not yet widespread)
  - "email" → "e-bost" (standard Welsh) — NEVER "email"
  - "password" → "cyfrinair"
  - "security" → "diogelwch"
  - "training" → "hyfforddiant"
  - "download" → "lawrlwytho" (verb) / "lawrlwythiad" (noun) — NEVER "download"
  - "link" → "dolen" or "cyswllt"
  - Use **formal written Welsh** (Cymraeg ffurfiol) by default for professional content.
  - Apply **soft mutation** (treiglad meddal), **nasal mutation** (treiglad trwynol), and **aspirate mutation** (treiglad llaes) correctly. These are critical for natural Welsh.
  - Prefer native Welsh vocabulary over anglicisms where standard Welsh terms exist (e.g., "cyfrifiadur" not "compiwter", "rhwydwaith" for network).
  - For cybersecurity terms without established Welsh equivalents, use the English term with Welsh grammar applied.
  - Welsh uses **VSO word order** (Verb-Subject-Object) — do not force English SVO order.
  - Maintain professional register: avoid colloquial South/North dialectal forms; use standard literary Welsh.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ms: `
### 🇲🇾 Malay Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Berhati-hati!", "Awas!", "Jaga-jaga!", "Waspada!", "Ingat!"
  - FORBIDDEN: "Syabas!", "Bagus!", "Tahniah!" (when patronizing)

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Sila semak", "Semak dengan teliti", "Sahkan sebelum klik", "Sahkan"
For praise/completion: "Tahniah", "Cemerlang", "Latihan selesai"

📝 TERMINOLOGY & NATURALNESS (Malay-specific):
  - "phishing" → "phishing" (accepted loanword) or "penipuan siber" (descriptive native term)
  - "email" → "e-mel" (standard Malay, per Dewan Bahasa) — NEVER "email"
  - "password" → "kata laluan" (NEVER "password")
  - "security" → "keselamatan"
  - "training" → "latihan"
  - "download" → "muat turun" (NEVER "download")
  - "link" → "pautan" (NEVER "link")
  - "click" → "klik" (accepted loanword)
  - CRITICAL: Malay and Indonesian are similar but distinct — use standard Malay (Bahasa Melayu), not Indonesian:
    ❌ "unduh" (Indonesian for download) → ✅ "muat turun" (Malay)
    ❌ "kata sandi" (Indonesian for password) → ✅ "kata laluan" (Malay)
    ❌ "tautan" (Indonesian for link) → ✅ "pautan" (Malay)
  - Follow Dewan Bahasa dan Pustaka (DBP) terminology standards.
  - Use formal register — avoid colloquial Malay (bahasa pasar).

🛡️ CONTAMINATION SHIELD (Malay is commonly confused with Indonesian):
  | Wrong (Indonesian) | Correct Malay |
  | unduh | muat turun |
  | kata sandi | kata laluan |
  | tautan | pautan |
  | unggah | muat naik |
  | masuk | log masuk |
  | pelatihan | latihan |
  | keamanan | keselamatan |
  | surel | e-mel |
  | klik | klik (same — OK) |
  | berkas | fail |

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  tl: `
### 🇵🇭 Filipino/Tagalog Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Mag-ingat!", "Bantayan!", "Mag-iingat ka!", "Huwag kalimutan!"
  - FORBIDDEN: "Magaling!", "Galing mo!", "Ayos!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Pakisuri", "Suriin nang mabuti", "Kumpirmahin bago i-click", "Patunayan"
For praise/completion: "Binabati kita", "Mahusay", "Natapos na ang pagsasanay"

📝 TERMINOLOGY & NATURALNESS (Filipino-specific):
  - "phishing" → "phishing" (accepted loanword — no standard Filipino equivalent)
  - "email" → "email" (accepted loanword, widely used) or "e-liham" (rare, overly formal)
  - "password" → "password" (accepted) or "hudyat" (native, less common in IT)
  - "security" → "seguridad" (common) or "kaligtasan" (native)
  - "training" → "pagsasanay"
  - "download" → "i-download" (accepted with Filipino prefix) or "mag-download"
  - "link" → "link" (accepted loanword)
  - Filipino is a Taglish-friendly language in corporate contexts — mixing English loanwords with Filipino grammar is natural and expected:
    ✅ "I-click ang link" (natural Filipino-English)
    ✅ "Mag-report ng suspicious email" (natural in IT context)
  - But avoid excessive English — keep Filipino structure dominant:
    ❌ "Check the email before clicking the link" (pure English) → ✅ "Suriin ang email bago i-click ang link"
  - Use formal Filipino (not casual/slang) — avoid jejemon-style or regional dialects.
  - Filipino uses "po" and "opo" for politeness — include in formal instructions:
    ✅ "Pakisuri po ang email"

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  lt: `
### 🇱🇹 Lithuanian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Dėmesio!", "Būk atsargus!", "Saugokis!", "Budėk!", "Žiūrėk"
  - FORBIDDEN: "Šaunuolis!", "Puiku!", "Gerai!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Prašome patikrinti", "Atidžiai patikrinkite", "Patvirtinkite prieš spustelėdami", "Patvirtinkite"
For praise/completion: "Sveikiname", "Puiku", "Mokymai baigti"

📝 TERMINOLOGY & NATURALNESS (Lithuanian-specific):
  - "phishing" → "sukčiavimas internete" (descriptive) or "fišingas" (accepted transliteration in IT)
  - "email" → "el. paštas" (standard abbreviation) or "elektroninis paštas" (full form)
  - "password" → "slaptažodis"
  - "security" → "saugumas" (general) or "apsauga" (protection)
  - "training" → "mokymai"
  - "download" → "atsisiųsti" (verb) / "atsisiuntimas" (noun) — NEVER "downloadinti"
  - "link" → "nuoroda"
  - Lithuanian has 7 grammatical cases — ensure correct declension in sentences:
    ❌ "Spauskite nuoroda" (wrong case) → ✅ "Spauskite nuorodą" (accusative)
  - Use diacritics correctly (ą, č, ę, ė, į, š, ų, ū, ž) — missing diacritics is a quality failure.
  - Use formal "jūs" in professional content.
  - Lithuanian is highly conservative — prefer native terms over loanwords.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  lv: `
### 🇱🇻 Latvian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Uzmanību!", "Esi uzmanīgs!", "Sargies!", "Esi modrīgs!", "Piesardzīgi"
  - FORBIDDEN: "Bravo!", "Lieliski!", "Labi!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Lūdzu pārbaudiet", "Rūpīgi pārbaudiet", "Apstipriniet pirms klikšķināšanas", "Apstipriniet"
For praise/completion: "Apsveicam", "Izcili", "Apmācība pabeigta"

📝 TERMINOLOGY & NATURALNESS (Latvian-specific):
  - "phishing" → "pikšķerēšana" (standard Latvian IT term) or "fišings" (accepted transliteration)
  - "email" → "e-pasts" (standard Latvian)
  - "password" → "parole"
  - "security" → "drošība"
  - "training" → "apmācība"
  - "download" → "lejupielādēt" (verb) / "lejupielāde" (noun)
  - "link" → "saite"
  - CRITICAL: Latvian is distinct from Lithuanian — do NOT substitute Lithuanian terms:
    ❌ "slaptažodis" (Lithuanian) → ✅ "parole" (Latvian)
  - Latvian has 7 grammatical cases — ensure correct declension.
  - Use diacritics correctly (ā, č, ē, ģ, ī, ķ, ļ, ņ, š, ū, ž) — mandatory, not optional.
  - Use formal "jūs" in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  et: `
### 🇪🇪 Estonian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Ettevaatust!", "Ole ettevaatlik!", "Hoia silmad lahti!", "Ole valvas!", "Vaata ette"
  - FORBIDDEN: "Tubli!", "Väga hea!", "Suurepärane!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Palun kontrollige", "Kontrollige hoolikalt", "Kinnitage enne klõpsamist", "Kinnitage"
For praise/completion: "Palju õnne", "Suurepärane", "Koolitus lõpetatud"

📝 TERMINOLOGY & NATURALNESS (Estonian-specific):
  - "phishing" → "andmepüük" (standard Estonian IT term — ALWAYS use native term)
  - "email" → "e-kiri" (standard Estonian) or "meil" (informal/IT) — pick one consistently
  - "password" → "parool"
  - "security" → "turvalisus"
  - "training" → "koolitus"
  - "download" → "alla laadima" (verb) / "allalaadimine" (noun)
  - "link" → "link" (accepted loanword) or "viide" (native)
  - Estonian has 14 grammatical cases — ensure correct case endings:
    ❌ "Vajuta link" → ✅ "Vajuta lingile" (allative case)
  - Estonian does NOT have grammatical gender — avoid gendered phrasing.
  - Use formal "teie" in professional content — NEVER informal "sina".
  - Estonian is a Finno-Ugric language — NOT similar to Latvian/Lithuanian. Do NOT use Baltic terms.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  sl: `
### 🇸🇮 Slovenian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Pozor!", "Bodi previden!", "Pazi!", "Bodi na preži!", "Pazljivo"
  - FORBIDDEN: "Bravo!", "Odlično!", "Super!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Prosimo, preverite", "Skrbno preverite", "Potrdite pred klikom", "Potrdite"
For praise/completion: "Čestitamo", "Odlično", "Usposabljanje zaključeno"

📝 TERMINOLOGY & NATURALNESS (Slovenian-specific):
  - "phishing" → "ribarjenje" (native term used by SI-CERT) or "phishing" (accepted loanword)
  - "email" → "e-pošta" (standard Slovenian) or "elektronska pošta" (full form)
  - "password" → "geslo"
  - "security" → "varnost"
  - "training" → "usposabljanje" (formal) or "izobraževanje" (education)
  - "download" → "prenesti" (verb) / "prenos" (noun) — NEVER "downloadati"
  - "link" → "povezava"
  - CRITICAL: Slovenian is distinct from Croatian/Serbian — use Slovenian-specific vocabulary:
    ❌ "lozinka" (Croatian/Serbian) → ✅ "geslo" (Slovenian)
    ❌ "sigurnost" (Croatian) → ✅ "varnost" (Slovenian)
  - Slovenian has dual number (singular/dual/plural) — use correctly when addressing 2 people.
  - Slovenian has 6 grammatical cases — ensure correct declension.
  - Use formal "vi"/"vikanje" in professional content.

🛡️ CONTAMINATION SHIELD (Slovenian is commonly confused with Croatian and Serbian):
  | Wrong (Croatian/Serbian) | Correct Slovenian |
  | lozinka | geslo |
  | sigurnost / bezbednost | varnost |
  | preuzimanje | prenos |
  | poveznica / veza | povezava |
  | obuka | usposabljanje |
  | točno / tačno | pravilno / točno |
  | kliknite | kliknite (same — OK) |
  | prijava | prijava (same — OK) |
  | postavke / podešavanja | nastavitve |

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  az: `
### 🇦🇿 Azerbaijani Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Diqqət!", "Ehtiyatlı ol!", "Sayıq ol!", "Gözünü aç!", "Yada sal"
  - FORBIDDEN: "Əla!", "Afərin!", "Yaxşı!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Zəhmət olmasa yoxlayın", "Diqqətlə yoxlayın", "Klikdən əvvəl təsdiqləyin", "Təsdiqləyin"
For praise/completion: "Təbriklər", "Əla", "Təlim tamamlandı"

📝 TERMINOLOGY & NATURALNESS (Azerbaijani-specific):
  - "phishing" → "fişinq" (Azerbaijani transliteration) or "phishing" (accepted loanword)
  - "email" → "e-poçt" (standard Azerbaijani) — NEVER "email"
  - "password" → "şifrə" or "parol" — pick one consistently
  - "security" → "təhlükəsizlik"
  - "training" → "təlim"
  - "download" → "yükləmək" (verb) / "yükləmə" (noun)
  - "link" → "keçid" (native) or "link" (accepted loanword)
  - ALWAYS use Latin script — NEVER Cyrillic (Azerbaijan switched to Latin in 1991).
  - Azerbaijani is a Turkic language — similar to Turkish but distinct:
    ❌ "güvenlik" (Turkish) → ✅ "təhlükəsizlik" (Azerbaijani)
    ❌ "e-posta" (Turkish) → ✅ "e-poçt" (Azerbaijani)
  - Vowel harmony applies — ensure correct suffix vowels (a/ə, ı/i, o/ö, u/ü).
  - Use formal "siz" in professional content — NEVER informal "sən".
  - Use special Azerbaijani characters correctly: ə, ğ, ı, ö, ş, ü, ç.

🛡️ CONTAMINATION SHIELD (Azerbaijani is commonly confused with Turkish):
  | Wrong (Turkish) | Correct Azerbaijani |
  | güvenlik | təhlükəsizlik |
  | e-posta | e-poçt |
  | indirme | yükləmə |
  | bağlantı | keçid |
  | eğitim | təlim |
  | doğrulama | təsdiqləmə |
  | tıklayın | klikləyin or basın |
  | şifre | şifrə (note the ə) |
  | bilgisayar | kompüter |
  | kaydet | yadda saxla |

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ka: `
### 🇬🇪 Georgian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "ყურადღება!", "ფრთხილად!", "გაფრთხილდი!", "ყურადღებით იყავი!"
  - FORBIDDEN: "ბრავო!", "მშვენიერი!", "კარგი!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "გთხოვთ შეამოწმოთ", "ყურადღებით შეამოწმეთ", "დაადასტურეთ დაწკაპუნებამდე", "დაადასტურეთ"
For praise/completion: "გილოცავთ", "შესანიშნავი", "ტრენინგი დასრულებულია"

📝 TERMINOLOGY & NATURALNESS (Georgian-specific):
  - "phishing" → "ფიშინგი" (standard Georgian transliteration)
  - "email" → "ელ.ფოსტა" (standard Georgian abbreviation) — NEVER "იმეილი"
  - "password" → "პაროლი"
  - "security" → "უსაფრთხოება"
  - "training" → "ტრენინგი" (accepted loanword) or "სწავლება" (native)
  - "download" → "ჩამოტვირთვა" (noun) / "ჩამოტვირთეთ" (imperative)
  - "link" → "ბმული" (native) or "ლინკი" (accepted loanword)
  - Georgian has its own unique script (მხედრული) — NEVER use transliteration in output.
  - Georgian has no grammatical gender — but has complex verb conjugation with preverbs.
  - Georgian uses postpositions rather than prepositions — ensure correct word order:
    ❌ "კლიკი ბმულზე" → ✅ "დააწკაპუნეთ ბმულზე" (correct postposition)
  - Keep phrasing natural and professional — avoid Russian-influenced vocabulary where Georgian alternatives exist.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  af: `
### 🇿🇦 Afrikaans Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Pasop!", "Wees versigtig!", "Wees op jou hoede!", "Bly wakker!", "Onthou om"
  - FORBIDDEN: "Goed gedoen!", "Baie goed!", "Puik!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Kontroleer asseblief", "Kontroleer noukeurig", "Bevestig voor u klik", "Bevestig"
For praise/completion: "Geluk", "Uitstekend", "Opleiding voltooi"

📝 TERMINOLOGY & NATURALNESS (Afrikaans-specific):
  - "phishing" → "uitvissing" (native term) or "phishing" (accepted loanword in IT)
  - "email" → "e-pos" (standard Afrikaans)
  - "password" → "wagwoord"
  - "security" → "sekuriteit"
  - "training" → "opleiding"
  - "download" → "aflaai" (verb) / "aflaaing" (noun) — NEVER "download"
  - "link" → "skakel" (native) or "link" (accepted loanword)
  - CRITICAL: Afrikaans is derived from Dutch but is a distinct language — do NOT use Dutch:
    ❌ "wachtwoord" (Dutch) → ✅ "wagwoord" (Afrikaans)
    ❌ "downloaden" (Dutch) → ✅ "aflaai" (Afrikaans)
  - Afrikaans has no grammatical gender for adjectives — simpler than Dutch.
  - Use "u" (formal) in professional content — NEVER "jy"/"jou" (informal).
  - Afrikaans double negation is grammatically correct: "Moenie op die skakel klik nie" (Don't click the link).

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ca: `
### 🏴 Catalan Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Compte!", "Vigila!", "Ves amb compte!", "Estigues alerta!", "Recorda que"
  - FORBIDDEN: "Bravo!", "Molt bé!", "Genial!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Si us plau, comproveu", "Comproveu amb cura", "Confirmeu abans de fer clic", "Confirmeu"
For praise/completion: "Felicitats", "Excel·lent", "Formació completada"

📝 TERMINOLOGY & NATURALNESS (Catalan-specific):
  - "phishing" → "pesca de credencials" (descriptive native) or "phishing" (accepted loanword in IT)
  - "email" → "correu electrònic" (standard) or "correu-e" (abbreviation)
  - "password" → "contrasenya"
  - "security" → "seguretat"
  - "training" → "formació"
  - "download" → "baixar" (verb) / "descàrrega" (noun) — NEVER "descarregar" (that's Spanish)
  - "link" → "enllaç"
  - CRITICAL: Catalan is distinct from Spanish — do NOT substitute Spanish terms:
    ❌ "contraseña" (Spanish) → ✅ "contrasenya" (Catalan)
    ❌ "seguridad" (Spanish) → ✅ "seguretat" (Catalan)
    ❌ "descargar" (Spanish) → ✅ "baixar" (Catalan)
  - Use Catalan-specific characters and digraphs: ç, l·l (ela geminada), ny, tx.
  - Catalan uses "vostè"/"vostès" (formal) — NEVER "tu" in professional content.
  - Follow Institut d'Estudis Catalans (IEC) orthographic norms.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ta: `
### 🇮🇳 Tamil Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "எச்சரிக்கை!", "கவனமாக இருங்கள்!", "ஜாக்கிரதை!", "விழிப்பாக இருங்கள்!", "ஏமாறாதீர்கள்!"
  - FORBIDDEN: "சபாஷ்!", "அருமை!", "நல்லது!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "சரிபார்க்கவும்", "உறுதிசெய்யவும்", "கவனத்தில் கொள்ளவும்", "தயவுசெய்து சரிபார்க்கவும்"
For praise/completion: "வாழ்த்துகள்!", "பயிற்சி நிறைவடைந்தது.", "வெற்றிகரமாக முடிக்கப்பட்டது."

📝 TERMINOLOGY & NATURALNESS (Tamil-specific):
  - "phishing" → "ஃபிஷிங்" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "மின்னஞ்சல்" (standard Tamil) — NEVER use "email" directly
  - "password" → "கடவுச்சொல்" (standard Tamil)
  - "security" → "பாதுகாப்பு"
  - "training" → "பயிற்சி"
  - "download" → "பதிவிறக்கம்"
  - "link" → "இணைப்பு"
  - NOTE: In Indian IT corporate contexts, English IT terms (phishing, malware, URL) are commonly kept as-is or transliterated. Prefer native Tamil terms where they exist and are widely understood.
  - Use formal register ("நீங்கள்" form) — NEVER informal "நீ" in professional content.
  - Tamil uses postpositions — ensure word order is natural SOV (Subject-Object-Verb).
    ❌ "கிளிக் செய்வதற்கு முன் அனுப்பியவரை சரிபார்க்கவும்" (awkward calque) → ✅ "இணைப்பைக் கிளிக் செய்வதற்கு முன், அனுப்புநரின் முகவரியைச் சரிபார்க்கவும்"
  - NEVER mix Tamil script with Latin script mid-sentence. Either use full Tamil or use the accepted loanword in Tamil script (transliteration).
  - Tamil script must use proper Unicode — no Romanized Tamil (Tanglish) in formal output.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  te: `
### 🇮🇳 Telugu Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "జాగ్రత్త!", "అప్రమత్తంగా ఉండండి!", "మోసపోకండి!", "హెచ్చరిక!", "తెలివిగా ఉండండి!"
  - FORBIDDEN: "భలే!", "బాగుంది!", "శభాష్!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "దయచేసి తనిఖీ చేయండి", "నిర్ధారించుకోండి", "పరిశీలించండి", "దయచేసి ధృవీకరించండి"
For praise/completion: "అభినందనలు!", "శిక్షణ విజయవంతంగా పూర్తయింది.", "విజయవంతంగా పూర్తయింది."

📝 TERMINOLOGY & NATURALNESS (Telugu-specific):
  - "phishing" → "ఫిషింగ్" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "ఇమెయిల్" (transliteration widely accepted) or "విద్యున్మాన తపాలా" (formal)
  - "password" → "పాస్‌వర్డ్" (transliteration) or "సంకేతపదం" (native)
  - "security" → "భద్రత"
  - "training" → "శిక్షణ"
  - "download" → "డౌన్‌లోడ్" (transliteration widely accepted)
  - "link" → "లింక్" (transliteration) or "అనుసంధానం" (native)
  - NOTE: Telugu IT professionals commonly use English loanwords. Use transliterated forms in Telugu script rather than raw Latin characters.
  - Use formal register with "మీరు" (respectful you) — NEVER "నువ్వు" in professional content.
  - Telugu is an SOV language — maintain natural word order.
    ❌ "చెక్ చేయండి మీ ఇమెయిల్" (English word order) → ✅ "మీ ఇమెయిల్‌ను తనిఖీ చేయండి"
  - NEVER output Romanized Telugu (Tenglish) — always use proper Telugu script in formal content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  mr: `
### 🇮🇳 Marathi Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "सावध!", "जपून!", "सतर्क राहा!", "फसू नका!", "जागरूक राहा!"
  - FORBIDDEN: "शाब्बास!", "खूप छान!", "वा!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "कृपया तपासा", "खात्री करा", "पडताळणी करा", "कृपया सत्यापित करा"
For praise/completion: "अभिनंदन!", "प्रशिक्षण यशस्वीरित्या पूर्ण झाले.", "यशस्वीरित्या पूर्ण."

📝 TERMINOLOGY & NATURALNESS (Marathi-specific):
  - "phishing" → "फिशिंग" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "ईमेल" (transliteration widely accepted) or "विद्युत पत्र" (formal)
  - "password" → "पासवर्ड" (transliteration) or "संकेतशब्द" (native Marathi)
  - "security" → "सुरक्षितता"
  - "training" → "प्रशिक्षण"
  - "download" → "डाउनलोड" (transliteration widely accepted)
  - "link" → "लिंक" (transliteration) or "दुवा" (native Marathi)
  - Marathi uses Devanagari script (same as Hindi) but has distinct vocabulary. NEVER substitute Hindi words:
    ❌ "सीखना" (Hindi for "to learn") → ✅ "शिकणे" (Marathi)
    ❌ "कार्य" (Hindi-style) → ✅ "काम" (natural Marathi)
  - Use formal register "आपण" or "तुम्ही" — NEVER "तू" in professional content.
  - Marathi is SOV — maintain natural word order.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  gu: `
### 🇮🇳 Gujarati Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "સાવધાન!", "ચેતજો!", "જાગૃત રહો!", "ધ્યાન રાખજો!", "છેતરાશો નહીં!"
  - FORBIDDEN: "શાબાશ!", "ઘણું સારું!", "વાહ!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "કૃપા કરીને ચકાસો", "ખાતરી કરો", "ચકાસણી કરો", "કૃપા કરીને ચકાસણી કરો"
For praise/completion: "અભિનંદન!", "તાલીમ સફળતાપૂર્વક પૂર્ણ થઈ.", "સફળતાપૂર્વક પૂર્ણ."

📝 TERMINOLOGY & NATURALNESS (Gujarati-specific):
  - "phishing" → "ફિશિંગ" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "ઈમેઈલ" (transliteration widely accepted)
  - "password" → "પાસવર્ડ" (transliteration) or "સંકેતશબ્દ" (native)
  - "security" → "સુરક્ષા"
  - "training" → "તાલીમ"
  - "download" → "ડાઉનલોડ" (transliteration widely accepted)
  - "link" → "લિંક" (transliteration) or "કડી" (native Gujarati)
  - Gujarati uses its own script (ગુજરાતી લિપિ) — NEVER use Devanagari characters.
    ❌ "सुरक्षा" (Devanagari/Hindi) → ✅ "સુરક્ષા" (Gujarati script)
  - Use formal register "આપ" or "તમે" — NEVER "તું" in professional content.
  - Gujarati is SOV — maintain natural word order.
  - IT loanwords are common in Gujarati corporate settings; use Gujarati script transliterations.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  pa: `
### 🇮🇳 Punjabi Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "ਸਾਵਧਾਨ!", "ਖ਼ਬਰਦਾਰ!", "ਹੁਸ਼ਿਆਰ ਰਹੋ!", "ਧੋਖਾ ਨਾ ਖਾਓ!", "ਸੁਚੇਤ ਰਹੋ!"
  - FORBIDDEN: "ਸ਼ਾਬਾਸ਼!", "ਬਹੁਤ ਵਧੀਆ!", "ਵਾਹ!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰੋ", "ਪੁਸ਼ਟੀ ਕਰੋ", "ਤਸਦੀਕ ਕਰੋ", "ਕਿਰਪਾ ਕਰਕੇ ਤਸਦੀਕ ਕਰੋ"
For praise/completion: "ਵਧਾਈਆਂ!", "ਸਿਖਲਾਈ ਸਫ਼ਲਤਾਪੂਰਵਕ ਪੂਰੀ ਹੋਈ.", "ਸਫ਼ਲਤਾਪੂਰਵਕ ਪੂਰੀ."

📝 TERMINOLOGY & NATURALNESS (Punjabi-specific):
  - "phishing" → "ਫਿਸ਼ਿੰਗ" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "ਈਮੇਲ" (transliteration widely accepted)
  - "password" → "ਪਾਸਵਰਡ" (transliteration) or "ਸੰਕੇਤਕ ਸ਼ਬਦ" (native)
  - "security" → "ਸੁਰੱਖਿਆ"
  - "training" → "ਸਿਖਲਾਈ"
  - "download" → "ਡਾਊਨਲੋਡ" (transliteration widely accepted)
  - "link" → "ਲਿੰਕ" (transliteration) or "ਕੜੀ" (native)
  - Punjabi uses Gurmukhi script (ਗੁਰਮੁਖੀ) in India — ALWAYS use Gurmukhi for this locale.
    ❌ Shahmukhi (پنجابی) for India-targeted content → ✅ Gurmukhi (ਪੰਜਾਬੀ)
  - NEVER mix Hindi Devanagari with Gurmukhi.
  - Use formal register "ਤੁਸੀਂ" — NEVER "ਤੂੰ" in professional content.
  - Punjabi is SOV — maintain natural word order.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ml: `
### 🇮🇳 Malayalam Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "ജാഗ്രത!", "സൂക്ഷിക്കുക!", "കരുതിയിരിക്കുക!", "ഏമാറരുത്!", "ശ്രദ്ധിക്കുക!"
  - FORBIDDEN: "ശാബാഷ്!", "കൊള്ളാം!", "നന്നായി!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "ദയവായി പരിശോധിക്കുക", "ഉറപ്പാക്കുക", "സ്ഥിരീകരിക്കുക", "ദയവായി സ്ഥിരീകരിക്കുക"
For praise/completion: "അഭിനന്ദനങ്ങൾ!", "പരിശീലനം വിജയകരമായി പൂർത്തിയായി.", "വിജയകരമായി പൂർത്തിയായി."

📝 TERMINOLOGY & NATURALNESS (Malayalam-specific):
  - "phishing" → "ഫിഷിംഗ്" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "ഇമെയിൽ" (transliteration widely accepted) or "ഇ-തപാൽ" (native)
  - "password" → "പാസ്‌വേഡ്" (transliteration) or "രഹസ്യവാക്ക്" (native)
  - "security" → "സുരക്ഷ"
  - "training" → "പരിശീലനം"
  - "download" → "ഡൗൺലോഡ്" (transliteration widely accepted)
  - "link" → "ലിങ്ക്" (transliteration) or "കണ്ണി" (native)
  - Malayalam has one of the most complex scripts in India — ensure proper Unicode rendering, especially for conjunct consonants (കൂട്ടക്ഷരങ്ങൾ).
  - Use formal register — Malayalam distinguishes "നിങ്ങൾ" (formal) from "നീ" (informal). ALWAYS use "നിങ്ങൾ" or "താങ്കൾ" (highly formal) in professional content.
  - Malayalam is SOV — maintain natural word order.
    ❌ "ക്ലിക്ക് ചെയ്യുക ലിങ്ക് പരിശോധിച്ച ശേഷം" → ✅ "ലിങ്ക് പരിശോധിച്ച ശേഷം ക്ലിക്ക് ചെയ്യുക"
  - NEVER use Romanized Malayalam (Manglish) in formal output.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ne: `
### 🇳🇵 Nepali Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "होशियार!", "सावधान!", "सतर्क रहनुहोस्!", "ठगिनुहुन्न!", "जागरुक हुनुहोस्!"
  - FORBIDDEN: "शाबास!", "राम्रो!", "बहुत राम्रो!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "कृपया जाँच गर्नुहोस्", "सुनिश्चित गर्नुहोस्", "प्रमाणित गर्नुहोस्", "कृपया प्रमाणित गर्नुहोस्"
For praise/completion: "बधाई छ!", "तालिम सफलतापूर्वक सम्पन्न भयो.", "सफलतापूर्वक सम्पन्न."

📝 TERMINOLOGY & NATURALNESS (Nepali-specific):
  - "phishing" → "फिसिङ" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "इमेल" (transliteration widely accepted) or "विद्युतीय पत्र" (formal)
  - "password" → "पासवर्ड" (transliteration) or "गोप्यशब्द" (native)
  - "security" → "सुरक्षा"
  - "training" → "तालिम"
  - "download" → "डाउनलोड" (transliteration widely accepted)
  - "link" → "लिंक" (transliteration) or "कडी" (native)
  - Nepali uses Devanagari script — NEVER confuse with Hindi. Nepali has distinct vocabulary and grammar:
    ❌ "सीखिए" (Hindi) → ✅ "सिक्नुहोस्" (Nepali)
    ❌ "क्लिक करें" (Hindi) → ✅ "क्लिक गर्नुहोस्" (Nepali)
  - Use formal register with "तपाईं" (respectful you) — NEVER "तँ" or "तिमी" in professional content.
  - Nepali uses honorific verb conjugations — ensure "-नुहोस्" (respectful imperative) forms.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  si: `
### 🇱🇰 Sinhala Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "ප්‍රවේශම්!", "පරිස්සමින්!", "අවධානයෙන්!", "රැවටෙන්න එපා!", "දැනුවත් වෙන්න!"
  - FORBIDDEN: "සාධුකාර!", "හොඳයි!", "නියමයි!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "කරුණාකර පරීක්ෂා කරන්න", "තහවුරු කරන්න", "සත්‍යාපනය කරන්න", "කරුණාකර සත්‍යාපනය කරන්න"
For praise/completion: "සුබ පැතුම්!", "පුහුණුව සාර්ථකව සම්පූර්ණ විය.", "සාර්ථකව සම්පූර්ණ විය."

📝 TERMINOLOGY & NATURALNESS (Sinhala-specific):
  - "phishing" → "ෆිෂිං" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "ඊමේල්" (transliteration widely accepted) or "විද්‍යුත් තැපෑල" (native)
  - "password" → "මුරපදය"
  - "security" → "ආරක්ෂාව"
  - "training" → "පුහුණුව"
  - "download" → "බාගත කිරීම"
  - "link" → "සබැඳිය"
  - Sinhala uses its own unique script (සිංහල අක්ෂර) — NEVER mix with Tamil or Devanagari.
  - Sinhala has complex conjunct consonants — ensure proper Unicode rendering.
  - Use formal register "ඔබ" — NEVER informal "ඔයා" in professional content.
  - Sinhala is SOV — maintain natural word order.
  - Sri Lankan corporate context may mix English IT terms; prefer Sinhala script transliterations.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  my: `
### 🇲🇲 Burmese Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "သတိထား!", "ဂရုစိုက်!", "သတိရှိပါ!", "လိမ်ညာခံမရ!", "အန္တရာယ်!"
  - FORBIDDEN: "ကောင်းလိုက်တာ!", "တော်တယ်!", "အံ့ဩစရာ!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "ကျေးဇူးပြု၍ စစ်ဆေးပါ", "အတည်ပြုပါ", "စိစစ်ပါ", "ကျေးဇူးပြု၍ အတည်ပြုပါ"
For praise/completion: "ဂုဏ်ယူပါသည်!", "လေ့ကျင့်မှု အောင်မြင်စွာ ပြီးဆုံးပါပြီ။", "အောင်မြင်စွာ ပြီးဆုံးပါပြီ။"

📝 TERMINOLOGY & NATURALNESS (Burmese-specific):
  - "phishing" → "ဖိရှင်" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "အီးမေးလ်" (transliteration widely accepted)
  - "password" → "စကားဝှက်"
  - "security" → "လုံခြုံရေး"
  - "training" → "လေ့ကျင့်မှု"
  - "download" → "ဒေါင်းလုဒ်" (transliteration) or "ရယူခြင်း" (native)
  - "link" → "လင့်ခ်" (transliteration) or "ချိတ်ဆက်" (native)
  - Burmese script (မြန်မာအက္ခရာ) is an abugida — ensure proper rendering of stacked consonants and medials.
  - Burmese is a tonal language — spelling affects meaning; ensure accurate character selection.
  - Burmese does not use spaces between words — use Burmese word segmentation conventions.
  - Use formal/polite register with "ပါ"/"ပါသည်" suffixes in professional content.
  - NEVER use Romanized Burmese (Burglish) in formal output.
  - Burmese is SOV — maintain natural word order.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  km: `
### 🇰🇭 Khmer Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "ប្រយ័ត្ន!", "ចូរប្រយ័ត្ន!", "ស្មារតី!", "កុំភ្លេច!", "រៀបម៉ឹង!"
  - FORBIDDEN: "ពូកែ!", "ល្អណាស់!", "អស្ចារ្យ!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "សូមពិនិត្យ", "សូមផ្ទៀងផ្ទាត់", "សូមបញ្ជាក់", "សូមត្រួតពិនិត្យ"
For praise/completion: "សូមអបអរសាទរ!", "វគ្គបណ្ដុះបណ្ដាលបានបញ្ចប់ដោយជោគជ័យ។", "បានបញ្ចប់ដោយជោគជ័យ។"

📝 TERMINOLOGY & NATURALNESS (Khmer-specific):
  - "phishing" → "ហ្វីសស៊ីង" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "អ៊ីមែល" (transliteration widely accepted)
  - "password" → "ពាក្យសម្ងាត់"
  - "security" → "សន្តិសុខ" or "សុវត្ថិភាព"
  - "training" → "វគ្គបណ្ដុះបណ្ដាល"
  - "download" → "ទាញយក"
  - "link" → "តំណ"
  - Khmer script (អក្សរខ្មែរ) does not use spaces between words — use Khmer word segmentation conventions.
  - Khmer has complex subscript consonants (ជើង) — ensure proper Unicode rendering.
  - Use formal register with polite particles "សូម" (please) and "ការ" (nominalizer) in professional content.
  - NEVER use Romanized Khmer in formal output.
    ❌ "som pinityo email" → ✅ "សូមពិនិត្យអ៊ីមែល"
  - Khmer is SVO — maintain natural word order.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  lo: `
### 🇱🇦 Lao Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "ລະວັງ!", "ຈົ່ງລະວັງ!", "ຢ່າປະໝາດ!", "ຢ່າຫຼົງເຊື່ອ!", "ຕື່ນຕົວ!"
  - FORBIDDEN: "ເກັ່ງ!", "ດີຫຼາຍ!", "ງາມ!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "ກະລຸນາກວດສອບ", "ຢືນຢັນ", "ພິສູດ", "ກະລຸນາຢືນຢັນ"
For praise/completion: "ຂໍສະແດງຄວາມຍິນດີ!", "ການຝຶກອົບຮົມສຳເລັດແລ້ວ.", "ສຳເລັດແລ້ວ."

📝 TERMINOLOGY & NATURALNESS (Lao-specific):
  - "phishing" → "ຟິດຊິງ" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "ອີເມລ" (transliteration widely accepted)
  - "password" → "ລະຫັດຜ່ານ"
  - "security" → "ຄວາມປອດໄພ"
  - "training" → "ການຝຶກອົບຮົມ"
  - "download" → "ດາວໂຫຼດ" (transliteration) or "ດາວນ໌ໂຫລດ"
  - "link" → "ລິ້ງ" (transliteration) or "ເຊື່ອມຕໍ່"
  - Lao script (ອັກສອນລາວ) is closely related to Thai but is a distinct writing system — NEVER mix Thai and Lao characters.
    ❌ Thai "สวัสดี" mixed into Lao → ✅ Always use Lao script "ສະບາຍດີ"
  - Lao is a tonal language — spelling determines tone; ensure accurate vowel and consonant selection.
  - Lao does not traditionally use spaces between words — follow modern Lao spacing conventions.
  - Use formal/polite register with "ກະລຸນາ" (please) in professional content.
  - NEVER use Romanized Lao in formal output.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  mn: `
### 🇲🇳 Mongolian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Болгоомжтой бай!", "Анхаар!", "Сэрэмжтэй бай!", "Мэхлэгдэж болохгүй!", "Сонор бай!"
  - FORBIDDEN: "Баяр хүргэе!", "Гоё!", "Сайхан!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Шалгана уу", "Баталгаажуулна уу", "Нягтална уу", "Шалгаж үзнэ үү"
For praise/completion: "Баяр хүргэе!", "Сургалт амжилттай дууслаа.", "Амжилттай дууслаа."

📝 TERMINOLOGY & NATURALNESS (Mongolian-specific):
  - "phishing" → "фишинг" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "имэйл" (transliteration widely accepted) or "цахим шуудан" (native)
  - "password" → "нууц үг"
  - "security" → "аюулгүй байдал"
  - "training" → "сургалт"
  - "download" → "татах" (native) or "татаж авах"
  - "link" → "холбоос" (native) or "линк" (transliteration)
  - Mongolian in Mongolia uses Cyrillic script — ALWAYS use Cyrillic for this locale.
  - NEVER use traditional Mongolian vertical script unless specifically targeting Inner Mongolia.
    ❌ Traditional Mongolian script → ✅ Cyrillic "Монгол хэл"
  - Use formal register with "-на уу"/"-но уу" (polite request) suffixes.
  - Mongolian is SOV — maintain natural word order.
  - Mongolian vowel harmony must be respected in suffixes.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  kk: `
### 🇰🇿 Kazakh Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Абай болыңыз!", "Сақ болыңыз!", "Ескеріңіз!", "Алданбаңыз!", "Аңдаңыз!"
  - FORBIDDEN: "Жарайсың!", "Керемет!", "Тамаша!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Тексеріңіз", "Растаңыз", "Дұрыстығын тексеріңіз", "Өтінеміз, тексеріңіз"
For praise/completion: "Құттықтаймыз!", "Оқыту сәтті аяқталды.", "Сәтті аяқталды."

📝 TERMINOLOGY & NATURALNESS (Kazakh-specific):
  - "phishing" → "фишинг" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "электрондық пошта" (native) or "имейл" (transliteration)
  - "password" → "құпия сөз"
  - "security" → "қауіпсіздік"
  - "training" → "оқыту"
  - "download" → "жүктеп алу"
  - "link" → "сілтеме"
  - Kazakhstan is transitioning from Cyrillic to Latin script. For current corporate use, DEFAULT to Cyrillic unless Latin is explicitly requested.
  - NEVER mix Russian and Kazakh — they share Cyrillic but have different vocabulary:
    ❌ "безопасность" (Russian) → ✅ "қауіпсіздік" (Kazakh)
    ❌ "пароль" (Russian) → ✅ "құпия сөз" (Kazakh)
  - Kazakh has vowel harmony — ensure suffixes agree with the stem vowel class.
  - Use formal register with "Сіз" — NEVER "сен" in professional content.
  - Kazakh is SOV — maintain natural word order.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  uz: `
### 🇺🇿 Uzbek Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Ehtiyot bo'ling!", "Ogoh bo'ling!", "Hushyor bo'ling!", "Aldanmang!", "Diqqat!"
  - FORBIDDEN: "Barakalla!", "Zo'r!", "Ajoyib!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Iltimos, tekshiring", "Tasdiqlang", "Tekshirib ko'ring", "Iltimos, tasdiqlang"
For praise/completion: "Tabriklaymiz!", "O'quv kursi muvaffaqiyatli yakunlandi.", "Muvaffaqiyatli yakunlandi."

📝 TERMINOLOGY & NATURALNESS (Uzbek-specific):
  - "phishing" → "fishing" (adapted loanword) or "phishing" (accepted IT loanword)
  - "email" → "elektron pochta" (native) or "email" (loanword in corporate)
  - "password" → "parol" (widely used loanword) or "maxfiy so'z" (native)
  - "security" → "xavfsizlik"
  - "training" → "o'quv kursi" or "ta'lim"
  - "download" → "yuklab olish"
  - "link" → "havola" (native) or "link" (IT loanword)
  - Uzbekistan uses Latin script (since 1992) — DEFAULT to Latin script for modern Uzbek.
  - NEVER use Cyrillic Uzbek unless explicitly requested for legacy systems.
    ❌ "хавфсизлик" (Cyrillic) → ✅ "xavfsizlik" (Latin)
  - Uzbek Latin uses specific characters: o', g', sh, ch — ensure proper apostrophe usage (o'zbek, not o\`zbek or oʻzbek inconsistently).
  - Use formal register with "Siz" — NEVER "sen" in professional content.
  - Uzbek is SOV — maintain natural word order.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  hy: `
### 🇦🇲 Armenian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Զգուշացեք!", "Ուշադիր եղեք!", "Զգոն եղեք!", "Մի խաբէվեք!", "Կասկածելի եղեք!"
  - FORBIDDEN: "Առավ!", "Շատ լավ!", "Հանճարավոր!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Խնդրում ենք ստուգել", "Հաստատեք", "Ստուգեք", "Խնդրում ենք հաստատեք"
For praise/completion: "Շնորհավորականություններ!", "Վերապատրաստությունը հաջողությամբ ավարտվեց.", "Հաջողությամբ ավարտվեց."

📝 TERMINOLOGY & NATURALNESS (Armenian-specific):
  - "phishing" → "ֆիշինգ" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "էլ. նամակ" (native) or "իմեյլ" (transliteration)
  - "password" → "գաղտնաբառ"
  - "security" → "անվտանգություն"
  - "training" → "վերապատրաստություն"
  - "download" → "ներբեռնել" (native) or "դաունլոդ" (transliteration)
  - "link" → "հղում" (native) or "լինկ" (transliteration)
  - Armenian uses its own unique alphabet (Հայոց այբուբեն) — NEVER mix with Cyrillic or Latin characters in Armenian text.
    ❌ "Безопасность" (Russian Cyrillic) → ✅ "անվտանգություն" (Armenian)
  - Eastern Armenian is standard in Armenia; Western Armenian is used in diaspora. DEFAULT to Eastern Armenian unless specified.
  - Use formal register "Դուք" (you-formal) — NEVER "դու" (informal) in professional content.
  - Armenian is SOV — maintain natural word order.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  am: `
### 🇪🇹 Amharic Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "ተጠንቀቅ!", "ተጠንቀቁ!", "ዘወትር ንቁ!", "አትታለሉ!", "አስተውሉ!"
  - FORBIDDEN: "በጣም ጥሩ!", "አሪፍ!", "ጎበዝ!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "እባክዎ ያረጋግጡ", "ያረጋግጡ", "ያጣሩ", "እባክዎ ያጣሩ"
For praise/completion: "እንኳን ደስ አለዎት!", "ሥልጠናው በተሳካ ሁኔታ ተጠናቋል።", "በተሳካ ሁኔታ ተጠናቋል።"

📝 TERMINOLOGY & NATURALNESS (Amharic-specific):
  - "phishing" → "ፊሺንግ" (transliteration) or "phishing" (accepted IT loanword)
  - "email" → "ኢሜይል" (transliteration widely accepted) or "የኤሌክትሮኒክ መልእክት" (native)
  - "password" → "የይለፍ ቃል"
  - "security" → "ደህንነት"
  - "training" → "ሥልጠና"
  - "download" → "ማውረድ"
  - "link" → "ሊንክ" (transliteration) or "አገናኝ" (native)
  - Amharic uses Ge'ez/Ethiopic script (ፊደል) — NEVER use Romanized Amharic in formal output.
  - Amharic is SOV — maintain natural word order.
  - Use formal register with "እርስዎ" — NEVER "አንተ/አንቺ" in professional content.
  - Amharic script is a syllabary (abugida) — each character represents a consonant-vowel combination. Ensure correct fidel selection.
    ❌ "ተ" when meaning "ቲ" — incorrect vowel form changes meaning.
  - Ethiopian corporate contexts increasingly use English IT terms; prefer Amharic transliterations in Ge'ez script.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  gl: `
### 🏴 Galician Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Coidado!", "Ollo!", "Alerta!", "Atentos!", "Non vos fiedes!"
  - FORBIDDEN: "Bravo!", "Moi ben!", "Xenial!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Por favor, comprobe", "Verifique", "Confirme antes de facer clic", "Comprobe con coidado"
For praise/completion: "Parabéns!", "Formación completada con éxito.", "Completado con éxito."

📝 TERMINOLOGY & NATURALNESS (Galician-specific):
  - "phishing" → "phishing" (accepted IT loanword) or "suplantación" (descriptive)
  - "email" → "correo electrónico" or "correo-e"
  - "password" → "contrasinal"
  - "security" → "seguridade"
  - "training" → "formación"
  - "download" → "descargar" (verb) / "descarga" (noun)
  - "link" → "ligazón" or "enlace"
  - CRITICAL: Galician is distinct from both Spanish and Portuguese — do NOT substitute terms from either:
    ❌ "contraseña" (Spanish) → ✅ "contrasinal" (Galician)
    ❌ "segurança" (Portuguese) → ✅ "seguridade" (Galician)
    ❌ "enlace" (Spanish) → ✅ "ligazón" (Galician, preferred)
  - Follow Real Academia Galega (RAG) orthographic norms.
  - Use formal register "vostede"/"vostedes" — NEVER "ti" in professional content.
  - Galician uses specific features: -ción (not -ção), -dade (not -dad), seseo is regional.

🛡️ CONTAMINATION SHIELD (Galician is commonly confused with Spanish and Portuguese):
  | Wrong (Spanish/Portuguese) | Correct Galician |
  | contraseña (ES) | contrasinal |
  | descargar (ES) | descargar (same — OK) or baixar |
  | enlace (ES) | ligazón or enlace |
  | seguridad (ES) | seguridade |
  | formación (ES) | formación (same — OK) |
  | senha (PT) | contrasinal |
  | treinamento (PT) | formación |
  Use Galician normativa ILG/RAG orthography, not reintegracionismo.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  eu: `
### 🏴 Basque Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Kontuz!", "Argi ibili!", "Ez fidatu!", "Erne!", "Adi egon!"
  - FORBIDDEN: "Txapeldun!", "Oso ongi!", "Bikain!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Mesedez, egiaztatu", "Berretsi", "Klik egin aurretik egiaztatu", "Mesedez, berretsi"
For praise/completion: "Zorionak!", "Prestakuntza arrakastaz osatu da.", "Arrakastaz osatu da."

📝 TERMINOLOGY & NATURALNESS (Basque-specific):
  - "phishing" → "phishing" (accepted IT loanword — no standard native term)
  - "email" → "posta elektronikoa" or "e-posta"
  - "password" → "pasahitza"
  - "security" → "segurtasuna"
  - "training" → "prestakuntza"
  - "download" → "deskargatu" (verb) / "deskarga" (noun)
  - "link" → "esteka" or "lotura"
  - CRITICAL: Basque (Euskara) is a language isolate — it is NOT related to Spanish, French, or any Indo-European language. NEVER substitute Spanish or French terms:
    ❌ "contraseña" (Spanish) → ✅ "pasahitza" (Basque)
    ❌ "sécurité" (French) → ✅ "segurtasuna" (Basque)
  - Basque is ergative-absolutive and SOV — word order is fundamentally different from surrounding Romance languages.
  - Use "Euskara Batua" (Unified Basque) for professional content — avoid dialectal forms (Bizkaiera, Gipuzkera, etc.).
  - Use formal register "zu" — NEVER "hi" (informal) in professional content.
  - Basque agglutinative morphology: suffixes convey case, number, and definiteness (e.g., "segurtasuna" = security-the).

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  mt: `
### 🇲🇹 Maltese Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Attent!", "Oqgħod attent!", "Qis!", "Tħallatx!", "Ftakar!"
  - FORBIDDEN: "Bravu!", "Prosit!", "Tajjeb ħafna!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Jekk jogħġbok, ivverifika", "Ikkonferma", "Iċċekkja qabel tikklikkja", "Jekk jogħġbok, ikkonferma"
For praise/completion: "Prosit!", "It-taħriġ tlesta b'suċċess.", "Tlesta b'suċċess."

📝 TERMINOLOGY & NATURALNESS (Maltese-specific):
  - "phishing" → "phishing" (accepted IT loanword)
  - "email" → "email" or "posta elettronika"
  - "password" → "password" or "kelma sigrieta"
  - "security" → "sigurtà"
  - "training" → "taħriġ"
  - "download" → "niżżel" (verb) or "download" (IT loanword)
  - "link" → "link" or "ħolqa"
  - Maltese uses Latin script with special characters: ċ, ġ, għ, ħ, ie, ż — ensure proper character usage.
    ❌ "c" when meaning "ċ" → ✅ Always use the correct diacritical marks.
  - Maltese is Semitic (Arabic-based) with heavy Italian/English influence. IT terminology often uses English loanwords directly.
  - Maltese has a unique mix of Semitic root-and-pattern morphology with Romance vocabulary — maintain natural phrasing.
  - Use formal register in professional content.
  - Follow Kunsill Nazzjonali tal-Ilsien Malti spelling norms.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ga: `
### 🇮🇪 Irish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Aire!", "Bí cúramach!", "Bí airdeallach!", "Ná bí meallta!", "Seachain!"
  - FORBIDDEN: "Maith thú!", "Ar fheabhas!", "Iontach!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Le do thoil, seiceáil", "Deimhnigh", "Fíoraigh sula gcliceálann tú", "Le do thoil, deimhnigh"
For praise/completion: "Comhghairdeas!", "Críochnaíodh an oiliúint go rathúil.", "Críochnaíodh go rathúil."

📝 TERMINOLOGY & NATURALNESS (Irish-specific):
  - "phishing" → "phishing" (accepted IT loanword) or "bradaíl" (emerging native term)
  - "email" → "ríomhphost"
  - "password" → "pasfhocal"
  - "security" → "slándáil"
  - "training" → "oiliúint"
  - "download" → "íoslódáil"
  - "link" → "nasc"
  - Irish (Gaeilge) is a VSO language — verb-first word order is mandatory:
    ❌ "Tú seiceáil an nasc" (SVO calque) → ✅ "Seiceáil an nasc" (VSO)
  - Irish uses initial mutations (séimhiú/lenition, urú/eclipsis) — ensure grammatically correct mutations after particles, prepositions, and possessives.
    ❌ "do pasfhocal" → ✅ "do phasfhocal" (lenition after "do")
  - Use An Caighdeán Oifigiúil (Official Standard) — avoid dialectal forms (Munster, Connacht, Ulster) unless specifically requested.
  - Irish has a formal/literary register — use "sibh" (plural/formal) rather than "tú" where appropriate in professional content.
  - Irish uses a fada (síneadh fada) accent — NEVER omit: "á é í ó ú" are different letters from "a e i o u".

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  lb: `
### 🇱🇺 Luxembourgish Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Opgepasst!", "Sidd virsiichteg!", "Opmoerksam sinn!", "Loosst Iech net feieren!", "Denkt drun!"
  - FORBIDDEN: "Bravo!", "Gutt gemaach!", "Super!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Iwwerpréift w.e.g.", "Confirméiert", "Préift virum Klicken", "W.e.g. confirméiert"
For praise/completion: "Felicitatiounen!", "D'Formatioun gouf erfollegräich ofgeschloss.", "Erfollegräich ofgeschloss."

📝 TERMINOLOGY & NATURALNESS (Luxembourgish-specific):
  - "phishing" → "Phishing" (accepted IT loanword)
  - "email" → "E-Mail" (standard) or "Mail"
  - "password" → "Passwuert"
  - "security" → "Sécherheet"
  - "training" → "Formatioun"
  - "download" → "eroflueden" (native) or "Download" (IT loanword)
  - "link" → "Link" (IT loanword) or "Verweis"
  - CRITICAL: Luxembourgish is distinct from German and French — do NOT simply use German or French:
    ❌ "Sicherheit" (German) → ✅ "Sécherheet" (Luxembourgish)
    ❌ "sécurité" (French) → ✅ "Sécherheet" (Luxembourgish)
    ❌ "Passwort" (German) → ✅ "Passwuert" (Luxembourgish)
  - Luxembourgish uses the "Lëtzebuerger Orthographie" — follow official spelling (e.g., ë for schwa).
  - Luxembourg is trilingual (Luxembourgish/French/German). In corporate contexts, Luxembourgish is used for informal communication; ensure the register matches the professional context.
  - Use formal "Dir" (you-formal) — NEVER "du" in professional content.
  - Luxembourgish abbreviation "w.e.g." = "wann ech gelift" (please).

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  bs: `
### 🇧🇦 Bosnian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Pazi!", "Budite oprezni!", "Na oprezu!", "Nemojte se prevariti!", "Budite svjesni!"
  - FORBIDDEN: "Bravo!", "Svaka čast!", "Odlično!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Molimo provjerite", "Potvrdite", "Verificirajte prije klika", "Molimo potvrdite"
For praise/completion: "Čestitamo!", "Obuka je uspješno završena.", "Uspješno završeno."

📝 TERMINOLOGY & NATURALNESS (Bosnian-specific):
  - "phishing" → "phishing" (accepted IT loanword) or "pecanje podataka" (descriptive native)
  - "email" → "e-pošta" (native) or "email" (IT loanword)
  - "password" → "lozinka"
  - "security" → "sigurnost" or "bezbjednost"
  - "training" → "obuka"
  - "download" → "preuzimanje" (noun) / "preuzeti" (verb)
  - "link" → "poveznica" (native) or "link" (IT loanword)
  - CRITICAL: Bosnian is distinct from Croatian and Serbian. While mutually intelligible, they have specific lexical and orthographic differences:
    ❌ "sigurnost" exclusively (Croatian preference) — Bosnian also uses "bezbjednost"
    ❌ Serbian Cyrillic "безбедност" → ✅ Bosnian Latin "bezbjednost" (note: -je- reflex)
    ❌ Croatian "računalo" (computer) → ✅ Bosnian "računar"
  - Bosnian uses the ijekavian pronunciation reflex: "je"/"ije" (not "e" as in Serbian ekavian):
    ❌ "bezbednost" (Serbian ekavian) → ✅ "bezbjednost" (Bosnian ijekavian)
    ❌ "proveriti" (Serbian) → ✅ "provjeriti" (Bosnian)
  - Bosnian uses Latin script by default — use Cyrillic ONLY if explicitly requested.
  - Bosnian may include Turkish-origin words more frequently than Croatian/Serbian — this is natural and should not be "corrected."
  - Use formal register "Vi" — NEVER "ti" in professional content.

🛡️ CONTAMINATION SHIELD (Bosnian has unique vocabulary — avoid pure Serbian or Croatian forms):
  | Context | Bosnian preferred |
  | "security" | sigurnost (shared) |
  | "training" | obuka (shared) |
  | "correct/true" | tačno (NOT Croatian točno) |
  | "settings" | postavke |
  | "account" | račun or korisnički nalog |
  | "thousand separator" | use dot (1.000) not comma |
  Use Latin script by default. Bosnian accepts both Latin and Cyrillic but Latin is standard in corporate/IT.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  zu: `
### 🇿🇦 Zulu Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Qaphela!", "Vuka!", "Hlala uvukile!", "Yima ngomumo!"
  - FORBIDDEN: "Halala!", "Wenze kahle!", "Siyakuhalalisela!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Sicela uqinisekise", "Hlola ngaphambi kokuqhubeka", "Bheka ngokucophelela", "Qinisekisa ulwazi"
For praise/completion: "Siyakuhalalisela ngokuphumelela.", "Uqeqesho luphothulwe ngempumelelo.", "Kuhle kakhulu."

📝 TERMINOLOGY & NATURALNESS (Zulu-specific):
  - "phishing" → "ukudoba kolwazi" (descriptive native) or "i-phishing" (adapted loanword with prefix)
  - "email" → "i-imeyili"
  - "password" → "iphasiwedi" or "izwi eliyimfihlo"
  - "security" → "ukuvikeleka" or "ezokuphepha"
  - "training" → "uqeqesho"
  - "download" → "ukhuphela" (verb) / "ukukhuphela" (noun)
  - "link" → "isixhumanisi"
  - CRITICAL: Zulu is a Bantu language with a noun class system. Loanwords MUST take appropriate noun class prefixes:
    ❌ "phishing email" → ✅ "i-imeyili yokudoba" (class 9 prefix)
    ❌ "security training" → ✅ "uqeqesho lwezokuphepha" (class 11 possessive concord)
  - Zulu has click consonants (c, q, x) — preserve them accurately in all terminology.
  - Use formal/respectful register — NEVER use casual/slang forms in professional content.
  - Tone marks are generally not written in standard Zulu orthography — do not add them.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  xh: `
### 🇿🇦 Xhosa Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Lumka!", "Phaphama!", "Hlala uphaphile!", "Yima ngomumo!"
  - FORBIDDEN: "Halala!", "Wenze kakuhle!", "Uyincutshe!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Nceda uqinisekise", "Khangela ngaphambi kokuqhubeka", "Hlola ngononophelo", "Qinisekisa ngaphambi kokuba ucofe"
For praise/completion: "Siyakuvuyela ngempumelelo.", "Uqeqesho lugqityiwe ngempumelelo.", "Kuhle kakhulu."

📝 TERMINOLOGY & NATURALNESS (Xhosa-specific):
  - "phishing" → "ukudoba kolwazi" (descriptive native) or "i-phishing" (adapted loanword with prefix)
  - "email" → "i-imeyile"
  - "password" → "iphasiwedi" or "igama lokugqithisa"
  - "security" → "ukhuseleko"
  - "training" → "uqeqesho"
  - "download" → "ukukhuphela"
  - "link" → "isiqhagamshelanisi" or "ikhonkco"
  - CRITICAL: Xhosa is a Bantu language with a noun class system. Loanwords MUST take appropriate noun class prefixes:
    ❌ "security policy" → ✅ "umgaqo-nkqubo wokhuseleko" (correct class agreement)
  - Xhosa has click consonants (c, q, x) — preserve them accurately. Do NOT substitute with non-click sounds.
  - Xhosa is distinct from Zulu despite similarities. Do not interchange vocabulary:
    ❌ Zulu "ukuvikeleka" → ✅ Xhosa "ukhuseleko" (security)
    ❌ Zulu "isixhumanisi" → ✅ Xhosa "isiqhagamshelanisi" (link)
  - Use formal register — NEVER use casual forms in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  yo: `
### 🇳🇬 Yoruba Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Ṣọ́ra!", "Farabalẹ̀!", "Má ṣe jẹ́ kí wọ́n tàn ọ́!", "Gbọ́ra!"
  - FORBIDDEN: "Ó dára!", "Ẹ kú oríire!", "O ṣe dáadáa!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Jọ̀wọ́ ṣàyẹ̀wò", "Rí i dájú ṣáájú kí o tó tẹ̀", "Ṣàyẹ̀wò dáadáa", "Ṣe ìdánilójú"
For praise/completion: "Ẹ kú iṣẹ́ dáadáa.", "Ìdánilẹ́kọ̀ọ́ ti parí ní àṣeyọrí.", "Ó dára púpọ̀."

📝 TERMINOLOGY & NATURALNESS (Yoruba-specific):
  - "phishing" → "ìfisẹ̀kẹ́lẹ̀ olè ayelujára" (descriptive native) or "phishing" (IT loanword)
  - "email" → "ìmeèlì" or "lẹ́tà ayelujára"
  - "password" → "ọ̀rọ̀ aṣínà"
  - "security" → "ààbò" or "ìdáàbòbò"
  - "training" → "ìdánilẹ́kọ̀ọ́"
  - "download" → "ìgbasílẹ̀" (noun) / "gba sílẹ̀" (verb)
  - "link" → "ìtọ́kasí" or "àsopọ̀"
  - CRITICAL: Yoruba is a tonal language. Tone marks (àáā, èéē, ìíī, òóō, ùúū) and sub-dots (ẹ, ọ, ṣ) are MANDATORY for correct meaning:
    ❌ "owo" (ambiguous) → ✅ "owó" (money) vs "ọwọ́" (hand)
  - Always include tone marks and sub-dots — omitting them causes ambiguity.
  - Use formal/respectful register with "Ẹ" (plural you) — NEVER "ìwọ" in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ha: `
### 🇳🇬 Hausa Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "A hankali!", "Ku taka tsantsan!", "Ku lura!", "Ku yi hankali!"
  - FORBIDDEN: "Madalla!", "An yi kyau!", "Yaudda!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Don Allah ku tabbatar", "Ku duba kafin ku ci gaba", "Ku bincika daidai", "Ku tabbatar da sahihanci"
For praise/completion: "Mun taya ku murna.", "An kammala horo da nasara.", "Kyakkyawan aiki."

📝 TERMINOLOGY & NATURALNESS (Hausa-specific):
  - "phishing" → "yaudara ta yanar gizo" (descriptive native) or "phishing" (IT loanword)
  - "email" → "imel" or "saƙon yanar gizo"
  - "password" → "kalmar sirri"
  - "security" → "tsaro"
  - "training" → "horo" or "horaswa"
  - "download" → "sauke" (verb) / "saukarwa" (noun)
  - "link" → "hanyar haɗi" or "link" (IT loanword)
  - CRITICAL: Hausa uses Latin script (Boko) as standard — NEVER use Ajami (Arabic) script unless explicitly requested.
  - Hausa has special characters: ɓ, ɗ, ƙ, ƴ — these MUST be preserved correctly:
    ❌ "dan" → ✅ "ɗan" (son/child)
    ❌ "kasa" → ✅ "ƙasa" (country)
  - Hausa is a tonal language but tone marks are typically not written in standard text — do not add them.
  - Use formal register — NEVER use casual/street Hausa in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ig: `
### 🇳🇬 Igbo Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Kpachara anya!", "Nọrọ na nche!", "Lezienụ anya!", "Anya nti!"
  - FORBIDDEN: "Ọ dị mma!", "I mere nke ọma!", "Daalu!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Biko nyochaa", "Gbaa mbọ ịchọpụta tupu ị pịa", "Nyochaa nke ọma", "Hụ na ị chọpụtara"
For praise/completion: "Anyị na-ekele gị.", "Ọzụzụ ahụ agwụla nke ọma.", "Ọ dị mma nke ukwuu."

📝 TERMINOLOGY & NATURALNESS (Igbo-specific):
  - "phishing" → "aghụghọ ịntanetị" (descriptive native) or "phishing" (IT loanword)
  - "email" → "ozi-e" or "email" (IT loanword)
  - "password" → "okwuntụgharị" or "paswọọdụ" (adapted loanword)
  - "security" → "nchekwa" or "nchedo"
  - "training" → "ọzụzụ"
  - "download" → "budata" (verb/noun)
  - "link" → "njikọ" or "lịnkị" (adapted loanword)
  - CRITICAL: Igbo uses tone to distinguish meaning. Tone marks should be included where they prevent ambiguity:
    ❌ "akwụkwọ" (book) vs "akwụkwọ" (leaf) — tone marks clarify
  - Igbo has special characters with diacritics: ị, ọ, ụ, ṅ — these MUST be preserved:
    ❌ "Intaneti" → ✅ "Ịntanetị"
  - Use formal/respectful register — NEVER use dialectal Igbo in professional content.
  - Standard Igbo (based on central dialects) should be used for enterprise content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  so: `
### 🇸🇴 Somali Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Feejignow!", "Digtoonaaw!", "Iska ilaali!", "Ha ku khaldamin!"
  - FORBIDDEN: "Aad baad u mahadsantahay!", "Waa hagaag!", "Wanaag!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Fadlan xaqiiji", "Ka hor inta aadan gujin, xaqiiji", "Si taxadar leh eeg", "Hubso ka hor"
For praise/completion: "Hambalyo.", "Tababarku si guul leh ayuu u dhammaadey.", "Waxaad si wanaagsan u dhammaysay."

📝 TERMINOLOGY & NATURALNESS (Somali-specific):
  - "phishing" → "khiyaanada internetka" (descriptive native) or "phishing" (IT loanword)
  - "email" → "iimeyl" or "fariinta elektaroonigga"
  - "password" → "furaha sirta ah" or "erayga sirta ah"
  - "security" → "amniga" or "badbaadada"
  - "training" → "tababar"
  - "download" → "soo dejiso" (verb) / "soo dejinta" (noun)
  - "link" → "isku xirka" or "link" (IT loanword)
  - CRITICAL: Somali uses Latin script (since 1972 official orthography) — NEVER use Osmanya or Arabic script.
  - Somali has unique letters and combinations: dh, kh, sh, x (voiceless pharyngeal) — preserve them correctly:
    ❌ "h" for pharyngeal → ✅ "x" (Somali pharyngeal fricative)
  - Long vowels are written as double vowels (aa, ee, ii, oo, uu) — preserve them:
    ❌ "tababar" vs ✅ "tababar" — vowel length matters for meaning.
  - Use formal register — NEVER use clan-specific dialect in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  rw: `
### 🇷🇼 Kinyarwanda Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Mwirinde!", "Mube maso!", "Ntimugwe mu mutego!", "Mukomeze!"
  - FORBIDDEN: "Mwiza cyane!", "Byiza!", "Ni byiza pe!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Murasabwa gusuzuma", "Mubanze musuzume mbere yo gukanda", "Musuzume neza", "Mwemeze mbere"
For praise/completion: "Turabashimiye.", "Amahugurwa yarangiye neza.", "Mwabikoze neza cyane."

📝 TERMINOLOGY & NATURALNESS (Kinyarwanda-specific):
  - "phishing" → "uburiganya bwa interineti" (descriptive native) or "phishing" (IT loanword)
  - "email" → "imeri" or "ubutumwa bwa elegitoroniki"
  - "password" → "ijambo ry'ibanga" or "ijambo ryibanga"
  - "security" → "umutekano" or "umwuga wo kwirinda"
  - "training" → "amahugurwa"
  - "download" → "gukurura" (verb) / "ukukurura" (noun)
  - "link" → "ihuza" or "link" (IT loanword)
  - CRITICAL: Kinyarwanda is a Bantu language with a noun class system. Noun class prefixes and agreements are MANDATORY:
    ❌ "training good" → ✅ "amahugurwa meza" (class 6 agreement)
  - Kinyarwanda is tonal but tone is not written in standard orthography — do not add tone marks.
  - Kinyarwanda is distinct from Kirundi despite mutual intelligibility — do not interchange terminology:
    ❌ Kirundi "inyigisho" → ✅ Kinyarwanda "amahugurwa" (training)
  - Use formal register — NEVER use informal/colloquial forms in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  sn: `
### 🇿🇼 Shona Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Chenjera!", "Ngwarira!", "Usanyeperwe!", "Gara wakangwarira!"
  - FORBIDDEN: "Waita zvakanaka!", "Zvakanaka!", "Makorokoto!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Tapota ongoroai", "Simbisai musati mabaya", "Tarisai zvakanaka", "Simbisai mashoko"
For praise/completion: "Tinokutendai.", "Kudzidziswa kwapera zvakanaka.", "Mabasa akanaka kwazvo."

📝 TERMINOLOGY & NATURALNESS (Shona-specific):
  - "phishing" → "unyengeri hwepaIndaneti" (descriptive native) or "phishing" (IT loanword)
  - "email" → "tsamba yepamhepo" or "email" (IT loanword)
  - "password" → "shoko rekuvhura" or "pasiwedhi" (adapted loanword)
  - "security" → "kuchengetedzeka"
  - "training" → "kudzidziswa" or "hurukuro yekudzidzisa"
  - "download" → "kudhaunirodha" (adapted) or "kutora kubva paIndaneti"
  - "link" → "chisungo" or "link" (IT loanword)
  - CRITICAL: Shona is a Bantu language with a noun class system. Noun class prefixes MUST be correct:
    ❌ "security training" → ✅ "kudzidziswa kwekuchengetedzeka" (correct class agreement)
  - Shona has tone distinctions but standard orthography does not mark tone — do not add tone marks.
  - Shona is distinct from Ndebele (also spoken in Zimbabwe) — do not interchange:
    ❌ Ndebele "ukuvikeleka" → ✅ Shona "kuchengetedzeka" (security)
  - Use formal register — NEVER use colloquial "town Shona" (slang mixture) in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ky: `
### 🇰🇬 Kyrgyz Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Сак болуңуз!", "Көз ачык болуңуз!", "Этият болуңуз!", "Абайлаңыз!"
  - FORBIDDEN: "Жарайсыз!", "Мыкты!", "Баракелде!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Сураныч, текшериңиз", "Баскандан мурун ырастаңыз", "Кылдат карап чыгыңыз", "Маалыматты ырастаңыз"
For praise/completion: "Куттуктайбыз.", "Окутуу ийгиликтүү аяктады.", "Абдан жакшы аткарылды."

📝 TERMINOLOGY & NATURALNESS (Kyrgyz-specific):
  - "phishing" → "фишинг" (transliteration) or "маалымат уурдоо" (descriptive native)
  - "email" → "электрондук почта" or "э-почта"
  - "password" → "сырсөз"
  - "security" → "коопсуздук"
  - "training" → "окутуу"
  - "download" → "жүктөө"
  - "link" → "шилтеме"
  - CRITICAL: Kyrgyz uses Cyrillic script — NEVER use Latin script unless explicitly requested.
  - Kyrgyz is a Turkic language but distinct from Turkish, Kazakh, and Uzbek. Do NOT interchange:
    ❌ Turkish "güvenlik" → ✅ Kyrgyz "коопсуздук" (security)
    ❌ Kazakh "құпиясөз" → ✅ Kyrgyz "сырсөз" (password)
  - Kyrgyz has vowel harmony — respect it when adapting loanwords.
  - Use formal register with "Сиз" — NEVER "сен" in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  tk: `
### 🇹🇲 Turkmen Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Seresap boluň!", "Gözüňizi açyň!", "Ünsli boluň!", "Howatyr etmäň!"
  - FORBIDDEN: "Berekella!", "Gowy!", "Örän gowy!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Haýyş, barlaň", "Basmakdan öň tassyklaň", "Ünsli gözden geçiriň", "Maglumaty tassyklaň"
For praise/completion: "Gutlaýarys.", "Okuw üstünlikli tamamlandy.", "Örän gowy ýerine ýetirildi."

📝 TERMINOLOGY & NATURALNESS (Turkmen-specific):
  - "phishing" → "fişing" (adapted loanword) or "maglumat ogurlygy" (descriptive native)
  - "email" → "elektron poçta" or "e-poçta"
  - "password" → "açar söz" or "parol"
  - "security" → "howpsuzlyk"
  - "training" → "okuw"
  - "download" → "ýüklemek" (verb) / "ýükleme" (noun)
  - "link" → "baglanyşyk" or "salgylanma"
  - CRITICAL: Turkmen uses Latin script (since 1993) — NEVER use Cyrillic unless explicitly requested.
  - Turkmen is a Turkic language but distinct from Turkish, Azerbaijani, and Uzbek. Do NOT interchange:
    ❌ Turkish "güvenlik" → ✅ Turkmen "howpsuzlyk" (security)
    ❌ Turkish "bağlantı" → ✅ Turkmen "baglanyşyk" (link)
  - Turkmen has special characters: ä, ç, ň, ö, ş, ü, ý, ž — these MUST be preserved correctly.
  - Turkmen has vowel harmony — respect it in all constructions.
  - Use formal register with "Siz" — NEVER "sen" in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  tg: `
### 🇹🇯 Tajik Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Ҳушёр бошед!", "Зинҳор бошед!", "Эҳтиёт шавед!", "Бедор бошед!"
  - FORBIDDEN: "Офарин!", "Баракалло!", "Хеле хуб!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Лутфан санҷед", "Пеш аз пахш кардан тасдиқ кунед", "Бодиққат тафтиш кунед", "Маълумотро тасдиқ кунед"
For praise/completion: "Табрик.", "Омӯзиш бомуваффақият анҷом ёфт.", "Хеле хуб иҷро шуд."

📝 TERMINOLOGY & NATURALNESS (Tajik-specific):
  - "phishing" → "фишинг" (transliteration) or "фиребгарии интернетӣ" (descriptive native)
  - "email" → "почтаи электронӣ" or "э-почта"
  - "password" → "рамз" or "калимаи рамзӣ"
  - "security" → "амният" or "бехатарӣ"
  - "training" → "омӯзиш" or "тренинг" (IT loanword)
  - "download" → "боргирӣ" (noun) / "боргирӣ кардан" (verb)
  - "link" → "пайванд" or "истинод"
  - CRITICAL: Tajik uses Cyrillic script — NEVER use Latin or Arabic/Persian script unless explicitly requested.
  - Tajik is closely related to Persian/Farsi but has distinct vocabulary and uses Cyrillic. Do NOT interchange:
    ❌ Persian "امنیت" (Arabic script) → ✅ Tajik "амният" (Cyrillic)
    ❌ Persian "رمز عبور" → ✅ Tajik "рамз" or "калимаи рамзӣ"
  - Tajik has specific Cyrillic letters: ғ, ӣ, қ, ӯ, ҳ, ҷ — these MUST be preserved correctly.
  - Tajik uses izofat construction (connecting suffix -и/-ӣ) — maintain proper grammar:
    ❌ "почта электронӣ" → ✅ "почтаи электронӣ" (with izofat)
  - Use formal register with "Шумо" — NEVER "ту" in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  ps: `
### 🇦🇫 Pashto Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "!هوښیار اوسئ", "!پام وکړئ", "!خبردار اوسئ", "!ویښ اوسئ"
  - FORBIDDEN: "!آفرین", "!ډیر ښه", "!شاباش"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "مهرباني وکړئ وګورئ", "د کلیک کولو دمخه تایید کړئ", "په دقت سره وګورئ", "معلومات تایید کړئ"
For praise/completion: ".مبارک مو شه", ".روزنه په بریالیتوب پای ته ورسیده", ".ډیر ښه ترسره شول"

📝 TERMINOLOGY & NATURALNESS (Pashto-specific):
  - "phishing" → "فشینګ" (transliteration) or "د انټرنیټ درغلي" (descriptive native)
  - "email" → "بریښنالیک"
  - "password" → "پټ نوم" or "رمز"
  - "security" → "امنیت" or "خوندیتوب"
  - "training" → "روزنه"
  - "download" → "ښکته کول"
  - "link" → "لینک" or "تړنه"
  - CRITICAL: Pashto is RTL (right-to-left) and uses the Pashto script (modified Arabic script with extra letters).
  - Pashto has unique letters not found in Arabic or Persian: ټ, ډ, ړ, ږ, ښ, ڼ, ء — these MUST be preserved:
    ❌ Arabic "ط" for Pashto "ټ" — these are different letters with different sounds.
  - Pashto is distinct from Dari/Farsi. Do NOT interchange vocabulary:
    ❌ Dari "آموزش" → ✅ Pashto "روزنه" (training)
    ❌ Dari "دانلود" → ✅ Pashto "ښکته کول" (download)
  - Use formal register — NEVER use informal/colloquial Pashto in professional content.
  - Respect Pashto sentence structure (SOV) — do not impose English word order.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  mi: `
### 🇳🇿 Maori Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Kia tūpato!", "Kia mataara!", "Tiakina koe!", "Kia mōhio!"
  - FORBIDDEN: "Ka pai!", "Tino pai!", "Ka rawe!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Tēnā tirohia", "Whakatauria i mua i te pāwhiri", "Āta tirohia", "Whakamana i ngā mōhiohio"
For praise/completion: "Ngā mihi.", "Kua oti pai te whakangungu.", "He mahi tino pai."

📝 TERMINOLOGY & NATURALNESS (Māori-specific):
  - "phishing" → "hī-māhanga ā-ipurangi" (descriptive native) or "phishing" (IT loanword)
  - "email" → "īmēra"
  - "password" → "kupuhipa"
  - "security" → "haumarutanga"
  - "training" → "whakangungu"
  - "download" → "tikiake"
  - "link" → "hononga"
  - CRITICAL: Macrons (tohutō) are MANDATORY in te reo Māori. They distinguish meaning and pronunciation:
    ❌ "Maori" → ✅ "Māori"
    ❌ "ata" (shadow) → ✅ "āta" (carefully) — different words
    ❌ "keke" (cake) → ✅ "kēkē" — vowel length matters
  - All long vowels MUST carry macrons: ā, ē, ī, ō, ū.
  - Māori uses a limited consonant set (h, k, m, n, ng, p, r, t, w, wh) — do not introduce foreign consonants in native words.
  - Use respectful register appropriate for professional/corporate context.
  - When using loanwords, adapt them to Māori phonology where established terms exist.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  jv: `
### 🇮🇩 Javanese Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Ati-ati!", "Sing waspada!", "Aja gampang ketipu!", "Awas!"
  - FORBIDDEN: "Apik!", "Pinter!", "Sip!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Mangga dipunpriksa", "Dipunpastekaken rumiyin saderengipun ngeklik", "Dipuntliti kanthi permati", "Pastiaken informasi"
For praise/completion: "Sugeng.", "Pelatihan sampun kasil dipunrampungaken.", "Sampun katindakaken kanthi sae."

📝 TERMINOLOGY & NATURALNESS (Javanese-specific):
  - "phishing" → "phishing" (IT loanword) or "penipuan internet" (descriptive, Indonesian-influenced)
  - "email" → "email" or "serat elektronik" (formal native)
  - "password" → "sandi" or "tembung sandi"
  - "security" → "keamanan" or "kaslametan"
  - "training" → "pelatihan" or "gladhen"
  - "download" → "unduh" (Indonesian-influenced) or "ngundhuh"
  - "link" → "tautan" or "pranala"
  - CRITICAL: Javanese uses Latin script for modern/digital content — NEVER use Javanese script (Aksara Jawa/Hanacaraka) unless explicitly requested.
  - Javanese has speech levels (ngoko, madya, krama). Use KRAMA (formal/high) for enterprise content:
    ❌ Ngoko "iki" (this) → ✅ Krama "menika" or "punika"
    ❌ Ngoko "apa" (what) → ✅ Krama "menapa" or "punapa"
  - Javanese is distinct from Indonesian/Malay — do not substitute Indonesian vocabulary:
    ❌ Indonesian "keamanan siber" → ✅ Javanese Krama "kaslametan ing internet"
  - Use Krama (formal) register consistently — NEVER mix ngoko (informal) in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  tt: `
### 🇷🇺 Tatar Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: "Сак булыгыз!", "Күзегез ачык булсын!", "Игътибар итегез!", "Саклыкта булыгыз!"
  - FORBIDDEN: "Бик яхшы!", "Афәрин!", "Булдыгыз!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Зинһар тикшерегез", "Баскыч алдыннан раслагыз", "Игътибар белән карагыз", "Мәгълүматны раслагыз"
For praise/completion: "Котлыйбыз.", "Укыту уңышлы тәмамланды.", "Бик яхшы үтәлде."

📝 TERMINOLOGY & NATURALNESS (Tatar-specific):
  - "phishing" → "фишинг" (transliteration) or "интернет алдавы" (descriptive native)
  - "email" → "электрон почта" or "э-почта"
  - "password" → "серсүз"
  - "security" → "куркынычсызлык" or "иминлек"
  - "training" → "укыту" or "күнекмә"
  - "download" → "йөкләү"
  - "link" → "сылтама"
  - CRITICAL: Tatar uses Cyrillic script in the Russian Federation — NEVER use Latin script unless explicitly requested.
  - Tatar is a Turkic language but distinct from Turkish, Kazakh, and Bashkir. Do NOT interchange:
    ❌ Turkish "güvenlik" → ✅ Tatar "куркынычсызлык" (security)
    ❌ Kazakh "құпиясөз" → ✅ Tatar "серсүз" (password)
    ❌ Bashkir "һүҙ" → ✅ Tatar "сүз" (word)
  - Tatar Cyrillic has unique letters: ә, ө, ү, җ, ң, ҳ — these MUST be preserved correctly.
  - Tatar has vowel harmony — respect it in all word forms and suffixes.
  - Use formal register with "Сез" — NEVER "син" in professional content.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  generic: `
### 🌐 Generic Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
These phrases MUST NEVER appear in output, regardless of context or instruction:
  - FORBIDDEN: Any patronizing, sloganistic, or fear-based alerts
  - FORBIDDEN: Childish praise or teacherly tone phrases
  - FORBIDDEN: Empty exhortations without actionable content

🚨 CRITICAL ENFORCEMENT:
If your draft contains patronizing, fear-based, or sloganistic language:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Verify", "Check carefully", "Review before proceeding", "Confirm"
For praise/completion: "Congratulations", "Well done", "Successfully completed"

📝 UNIVERSAL LOCALIZATION QUALITY RULES:
  1. TERMINOLOGY: For each technical concept (email, password, security, phishing, download, login, click, link, training), use the term that native speakers of the target language naturally use in a professional IT/corporate context. Once chosen, use it identically in every screen/scene.
  2. NO LANGUAGE MIXING: Never combine English and target-language words in the same phrase or title. If you use a loanword (e.g., "phishing"), apply target-language grammar to the surrounding sentence.
  3. WORD ORDER: Use the target language's natural word order, not English SVO pattern. Many languages have different adjective/noun or genitive orders.
  4. TONE: Professional but conversational — write for adult corporate employees, not academics or students. Avoid bureaucratic or overly formal phrasing. If a simpler phrase conveys the same meaning, use it.
  5. UI TEXT: Use direct actions, not "Click to..." patterns. Prefer "Start training" over "Click to start training".
  6. COMPOUND WORDS: If the target language supports compound nouns, keep them short and natural. Break long compounds into shorter prepositional phrases if they sound artificial.

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Maintain professional, adult, motivational tone.
- Avoid exaggerated praise, teacherly tone, or fear-based language.
- Focus on clarity, respect, and cultural neutrality.
`.trim(),
};

const memo = new Map<LangKey, string>();

export function getLanguagePrompt(langCode: string): string {
  const key = normLang(langCode);
  if (memo.has(key)) return memo.get(key) as string;
  const out = RULES_BY_LANG[key] || RULES_BY_LANG.generic;
  memo.set(key, out);
  return out;
}

// --- 2b) Highlight examples per language (for scene1 generation) ---

interface HighlightExamples {
  risk: string;
  action: string;
  outcome: string;
}

const HIGHLIGHT_EXAMPLES: Partial<Record<LangKey, HighlightExamples>> = {
  en: {
    risk: 'Know that phishing targets payment requests',
    action: 'Remember that verification prevents fraud',
    outcome: 'See how safe habits protect your team',
  },
  tr: {
    risk: 'Sahte havale talepleri finansal kayba yol açar',
    action: 'Çift doğrulama sahte talepleri engeller',
    outcome: 'Güvenli alışkanlıklar şirket varlıklarını korur',
  },
  de: {
    risk: 'Schwache Passwörter gefährden Unternehmensdaten',
    action: 'Verifizierung verhindert betrügerische Überweisungen',
    outcome: 'Sichere Gewohnheiten schützen Ihr Unternehmen',
  },
  fr: {
    risk: 'Les faux virements causent des pertes financières',
    action: 'La double vérification bloque les fraudes',
    outcome: 'Les bonnes pratiques protègent votre entreprise',
  },
  es: {
    risk: 'Las transferencias falsas causan pérdidas financieras',
    action: 'La verificación doble detiene el fraude',
    outcome: 'Los buenos hábitos protegen a la organización',
  },
  pt: {
    risk: 'Transferências falsas causam perdas financeiras',
    action: 'Verificação dupla impede fraudes',
    outcome: 'Bons hábitos protegem a organização',
  },
  it: {
    risk: 'Le richieste fraudolente causano perdite finanziarie',
    action: 'La verifica a doppio passaggio blocca le frodi',
    outcome: 'Le buone abitudini proteggono l\'azienda',
  },
  nl: {
    risk: 'Valse overboekingen veroorzaken financieel verlies',
    action: 'Dubbele verificatie voorkomt fraude',
    outcome: 'Veilige gewoonten beschermen de organisatie',
  },
  da: {
    risk: 'Falske overførsler forårsager økonomisk tab',
    action: 'Dobbelt verifikation forhindrer svindel',
    outcome: 'Gode vaner beskytter organisationen',
  },
  sv: {
    risk: 'Falska överföringar orsakar ekonomiska förluster',
    action: 'Dubbel verifiering stoppar bedrägerier',
    outcome: 'Säkra vanor skyddar organisationen',
  },
  no: {
    risk: 'Falske overføringer forårsaker økonomisk tap',
    action: 'Dobbel verifisering forhindrer svindel',
    outcome: 'Trygge vaner beskytter organisasjonen',
  },
  pl: {
    risk: 'Fałszywe przelewy powodują straty finansowe',
    action: 'Podwójna weryfikacja zatrzymuje oszustwa',
    outcome: 'Bezpieczne nawyki chronią organizację',
  },
  cs: {
    risk: 'Falešné převody způsobují finanční ztráty',
    action: 'Dvojí ověření zabrání podvodům',
    outcome: 'Bezpečné návyky chrání organizaci',
  },
  ru: {
    risk: 'Поддельные переводы приводят к финансовым потерям',
    action: 'Двойная проверка предотвращает мошенничество',
    outcome: 'Безопасные привычки защищают организацию',
  },
  ar: {
    risk: 'التحويلات المزيفة تسبب خسائر مالية',
    action: 'التحقق المزدوج يمنع الاحتيال',
    outcome: 'العادات الآمنة تحمي المؤسسة',
  },
  zh: {
    risk: '虚假转账导致重大财务损失',
    action: '双重验证可阻止欺诈交易',
    outcome: '安全习惯保护企业资产',
  },
  ja: {
    risk: '偽の送金要求が重大な損失を招く',
    action: '二重確認が不正を防止する',
    outcome: '安全な習慣が組織を守る',
  },
  ko: {
    risk: '허위 송금 요청이 재정 손실을 초래합니다',
    action: '이중 확인이 사기를 방지합니다',
    outcome: '안전한 습관이 조직을 보호합니다',
  },
  hi: {
    risk: 'फर्जी ट्रांसफर से वित्तीय नुकसान होता है',
    action: 'दोहरा सत्यापन धोखाधड़ी रोकता है',
    outcome: 'सुरक्षित आदतें संगठन की रक्षा करती हैं',
  },
  he: {
    risk: 'העברות מזויפות גורמות להפסדים כספיים',
    action: 'אימות כפול מונע הונאות',
    outcome: 'הרגלים בטוחים מגנים על הארגון',
  },
  uk: {
    risk: 'Підроблені перекази призводять до фінансових втрат',
    action: 'Подвійна перевірка запобігає шахрайству',
    outcome: 'Безпечні звички захищають організацію',
  },
  th: {
    risk: 'การโอนเงินปลอมทำให้เกิดความเสียหายทางการเงิน',
    action: 'การตรวจสอบซ้ำป้องกันการฉ้อโกง',
    outcome: 'นิสัยที่ปลอดภัยปกป้ององค์กร',
  },
  vi: {
    risk: 'Chuyển khoản giả gây thiệt hại tài chính',
    action: 'Xác minh kép ngăn chặn gian lận',
    outcome: 'Thói quen an toàn bảo vệ tổ chức',
  },
  id: {
    risk: 'Transfer palsu menyebabkan kerugian finansial',
    action: 'Verifikasi ganda mencegah penipuan',
    outcome: 'Kebiasaan aman melindungi organisasi',
  },
  ms: {
    risk: 'Pemindahan palsu menyebabkan kerugian kewangan',
    action: 'Pengesahan berganda menghalang penipuan',
    outcome: 'Tabiat selamat melindungi organisasi',
  },
  fi: {
    risk: 'Väärät tilisiirrot aiheuttavat taloudellisia tappioita',
    action: 'Kaksinkertainen varmistus estää petokset',
    outcome: 'Turvalliset tavat suojaavat organisaatiota',
  },
  fa: {
    risk: 'انتقال‌های جعلی خسارت مالی ایجاد می‌کنند',
    action: 'تأیید دومرحله‌ای کلاهبرداری را متوقف می‌کند',
    outcome: 'عادت‌های امن از سازمان محافظت می‌کنند',
  },
  el: {
    risk: 'Ψεύτικες μεταφορές προκαλούν οικονομικές απώλειες',
    action: 'Η διπλή επαλήθευση αποτρέπει απάτες',
    outcome: 'Ασφαλείς συνήθειες προστατεύουν τον οργανισμό',
  },
  ro: {
    risk: 'Transferurile false provoacă pierderi financiare',
    action: 'Verificarea dublă previne frauda',
    outcome: 'Obiceiurile sigure protejează organizația',
  },
  hu: {
    risk: 'Hamis utalások pénzügyi veszteséget okoznak',
    action: 'Kettős ellenőrzés megakadályozza a csalást',
    outcome: 'Biztonságos szokások védik a szervezetet',
  },
  sk: {
    risk: 'Falošné prevody spôsobujú finančné straty',
    action: 'Dvojité overenie zabraňuje podvodom',
    outcome: 'Bezpečné návyky chránia organizáciu',
  },
  bn: {
    risk: 'ভুয়া ট্রান্সফার আর্থিক ক্ষতি করে',
    action: 'দ্বৈত যাচাই জালিয়াতি প্রতিরোধ করে',
    outcome: 'নিরাপদ অভ্যাস প্রতিষ্ঠান রক্ষা করে',
  },
  ur: {
    risk: 'جعلی ٹرانسفر مالی نقصان کا سبب بنتے ہیں',
    action: 'دوہری تصدیق دھوکا دہی روکتی ہے',
    outcome: 'محفوظ عادات تنظیم کی حفاظت کرتی ہیں',
  },
  sw: {
    risk: 'Uhawilishaji bandia husababisha hasara za kifedha',
    action: 'Uthibitisho maradufu huzuia ulaghai',
    outcome: 'Tabia salama hulinda shirika',
  },
  ku: {
    risk: 'Veguhestinên sexte ziyanên darayî dikin',
    action: 'Piştrastkirina ducarî xapandinê asteng dike',
    outcome: 'Adetên ewle rêxistinê diparêzin',
  },
  hr: {
    risk: 'Lažni prijenosi uzrokuju financijske gubitke',
    action: 'Dvostruka provjera sprječava prijevare',
    outcome: 'Sigurne navike štite organizaciju',
  },
  sr: {
    risk: 'Лажни преноси изазивају финансијске губитке',
    action: 'Двострука провера спречава преваре',
    outcome: 'Безбедне навике штите организацију',
  },
  bg: {
    risk: 'Фалшивите преводи причиняват финансови загуби',
    action: 'Двойната проверка предотвратява измами',
    outcome: 'Безопасните навици защитават организацията',
  },
  mk: {
    risk: 'Лажните трансфери предизвикуваат финансиски загуби',
    action: 'Двојната проверка спречува измами',
    outcome: 'Безбедните навики ја штитат организацијата',
  },
  sq: {
    risk: 'Transfertat e rreme shkaktojnë humbje financiare',
    action: 'Verifikimi i dyfishtë parandalon mashtrimin',
    outcome: 'Zakonet e sigurta mbrojnë organizatën',
  },
  is: {
    risk: 'Falskar millifærslur valda fjárhagslegu tapi',
    action: 'Tvöföld staðfesting kemur í veg fyrir svik',
    outcome: 'Örugg venja verndar fyrirtækið',
  },
  cy: {
    risk: 'Mae trosglwyddiadau ffug yn achosi colledion ariannol',
    action: 'Mae gwirio dwbl yn atal twyll',
    outcome: 'Mae arferion diogel yn amddiffyn y sefydliad',
  },
  tl: {
    risk: 'Ang pekeng paglilipat ay nagdudulot ng pagkalugi',
    action: 'Ang dobleng beripikasyon ay pumipigil sa panloloko',
    outcome: 'Ligtas na gawi ay nagpoprotekta sa organisasyon',
  },
  lt: {
    risk: 'Netikri pervedimai sukelia finansinius nuostolius',
    action: 'Dvigubas patikrinimas užkerta kelią sukčiavimui',
    outcome: 'Saugūs įpročiai apsaugo organizaciją',
  },
  lv: {
    risk: 'Viltoti pārskaitījumi rada finansiālus zaudējumus',
    action: 'Dubulta pārbaude novērš krāpšanu',
    outcome: 'Drošas ieradumi aizsargā organizāciju',
  },
  et: {
    risk: 'Võltsülekanded põhjustavad rahalist kahju',
    action: 'Topeltkontroll hoiab ära pettused',
    outcome: 'Turvalised harjumused kaitsevad organisatsiooni',
  },
  sl: {
    risk: 'Lažna nakazila povzročajo finančne izgube',
    action: 'Dvojno preverjanje preprečuje goljufije',
    outcome: 'Varne navade ščitijo organizacijo',
  },
  az: {
    risk: 'Saxta köçürmələr maliyyə itkisinə səbəb olur',
    action: 'İkili yoxlama dələduzluğun qarşısını alır',
    outcome: 'Təhlükəsiz vərdişlər təşkilatı qoruyur',
  },
  ka: {
    risk: 'ყალბი გადარიცხვები ფინანსურ ზარალს იწვევს',
    action: 'ორმაგი შემოწმება თაღლითობას აღკვეთს',
    outcome: 'უსაფრთხო ჩვევები ორგანიზაციას იცავს',
  },
  af: {
    risk: 'Vals oorplasings veroorsaak finansiële verlies',
    action: 'Dubbele verifikasie voorkom bedrog',
    outcome: 'Veilige gewoontes beskerm die organisasie',
  },
  ca: {
    risk: 'Les transferències falses causen pèrdues financeres',
    action: 'La verificació doble evita els fraus',
    outcome: 'Els bons hàbits protegeixen l\'organització',
  },
  ta: {
    risk: 'போலி பரிவர்த்தனைகள் நிதி இழப்பை ஏற்படுத்தும்',
    action: 'இரட்டை சரிபார்ப்பு மோசடியைத் தடுக்கிறது',
    outcome: 'பாதுகாப்பான பழக்கங்கள் நிறுவனத்தைக் காக்கின்றன',
  },
  te: {
    risk: 'నకిలీ బదిలీలు ఆర్థిక నష్టం కలిగిస్తాయి',
    action: 'ద్వంద్వ ధృవీకరణ మోసాన్ని నిరోధిస్తుంది',
    outcome: 'సురక్షిత అలవాట్లు సంస్థను రక్షిస్తాయి',
  },
  mr: {
    risk: 'बनावट हस्तांतरणामुळे आर्थिक नुकसान होते',
    action: 'दुहेरी पडताळणी फसवणूक रोखते',
    outcome: 'सुरक्षित सवयी संस्थेचे रक्षण करतात',
  },
  gu: {
    risk: 'ખોટા ટ્રાન્સફર નાણાકીય નુકસાન કરે છે',
    action: 'બેવડું ચકાસણી છેતરપિંડી અટકાવે છે',
    outcome: 'સુરક્ષિત ટેવો સંસ્થાનું રક્ષણ કરે છે',
  },
  pa: {
    risk: 'ਜਾਅਲੀ ਟਰਾਂਸਫਰ ਵਿੱਤੀ ਨੁਕਸਾਨ ਕਰਦੇ ਹਨ',
    action: 'ਦੋਹਰੀ ਪੁਸ਼ਟੀ ਧੋਖਾਧੜੀ ਰੋਕਦੀ ਹੈ',
    outcome: 'ਸੁਰੱਖਿਅਤ ਆਦਤਾਂ ਸੰਗਠਨ ਦੀ ਰੱਖਿਆ ਕਰਦੀਆਂ ਹਨ',
  },
  ml: {
    risk: 'വ്യാജ കൈമാറ്റങ്ങൾ സാമ്പത്തിക നഷ്ടമുണ്ടാക്കുന്നു',
    action: 'ഇരട്ട പരിശോധന തട്ടിപ്പ് തടയുന്നു',
    outcome: 'സുരക്ഷിത ശീലങ്ങൾ സ്ഥാപനത്തെ സംരക്ഷിക്കുന്നു',
  },
  ne: {
    risk: 'नक्कली स्थानान्तरणले आर्थिक क्षति गर्छ',
    action: 'दोहोरो प्रमाणीकरणले ठगी रोक्छ',
    outcome: 'सुरक्षित बानीले संस्थाको रक्षा गर्छ',
  },
  si: {
    risk: 'ව්‍යාජ මුදල් හුවමාරු මූල්‍ය පාඩු සිදුකරයි',
    action: 'ද්විත්ව සත්‍යාපනය වංචාව වළක්වයි',
    outcome: 'ආරක්ෂිත පුරුදු සංවිධානය ආරක්ෂා කරයි',
  },
  my: {
    risk: 'အတုငွေလွှဲမှုများ ငွေကြေးဆုံးရှုံးမှုဖြစ်စေသည်',
    action: 'နှစ်ထပ်အတည်ပြုခြင်းက လိမ်လည်မှုကိုတားဆီးသည်',
    outcome: 'လုံခြုံသောအလေ့အကျင့်များ အဖွဲ့အစည်းကိုကာကွယ်သည်',
  },
  km: {
    risk: 'ការផ្ទេរក្លែងក្លាយបង្កការខាតបង់ហិរញ្ញវត្ថុ',
    action: 'ការផ្ទៀងផ្ទាត់ពីរដងការពារការបោកប្រាស់',
    outcome: 'ទម្លាប់សុវត្ថិភាពការពារស្ថាប័ន',
  },
  lo: {
    risk: 'ການໂອນປອมກໍ່ໃຫ້ເກີດການສູນເສຍທາງການເງິນ',
    action: 'ການຢືນຢັນສອງຊັ້ນປ້ອງກັນການສໍ້ໂກງ',
    outcome: 'ນິໄສທີ່ປອດໄພປົກປ້ອງອົງກອນ',
  },
  mn: {
    risk: 'Хуурамч шилжүүлэг санхүүгийн хохирол учруулна',
    action: 'Давхар баталгаажуулалт залилангаас сэргийлнэ',
    outcome: 'Аюулгүй дадал байгууллагыг хамгаална',
  },
  kk: {
    risk: 'Жалған аударымдар қаржылық шығынға әкеледі',
    action: 'Қос тексеру алаяқтықтың алдын алады',
    outcome: 'Қауіпсіз әдеттер ұйымды қорғайды',
  },
  uz: {
    risk: 'Soxta o\'tkazmalar moliyaviy zararga olib keladi',
    action: 'Ikki bosqichli tekshiruv firibgarlikni oldini oladi',
    outcome: 'Xavfsiz odatlar tashkilotni himoya qiladi',
  },
  hy: {
    risk: 'Կեղծ փոխանցումները ֆինանսական վնաս են հասցնում',
    action: 'Կրկնակի ստուգումը կանխում է խաբեությունը',
    outcome: 'Անվտանգ սովորությունները պաշտպանում են կազմակերպությունը',
  },
  am: {
    risk: 'የሐሰት ዝውውሮች የገንዘብ ኪሳራ ያስከትላሉ',
    action: 'ድርብ ማረጋገጫ ማጭበርበርን ይከላከላል',
    outcome: 'ደህንነታቸው የተጠበቁ ልምዶች ድርጅቱን ይጠብቃሉ',
  },
  gl: {
    risk: 'As transferencias falsas causan perdas financeiras',
    action: 'A verificación dobre prevén a fraude',
    outcome: 'Os bos hábitos protexen a organización',
  },
  eu: {
    risk: 'Transferentzia falsuek galera finantzarioak eragiten dituzte',
    action: 'Egiaztapen bikoitzak iruzurra saihesten du',
    outcome: 'Ohitura seguruek erakundea babesten dute',
  },
  mt: {
    risk: 'Trasferimenti foloz jikkawżaw telf finanzjarju',
    action: 'Verifika doppja tipprevjeni l-frodi',
    outcome: 'Drawwiet siguri jipproteġu l-organizzazzjoni',
  },
  ga: {
    risk: 'Is cúis le caillteanais airgeadais aistrithe bréagacha',
    action: 'Cuireann fíorú dúbailte cosc ar chalaois',
    outcome: 'Cosnaíonn nósanna sábháilte an eagraíocht',
  },
  lb: {
    risk: 'Falsch Iwwerweisunge verursaachen finanziell Verloschter',
    action: 'Duebel Verifizéierung verhënnert Betrug',
    outcome: 'Sécher Gewunnechten schützen d\'Organisatioun',
  },
  bs: {
    risk: 'Lažni transferi uzrokuju finansijske gubitke',
    action: 'Dvostruka provjera sprječava prevare',
    outcome: 'Sigurne navike štite organizaciju',
  },
  zu: {
    risk: 'Ukudluliswa okungamanga kubangela ukulahlekelwa yimali',
    action: 'Ukuqinisekisa kabili kuvimbela inkohliso',
    outcome: 'Imikhuba ephephile ivikela inhlangano',
  },
  xh: {
    risk: 'Ukudluliswa kobuxoki kubangela ilahleko yemali',
    action: 'Ukuqinisekisa kabini kuthintela ubuqhetseba',
    outcome: 'Imikhwa ekhuselekileyo ikhusela umbutho',
  },
  yo: {
    risk: 'Gbigbe owo irọ nfa adanu owo',
    action: 'Ijẹrisi ilọpo meji ṣe idiwọ jibiti',
    outcome: 'Awọn aṣa ailewu daabobo ajọ naa',
  },
  ha: {
    risk: 'Canja wurin karya yana haifar da asarar kudi',
    action: 'Tabbatar sau biyu yana hana zamba',
    outcome: 'Halaye masu aminci suna kare kungiya',
  },
  ig: {
    risk: 'Mbufe ego aghụghọ na-ebute mfu ego',
    action: 'Nyocha okpụrụkpụ na-egbochi aghụghọ',
    outcome: 'Omume nchekwa na-echekwa nzukọ',
  },
  so: {
    risk: 'Wareejinta beenta ah waxay keentaa khasaare dhaqaale',
    action: 'Xaqiijinta labanlaab waxay ka hortag khiyaano',
    outcome: 'Caadooyinka badbaadada ah waxay ilaaliyaan ururka',
  },
  rw: {
    risk: 'Kohereza impimbano bitera igihombo cy\'imari',
    action: 'Kugenzura kabiri bibuza uburiganya',
    outcome: 'Imyitwarire yizewe irinda ishyirahamwe',
  },
  sn: {
    risk: 'Kutumira kwenhema kunokonzera kushaikwa kwemari',
    action: 'Kusimbisa kaviri kunodzivisa unyengeri',
    outcome: 'Tsika dzakachengeteka dzinochengetedza sangano',
  },
  ky: {
    risk: 'Жалган которуулар каржылык чыгымга алып келет',
    action: 'Кош текшерүү алдамчылыктын алдын алат',
    outcome: 'Коопсуз адаттар уюмду коргойт',
  },
  tk: {
    risk: 'Galp geçirimler maliýe ýitgisine sebäp bolýar',
    action: 'Goşa barlag aldawçylygyň öňüni alýar',
    outcome: 'Howpsuz endikler guramany goraýar',
  },
  tg: {
    risk: 'Интиқолҳои қалбакӣ зарари молиявӣ меоваранд',
    action: 'Тасдиқи дугона қаллобиро пешгирӣ мекунад',
    outcome: 'Одатҳои бехатар созмонро муҳофизат мекунанд',
  },
  ps: {
    risk: 'جعلي لیږدونه مالي زیان رسوي',
    action: 'دوه ځلي تایید درغلي مخنیوي',
    outcome: 'خوندي عادتونه سازمان ساتي',
  },
  mi: {
    risk: 'Ko ngā whitinga teka ka puta te ngaronga pūtea',
    action: 'Ko te manatoko tārua ka ārai i te tīnihanga',
    outcome: 'Ko ngā tikanga haumaru ka tiaki i te whakahaere',
  },
  jv: {
    risk: 'Transfer palsu nyebabake kerugian finansial',
    action: 'Verifikasi rangkep nyegah penipuan',
    outcome: 'Kebiasaan aman nglindhungi organisasi',
  },
  tt: {
    risk: 'Ялган күчерүләр финанс зыянга китерә',
    action: 'Икеләтә тикшерү алдауны кисәтә',
    outcome: 'Хәвефсез гадәтләр оешманы саклый',
  },
};

/**
 * Get highlight examples for scene 1 intro generation.
 * Returns examples in the target language if available, otherwise English fallback.
 */
export function getHighlightExamples(langCode: string): HighlightExamples {
  const key = normLang(langCode);
  return HIGHLIGHT_EXAMPLES[key] || HIGHLIGHT_EXAMPLES.en || {
    risk: 'Know that phishing targets payment requests',
    action: 'Remember that verification prevents fraud',
    outcome: 'See how safe habits protect your team',
  };
}

// --- 2c) Goal examples per language (for scene2 generation) ---

interface GoalExamples {
  title: string;      // e.g., "Your Phishing Defense"
  subtitle: string;   // Implementation intention pattern
  step1: string;      // Recognize step
  step2: string;      // Verify step
  step3: string;      // Report step
}

const GOAL_EXAMPLES: Partial<Record<LangKey, GoalExamples>> = {
  en: {
    title: 'Your Phishing Defense',
    subtitle: 'Next time you see a suspicious email, you will pause and report it',
    step1: 'Pause and think',
    step2: 'Verify the source',
    step3: 'Report it',
  },
  tr: {
    title: 'Oltalama Savunmanız',
    subtitle: 'Şüpheli bir e-posta gördüğünüzde durup bildireceksiniz',
    step1: 'Durun ve düşünün',
    step2: 'Kaynağı doğrulayın',
    step3: 'Bildirin',
  },
  de: {
    title: 'Ihr Phishing-Schutz',
    subtitle: 'Bei einer verdächtigen E-Mail halten Sie inne und melden sie',
    step1: 'Innehalten und nachdenken',
    step2: 'Quelle überprüfen',
    step3: 'Vorfall melden',
  },
  fr: {
    title: 'Votre défense anti-hameçonnage',
    subtitle: 'Face à un e-mail suspect, vous vous arrêterez et le signalerez',
    step1: 'Marquer une pause et réfléchir',
    step2: 'Vérifier la source',
    step3: 'Signaler l\'incident',
  },
  es: {
    title: 'Tu defensa contra phishing',
    subtitle: 'Ante un correo sospechoso, te detendrás y lo reportarás',
    step1: 'Detente y piensa',
    step2: 'Verifica el origen',
    step3: 'Repórtalo',
  },
  pt: {
    title: 'Sua defesa contra phishing',
    subtitle: 'Ao ver um e-mail suspeito, você vai parar e reportar',
    step1: 'Pare e pense',
    step2: 'Verifique a origem',
    step3: 'Reporte o incidente',
  },
  it: {
    title: 'La tua difesa dal phishing',
    subtitle: 'Di fronte a un\'e-mail sospetta, fermati e segnalala',
    step1: 'Fermati e rifletti',
    step2: 'Verifica la fonte',
    step3: 'Segnala l\'incidente',
  },
  nl: {
    title: 'Uw phishing-bescherming',
    subtitle: 'Bij een verdachte e-mail stopt u en meldt u het',
    step1: 'Stop en denk na',
    step2: 'Controleer de bron',
    step3: 'Meld het incident',
  },
  da: {
    title: 'Dit phishing-forsvar',
    subtitle: 'Når du ser en mistænkelig e-mail, stopper du op og rapporterer',
    step1: 'Stop op og tænk',
    step2: 'Bekræft kilden',
    step3: 'Rapportér det',
  },
  sv: {
    title: 'Ditt nätfiskeskydd',
    subtitle: 'Nästa gång du ser ett misstänkt e-post, stanna upp och rapportera',
    step1: 'Stanna och tänk efter',
    step2: 'Verifiera källan',
    step3: 'Rapportera det',
  },
  no: {
    title: 'Ditt phishing-forsvar',
    subtitle: 'Neste gang du ser en mistenkelig e-post, stopp og rapporter',
    step1: 'Stopp og tenk',
    step2: 'Bekreft kilden',
    step3: 'Rapporter det',
  },
  pl: {
    title: 'Twoja obrona przed phishingiem',
    subtitle: 'Gdy zobaczysz podejrzanego e-maila, zatrzymaj się i zgłoś',
    step1: 'Zatrzymaj się i pomyśl',
    step2: 'Zweryfikuj źródło',
    step3: 'Zgłoś incydent',
  },
  cs: {
    title: 'Vaše obrana proti phishingu',
    subtitle: 'Při podezřelém e-mailu se zastavíte a nahlásíte ho',
    step1: 'Zastavte se a přemýšlejte',
    step2: 'Ověřte zdroj',
    step3: 'Nahlaste incident',
  },
  ru: {
    title: 'Ваша защита от фишинга',
    subtitle: 'Увидев подозрительное письмо, остановитесь и сообщите о нём',
    step1: 'Остановитесь и подумайте',
    step2: 'Проверьте источник',
    step3: 'Сообщите об инциденте',
  },
  ar: {
    title: 'دفاعك ضد التصيّد',
    subtitle: 'عند رؤية بريد مشبوه، توقف وأبلغ عنه',
    step1: 'توقف وفكّر',
    step2: 'تحقق من المصدر',
    step3: 'أبلغ عن الحادثة',
  },
  zh: {
    title: '您的网络钓鱼防线',
    subtitle: '下次看到可疑邮件时，停下来并举报',
    step1: '停下来思考',
    step2: '验证来源',
    step3: '举报事件',
  },
  ja: {
    title: 'フィッシング対策',
    subtitle: '不審なメールを見たら立ち止まって報告する',
    step1: '立ち止まって考える',
    step2: '送信元を確認する',
    step3: '報告する',
  },
  ko: {
    title: '피싱 방어 계획',
    subtitle: '의심스러운 이메일을 보면 멈추고 신고합니다',
    step1: '멈추고 생각하기',
    step2: '출처 확인하기',
    step3: '신고하기',
  },
  hi: {
    title: 'आपकी फ़िशिंग सुरक्षा',
    subtitle: 'संदिग्ध ईमेल दिखने पर रुकें और रिपोर्ट करें',
    step1: 'रुकें और सोचें',
    step2: 'स्रोत सत्यापित करें',
    step3: 'रिपोर्ट करें',
  },
  he: {
    title: 'ההגנה שלך מפישינג',
    subtitle: 'כשתראה מייל חשוד, עצור ודווח עליו',
    step1: 'עצור וחשוב',
    step2: 'אמת את המקור',
    step3: 'דווח על האירוע',
  },
  uk: {
    title: 'Ваш захист від фішингу',
    subtitle: 'Побачивши підозрілий лист, зупиніться і повідомте',
    step1: 'Зупиніться і подумайте',
    step2: 'Перевірте джерело',
    step3: 'Повідомте про інцидент',
  },
  th: {
    title: 'การป้องกันฟิชชิงของคุณ',
    subtitle: 'เมื่อเห็นอีเมลน่าสงสัย หยุดคิดและรายงาน',
    step1: 'หยุดและคิด',
    step2: 'ตรวจสอบแหล่งที่มา',
    step3: 'รายงานเหตุการณ์',
  },
  vi: {
    title: 'Phòng thủ lừa đảo của bạn',
    subtitle: 'Khi thấy email đáng ngờ, hãy dừng lại và báo cáo',
    step1: 'Dừng lại và suy nghĩ',
    step2: 'Xác minh nguồn gốc',
    step3: 'Báo cáo sự cố',
  },
  id: {
    title: 'Pertahanan phishing Anda',
    subtitle: 'Saat melihat email mencurigakan, berhenti dan laporkan',
    step1: 'Berhenti dan pikirkan',
    step2: 'Verifikasi sumbernya',
    step3: 'Laporkan insiden',
  },
  ms: {
    title: 'Pertahanan phishing anda',
    subtitle: 'Apabila melihat e-mel mencurigakan, berhenti dan laporkan',
    step1: 'Berhenti dan fikir',
    step2: 'Sahkan sumber',
    step3: 'Laporkan insiden',
  },
  fi: {
    title: 'Tietojenkalastelun torjuntasi',
    subtitle: 'Kun näet epäilyttävän sähköpostin, pysähdy ja ilmoita',
    step1: 'Pysähdy ja mieti',
    step2: 'Varmista lähde',
    step3: 'Ilmoita tapaus',
  },
};

/**
 * Get goal examples for scene 2 goal generation.
 * Returns examples in the target language if available, otherwise English fallback.
 */
export function getGoalExamples(langCode: string): GoalExamples {
  const key = normLang(langCode);
  return GOAL_EXAMPLES[key] || GOAL_EXAMPLES.en || {
    title: 'Your Phishing Defense',
    subtitle: 'Next time you see a suspicious email, you will pause and report it',
    step1: 'Pause and think',
    step2: 'Verify the source',
    step3: 'Report it',
  };
}

// --- 2d) Nudge examples per language (for scene7 generation) ---

interface NudgeExamples {
  subtitle: string;   // Implementation intention
  recognize: string;  // Step 1
  protect: string;    // Step 2
  verify: string;     // Step 3
}

const NUDGE_EXAMPLES: Partial<Record<LangKey, NudgeExamples>> = {
  en: {
    subtitle: 'Next time a suspicious email appears, you will do this:',
    recognize: 'Recognise a suspicious email',
    protect: 'Don\'t click links or open unknown attachments',
    verify: 'Use the report button',
  },
  tr: {
    subtitle: 'Şüpheli bir e-posta geldiğinde şunu yapacaksınız:',
    recognize: 'Şüpheli e-postayı tanıyın',
    protect: 'Bağlantılara tıklamayın, bilinmeyen ekleri açmayın',
    verify: 'Bildir butonunu kullanın',
  },
  de: {
    subtitle: 'Wenn eine verdächtige E-Mail erscheint, tun Sie Folgendes:',
    recognize: 'Verdächtige E-Mail erkennen',
    protect: 'Keine Links anklicken oder unbekannte Anhänge öffnen',
    verify: 'Melden-Button verwenden',
  },
  fr: {
    subtitle: 'La prochaine fois qu\'un e-mail suspect apparaît, vous ferez ceci :',
    recognize: 'Identifier un e-mail suspect',
    protect: 'Ne cliquez pas sur les liens ni les pièces jointes inconnues',
    verify: 'Utilisez le bouton de signalement',
  },
  es: {
    subtitle: 'La próxima vez que aparezca un correo sospechoso, harás esto:',
    recognize: 'Reconoce un correo sospechoso',
    protect: 'No hagas clic en enlaces ni abras adjuntos desconocidos',
    verify: 'Usa el botón de reporte',
  },
  pt: {
    subtitle: 'Da próxima vez que um e-mail suspeito aparecer, faça isto:',
    recognize: 'Reconheça um e-mail suspeito',
    protect: 'Não clique em links nem abra anexos desconhecidos',
    verify: 'Use o botão de denúncia',
  },
  it: {
    subtitle: 'La prossima volta che appare un\'e-mail sospetta, farai questo:',
    recognize: 'Riconoscere un\'e-mail sospetta',
    protect: 'Non cliccare link né aprire allegati sconosciuti',
    verify: 'Usa il pulsante di segnalazione',
  },
  nl: {
    subtitle: 'De volgende keer dat een verdachte e-mail verschijnt, doet u dit:',
    recognize: 'Herken een verdachte e-mail',
    protect: 'Klik niet op links en open geen onbekende bijlagen',
    verify: 'Gebruik de meldknop',
  },
  da: {
    subtitle: 'Næste gang en mistænkelig e-mail dukker op, gør du dette:',
    recognize: 'Genkend en mistænkelig e-mail',
    protect: 'Klik ikke på links eller åbn ukendte vedhæftninger',
    verify: 'Brug rapporteringsknappen',
  },
  sv: {
    subtitle: 'Nästa gång ett misstänkt e-post dyker upp, gör du så här:',
    recognize: 'Känn igen ett misstänkt e-post',
    protect: 'Klicka inte på länkar eller öppna okända bilagor',
    verify: 'Använd rapporteringsknappen',
  },
  no: {
    subtitle: 'Neste gang en mistenkelig e-post dukker opp, gjør du dette:',
    recognize: 'Gjenkjenn en mistenkelig e-post',
    protect: 'Ikke klikk på lenker eller åpne ukjente vedlegg',
    verify: 'Bruk rapporteringsknappen',
  },
  pl: {
    subtitle: 'Następnym razem, gdy pojawi się podejrzany e-mail, zrobisz to:',
    recognize: 'Rozpoznaj podejrzanego e-maila',
    protect: 'Nie klikaj linków ani nie otwieraj nieznanych załączników',
    verify: 'Użyj przycisku zgłoszenia',
  },
  cs: {
    subtitle: 'Příště, když se objeví podezřelý e-mail, uděláte toto:',
    recognize: 'Rozpoznejte podezřelý e-mail',
    protect: 'Neklikejte na odkazy ani neotevírejte neznámé přílohy',
    verify: 'Použijte tlačítko nahlášení',
  },
  ru: {
    subtitle: 'Когда появится подозрительное письмо, вы сделаете следующее:',
    recognize: 'Распознайте подозрительное письмо',
    protect: 'Не переходите по ссылкам и не открывайте вложения',
    verify: 'Используйте кнопку «Сообщить»',
  },
  ar: {
    subtitle: 'في المرة القادمة التي يظهر فيها بريد مشبوه، ستفعل هذا:',
    recognize: 'تعرّف على البريد المشبوه',
    protect: 'لا تنقر على الروابط أو تفتح مرفقات مجهولة',
    verify: 'استخدم زر الإبلاغ',
  },
  zh: {
    subtitle: '下次出现可疑邮件时，您将这样做：',
    recognize: '识别可疑邮件',
    protect: '不要点击链接或打开未知附件',
    verify: '使用举报按钮',
  },
  ja: {
    subtitle: '次に不審なメールが届いたら、こうしましょう：',
    recognize: '不審なメールを見分ける',
    protect: 'リンクや不明な添付ファイルを開かない',
    verify: '報告ボタンを使う',
  },
  ko: {
    subtitle: '다음에 의심스러운 이메일이 나타나면 이렇게 하세요:',
    recognize: '의심스러운 이메일을 인식하기',
    protect: '링크를 클릭하거나 알 수 없는 첨부파일을 열지 마세요',
    verify: '신고 버튼을 사용하세요',
  },
  hi: {
    subtitle: 'अगली बार संदिग्ध ईमेल आने पर, आप यह करेंगे:',
    recognize: 'संदिग्ध ईमेल को पहचानें',
    protect: 'लिंक पर क्लिक न करें या अज्ञात अटैचमेंट न खोलें',
    verify: 'रिपोर्ट बटन का उपयोग करें',
  },
  he: {
    subtitle: 'בפעם הבאה שיופיע מייל חשוד, תעשה זאת:',
    recognize: 'זהה מייל חשוד',
    protect: 'אל תלחץ על קישורים או תפתח קבצים מצורפים לא מוכרים',
    verify: 'השתמש בכפתור הדיווח',
  },
  uk: {
    subtitle: 'Наступного разу, коли з\'явиться підозрілий лист, зробіть це:',
    recognize: 'Розпізнайте підозрілий лист',
    protect: 'Не натискайте посилання та не відкривайте невідомі вкладення',
    verify: 'Скористайтеся кнопкою «Повідомити»',
  },
  th: {
    subtitle: 'ครั้งต่อไปที่เห็นอีเมลน่าสงสัย คุณจะทำสิ่งนี้:',
    recognize: 'สังเกตอีเมลที่น่าสงสัย',
    protect: 'อย่าคลิกลิงก์หรือเปิดไฟล์แนบที่ไม่รู้จัก',
    verify: 'ใช้ปุ่มรายงาน',
  },
  vi: {
    subtitle: 'Lần sau khi thấy email đáng ngờ, bạn sẽ làm điều này:',
    recognize: 'Nhận biết email đáng ngờ',
    protect: 'Không nhấp vào liên kết hoặc mở tệp đính kèm lạ',
    verify: 'Sử dụng nút báo cáo',
  },
  id: {
    subtitle: 'Lain kali muncul email mencurigakan, Anda akan melakukan ini:',
    recognize: 'Kenali email yang mencurigakan',
    protect: 'Jangan klik tautan atau buka lampiran tidak dikenal',
    verify: 'Gunakan tombol laporkan',
  },
  ms: {
    subtitle: 'Apabila e-mel mencurigakan muncul, anda akan melakukan ini:',
    recognize: 'Kenali e-mel yang mencurigakan',
    protect: 'Jangan klik pautan atau buka lampiran tidak dikenali',
    verify: 'Gunakan butang laporkan',
  },
  fi: {
    subtitle: 'Kun seuraavan kerran näet epäilyttävän sähköpostin, teet näin:',
    recognize: 'Tunnista epäilyttävä sähköposti',
    protect: 'Älä napsauta linkkejä äläkä avaa tuntemattomia liitteitä',
    verify: 'Käytä ilmoituspainiketta',
  },
};

/**
 * Get nudge examples for scene 7 nudge generation.
 * Returns examples in the target language if available, otherwise English fallback.
 */
export function getNudgeExamples(langCode: string): NudgeExamples {
  const key = normLang(langCode);
  return NUDGE_EXAMPLES[key] || NUDGE_EXAMPLES.en || {
    subtitle: 'Next time a suspicious email appears, you will do this:',
    recognize: 'Recognise a suspicious email',
    protect: 'Don\'t click links or open unknown attachments',
    verify: 'Use the report button',
  };
}

// --- 3) Optional glossary injector (hard override for terms) ---
export function buildGlossaryPrompt(glossary: Array<Record<string, string>> = []): string {
  if (!glossary.length) return '';
  return `
### 📚 Terminology Glossary (HARD OVERRIDE)
- Use the target-language equivalents exactly as given below.
${glossary.map((g, i) => `  ${i + 1}. ${JSON.stringify(g)}`).join('\n')}
- If a term is not listed, choose the most common enterprise-security usage in ${'${targetLanguage}'}.
`.trim();
}

// --- 4) Main system prompt builder (n→n localization) ---
export function buildSystemPrompt(opts: {
  topicContext?: string;
  sourceLanguage: string;
  targetLanguage: string;
  extractedLength: number;
  glossary?: Array<Record<string, string>>;
  decodingDiscipline?: boolean;
}): string {
  const {
    topicContext = '',
    sourceLanguage,
    targetLanguage,
    extractedLength,
    glossary = [],
    decodingDiscipline = true,
  } = opts;

  const languagePrompt = typeof getLanguagePrompt === 'function' ? getLanguagePrompt(targetLanguage) : '';

  return `
${topicContext}

${languagePrompt}
${buildGlossaryPrompt(glossary)}

NOTE: Source and target languages may vary widely (any → any).
Always interpret meaning language-agnostically first, then rewrite naturally in ${targetLanguage}.

TASK: Localize JSON values from ${sourceLanguage} to ${targetLanguage} ONLY, producing fluent, culturally natural, native-quality output.

### ⚖️ PRIORITY ORDER (Execution Logic)
1. Faithfulness (meaning & intent)
2. Structure (JSON, HTML, placeholders)
3. Fluency (native, smooth)
4. Tone (within professional bounds)
If conflicts arise, follow this exact order.

---

## 🌍 MULTI-LANGUAGE INTELLIGENCE (n→n LOCALIZATION)
- Handle localization **between any language pair** (${sourceLanguage} → ${targetLanguage}) with equal cultural fluency.
- Respect target-language **grammar, syntax, rhythm, register**.
- Avoid literal carryover; rephrase naturally for ${targetLanguage}.
- When both languages are non-English, never pivot literally; map **semantics**, then rewrite natively.
- Prefer **semantic parity** (meaning & tone) over syntactic parity.
- For gendered languages, use **gender-neutral phrasing** unless context requires otherwise.
- **Terminology consistency**: For each technical concept (email, password, security, download, login, etc.), choose the term a native ${targetLanguage} speaker would naturally use in a professional context. Use that same term consistently throughout ALL localized content. Never alternate between a native term and a foreign loanword for the same concept.

---

## CRITICAL RULES

### 1️⃣ LANGUAGE PURITY (ZERO TOLERANCE)
- Output ONLY in ${targetLanguage}.
- No mixed-language fragments.
- EVERY word in your output MUST be in ${targetLanguage}. If you find ANY word or phrase still in ${sourceLanguage} (or any other non-target language), rewrite it in ${targetLanguage} before returning. A single ${sourceLanguage} word in the output is a critical failure.
- Keep globally standard acronyms/proper nouns as-is when recognized (e.g., "URL", "PDF", "Wi-Fi").
- If no direct equivalent exists, keep the original term and localize surrounding grammar.

### 2️⃣ CONTEXT-AWARE LOCALIZATION (NOT LITERAL)
- Focus on **meaning, tone, and natural phrasing**—not word-for-word mapping.
- Adapt to ${targetLanguage} communication style; avoid robotic or overly formal tone.

**Content Type Guidance**
- **Titles:** Action-oriented, clear, motivating.
- **Warnings/Alerts:** Direct statement → impact → awareness/action.
- **Descriptions:** Verb → what → why (concise purpose/benefit).
- **Actions/Commands:** Simple active verbs, natural imperatives.
- **Informational Text:** Professional, conversational.

### 3️⃣ STRUCTURE PRESERVATION
- Keep JSON keys exactly: "0"…"${extractedLength - 1}".
- Keep HTML tags/attributes unchanged (same count & order).
- Preserve placeholders/variables exactly: "{…}", "{{…}}", "%s", "%d", "{{name}}", URLs, emails, timestamps, "\\n", capitalization.
- Never add/remove tags, placeholders, or extra sentences.
- Example: <p>Hello <strong>world</strong></p> → <p>[localized]<strong>[localized]</strong></p>

### 4️⃣ STYLE (AUTO-ADAPT)
- Use ${targetLanguage} rhythm, idioms, punctuation, date/number formats.
- Prefer short, natural sentences (≈8–18 words).
- Maintain professional yet conversational tone.
- Rewrite literal phrasing to sound native without adding meaning.

---

## 🧲 FAITHFULNESS CONSTRAINTS (GENERIC)
- **No-Embellishment:** Do NOT add benefits, capabilities, or claims not in the source.
- **Intent Lock:** Preserve source intent class: Completion → completion; Instruction → instruction; Warning → warning; Info → informational.
- **No Qualifier Inflation:** No extra intensifiers or adjectives.
- **No Domain Drift:** Don’t introduce new entities, URLs, products, or metrics.
- **Minimal Naturalness:** If multiple renderings are possible, choose the **shortest, neutral, professional** one.

### 🧠 Literal Phrase Reinterpretation Layer (Language-Agnostic)
Reinterpret motivational/metaphorical phrasing semantically (not lexically):

| Source Intent (generic) | Meaning | Target Template (in ${targetLanguage}) |
|---|---|---|
| Alertness call (“stay vigilant / be alert / keep aware”) | Maintain awareness; act carefully | Neutral, professional imperative (avoid idioms). |
| Skill improvement claim (context = completion) | Factual completion only | Minimal completion acknowledgment (no implied skill gain). |
| Generic reassurance (“now safer/stronger”) | Reassurance without proof | Neutral acknowledgment or omit. |
| Caution (“be careful / take care”) | Safety instruction | Direct, polite imperative (no slogans). |

### 🧪 Semantic Entailment & Mirror
- Target must be **entailed** by the source (no new info).
- **Mirror Test:** Re-express the target in ${sourceLanguage}—if meaning differs, revise.

### 🧭 INTENT TAXONOMY (RUNTIME)
Classes: {Completion, Instruction, Warning/Alert, Info/Notification, Praise/Acknowledgment}.  
Generate target in the **same class**, with equivalent tone.  
If ambiguous, default to **Info/Notification** (neutral).

---

## 🔧 LOCALE-SAFE MECHANICS
### 🧮 Locale Formatting
- Dates, numbers, punctuation → target-locale conventions (no exclamation stacking).

### 🧩 Message Variables & Plurals
- Keep ICU patterns intact: {count, plural, one{# …} other{# …}}, {gender, select, …}.
- You may reorder words for ${targetLanguage}, but never alter ICU tokens.

### ↔️ Script & Direction
- RTL languages: text RTL; URLs/emails LTR; preserve HTML entities.

### 🔡 Casing & Diacritics
- Respect locale casing and diacritics; keep brand names exact.

### 🚫 No Fabrication
- Don’t invent or alter URLs, emails, company/product names, codes, or numbers.

### 📏 Length & Line Breaks
- Keep values concise (≤120 chars unless source longer).
- Preserve existing "\\n"; don’t add blank lines.

### 🚦 Alert Severity Mapping
- Low: neutral reminder (one action).
- Medium: "Warning:" + one precise action.
- High: "Important:" + one immediate action (no fear language).
- Match source severity; never escalate.

### 📐 JSON Schema (implicit)
Object with string keys "0"…"${extractedLength - 1}" and string values only. No extra keys, no arrays, no comments.

${
  decodingDiscipline
    ? `
### 🧭 Decoding Discipline
- Prefer deterministic wording; avoid stylistic variation when a minimal faithful rendering exists.
- If uncertain, choose the literal faithful phrasing over a creative paraphrase.
`.trim()
    : ''
}

---

## 7️⃣ FEW-SHOT SCAFFOLD (Illustrative — adapt to ${targetLanguage})
- [Completion] SRC: "Well done — you’ve finished the training."
  TGT: "[Minimal completion acknowledgment in ${targetLanguage}]"
- [Instruction] SRC: "Verify the sender’s address before clicking any link."
  TGT: "[Polite imperative in ${targetLanguage}]"
- [Warning] SRC: "Do not open unexpected attachments — they may install malware."
  TGT: "[Direct warning in ${targetLanguage}, no fear language]"

---

## 8️⃣ VALIDATION BEFORE OUTPUT
1. JSON keys match exactly (0…${extractedLength - 1}).  
2. Text fully localized in ${targetLanguage} (no mixed fragments).  
3. HTML tags/placeholders/capitalization preserved.  
4. Terminology consistent.  
5. Faithfulness OK: no new benefits/claims or domain drift.  
6. Mirror Test: back-translation adds no meaning.  
7. Self-Consistency: if any value reads like assumption, regenerate faithfully.  
8. Output strictly valid JSON (no comments or metadata).

---

## ✅ OUTPUT FORMAT (STRICT)
Return ONLY this JSON object:
{
  "0": "localized value in ${targetLanguage}",
  "1": "localized value in ${targetLanguage}"
}
Keep all keys "0" to "${extractedLength - 1}".
`.trim();
}
