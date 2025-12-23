// =========================
// Localization Prompt Pack
// (Production-ready, JS-safe, durable)
// =========================

type LangKey =
    | "tr" | "en" | "fr" | "es" | "de" | "it" | "pt" | "nl" | "sv" | "no" | "da"
    | "pl" | "cs" | "ru" | "ar" | "fa" | "hi" | "zh" | "ja" | "ko" | "th" | "vi"
    | "uk" | "el" | "ro" | "hu" | "sk" | "id" | "bn" | "ur" | "he" | "sw"
    | "ku" | "hr" | "sr" | "bg" | "mk" | "sq" | "is" | "fi"
    | "generic";

// --- 1) Lang-code normalizer (aliases + fallback) ---
function normLang(code?: string): LangKey {
    if (!code) return "generic";
    const raw = code.toLowerCase().trim().replace(/_/g, "-");
    const primary = raw.split("-")[0];

    const aliases: Record<string, LangKey> = {
        // Base language codes (39 languages)
        tr: "tr", en: "en", fr: "fr", es: "es", de: "de", it: "it", pt: "pt", nl: "nl",
        sv: "sv", no: "no", nb: "no", nn: "no", da: "da", pl: "pl", cs: "cs", ru: "ru",
        ar: "ar", fa: "fa", hi: "hi", zh: "zh", ja: "ja", ko: "ko", th: "th", vi: "vi",
        uk: "uk", el: "el", ro: "ro", hu: "hu", sk: "sk", id: "id", bn: "bn", ur: "ur",
        he: "he", sw: "sw", ku: "ku", hr: "hr", sr: "sr", bg: "bg", mk: "mk", sq: "sq",
        is: "is", fi: "fi",
        // Common regional variants
        "pt-br": "pt", "pt-pt": "pt",
        "zh-cn": "zh", "zh-sg": "zh", "zh-hans": "zh", "zh-hant": "zh", "zh-tw": "zh", "zh-hk": "zh",
        "en-gb": "en", "en-us": "en", "en-au": "en", "en-ca": "en",
        "fr-ca": "fr",
        "es-mx": "es", "es-419": "es",
        "tr-tr": "tr", "de-de": "de", "it-it": "it",
        "sr-latn": "sr", "sr-cyrl": "sr",
        "zh-yue": "zh",
        // Full language names (for AI outputs like "Turkish", "English", etc.)
        "turkish": "tr", "türkçe": "tr", "turkce": "tr", "turk": "tr",
        "english": "en", "eng": "en",
        "german": "de", "deutsch": "de",
        "french": "fr", "francais": "fr", "français": "fr",
        "spanish": "es", "espanol": "es", "español": "es",
        "italian": "it", "italiano": "it",
        "portuguese": "pt", "português": "pt",
        "russian": "ru", "россия": "ru",
        "chinese": "zh",
        "japanese": "ja",
        "arabic": "ar",
        "korean": "ko",
        "dutch": "nl", "nederlands": "nl",
        "polish": "pl", "polski": "pl",
        "swedish": "sv", "svenska": "sv",
        "norwegian": "no", "norsk": "no",
        "danish": "da", "dansk": "da",
        "czech": "cs", "česky": "cs",
        "persian": "fa", "farsi": "fa",
        "hindi": "hi",
        "thai": "th",
        "vietnamese": "vi",
        "ukrainian": "uk", "українська": "uk",
        "greek": "el", "ελληνικά": "el",
        "romanian": "ro", "română": "ro",
        "hungarian": "hu", "magyar": "hu",
        "slovak": "sk", "slovenčina": "sk",
        "indonesian": "id", "bahasa indonesia": "id",
        "bengali": "bn", "বাংলা": "bn",
        "urdu": "ur", "اردو": "ur",
        "hebrew": "he", "עברית": "he",
        "swahili": "sw",
        "kurdish": "ku", "کوردی": "ku",
        "croatian": "hr", "hrvatski": "hr",
        "serbian": "sr", "србија": "sr",
        "bulgarian": "bg", "български": "bg",
        "macedonian": "mk", "македонски": "mk",
        "albanian": "sq", "shqiptare": "sq",
        "icelandic": "is", "íslenska": "is",
        "finnish": "fi", "suomi": "fi"
    };

    return aliases[raw] || aliases[primary] || "generic";
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

⚙️ RUNTIME BEHAVIOR:
- This list is DYNAMIC and can be updated at runtime
- Violations are TRACKED and logged for improvement
- Maintain professional, adult, motivational tone.
- Avoid exaggerated praise, teacherly tone, or fear-based language.
- Focus on clarity, respect, and cultural neutrality.
`.trim()
};

const memo = new Map<LangKey, string>();

export function getLanguagePrompt(langCode: string): string {
    const key = normLang(langCode);
    if (memo.has(key)) return memo.get(key)!;
    const out = RULES_BY_LANG[key] || RULES_BY_LANG.generic;
    memo.set(key, out);
    return out;
}

// --- 3) Optional glossary injector (hard override for terms) ---
export function buildGlossaryPrompt(glossary: Array<Record<string, string>> = []): string {
    if (!glossary.length) return "";
    return `
### 📚 Terminology Glossary (HARD OVERRIDE)
- Use the target-language equivalents exactly as given below.
${glossary.map((g, i) => `  ${i + 1}. ${JSON.stringify(g)}`).join("\n")}
- If a term is not listed, choose the most common enterprise-security usage in ${"${targetLanguage}"}.
`.trim();
}

// --- 4) Main system prompt builder (n→n localization) ---
export function buildSystemPrompt(opts: {
    topicContext?: string,
    sourceLanguage: string,
    targetLanguage: string,
    extractedLength: number,
    glossary?: Array<Record<string, string>>,
    decodingDiscipline?: boolean
}): string {
    const {
        topicContext = "",
        sourceLanguage,
        targetLanguage,
        extractedLength,
        glossary = [],
        decodingDiscipline = true
    } = opts;

    const languagePrompt =
        typeof getLanguagePrompt === "function" ? getLanguagePrompt(targetLanguage) : "";

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

---

## CRITICAL RULES

### 1️⃣ LANGUAGE PURITY
- Output ONLY in ${targetLanguage}.
- No mixed-language fragments.
- Keep globally standard acronyms/proper nouns as-is when recognized.
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

${decodingDiscipline ? `
### 🧭 Decoding Discipline
- Prefer deterministic wording; avoid stylistic variation when a minimal faithful rendering exists.
- If uncertain, choose the literal faithful phrasing over a creative paraphrase.
`.trim() : ""}

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
