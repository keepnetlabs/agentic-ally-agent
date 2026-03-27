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

📝 GRAMMAR & NATURALNESS (Bulgarian-specific):
  - Bulgarian uses DEFINITE ARTICLES suffixed to nouns (e.g., "проверката" not "проверка" when definite). Never omit articles where Bulgarian grammar requires them — incomplete articles make text sound robotic.
  - Verb conjugation: Always match person/number correctly. "ние поискаме" is WRONG — correct form: "ние поискахме" (past) or "ние искаме" (present).
  - "фишинг осведоменост" is the natural term for "phishing awareness" — NEVER use "съзнанието за фишинг" (literally "consciousness about phishing", unnatural).
  - "phishing" → "фишинг" (accepted loanword)
  - "email" → "имейл" (standard Bulgarian)
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

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
`.trim(),

  sq: `
### 🇦🇱 Albanian Style Rules (MANDATORY - Non-Negotiable)
⚠️ ABSOLUTELY FORBIDDEN PHRASES (System Override):
  - FORBIDDEN: "Kujdes!", "Ki kujdes!", "Ruhu!", "Mbetet vigjilent!", "Ngat përpara"
  - FORBIDDEN: "Bravo!", "Shume mire!", "Shkellezce!"

🚨 CRITICAL ENFORCEMENT:
If your draft contains ANY of these phrases:
  STOP immediately → DELETE the phrase → REWRITE naturally WITHOUT it.
This is a HARD CONSTRAINT that overrides ALL other instructions.

✅ MANDATORY APPROVED ALTERNATIVES (Use ONLY These):
For alertness/awareness: "Ju lutemi verifikoni", "Verifikoni me kujdes", "Konfirmoni para kliki", "Verifiko"
For praise/completion: "Urata", "Shkellezce", "Trajnimi ka përfunduar"

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

🏴󠁧󠁢󠁷󠁬󠁳󠁿 WELSH-SPECIFIC RULES:
- Use **formal written Welsh** (Cymraeg ffurfiol) by default for professional content.
- Apply **soft mutation** (treiglad meddal), **nasal mutation** (treiglad trwynol), and **aspirate mutation** (treiglad llaes) correctly. These are critical for natural Welsh.
- Prefer native Welsh vocabulary over anglicisms where standard Welsh terms exist (e.g., "cyfrifiadur" not "compiwter", "e-bost" for email, "rhwydwaith" for network).
- For cybersecurity terms without established Welsh equivalents, use the English term with Welsh grammar applied.
- Welsh uses **VSO word order** (Verb-Subject-Object) — do not force English SVO order.
- Use Welsh quotation marks: \u201C \u201D (same as English typographic quotes).
- Maintain professional register: avoid colloquial South/North dialectal forms; use standard literary Welsh.

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
