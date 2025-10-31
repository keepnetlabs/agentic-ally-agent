// =========================
// Localization Prompt Pack
// (Production-ready, JS-safe, durable)
// =========================

type LangKey =
    | "tr" | "en" | "fr" | "es" | "de" | "it" | "pt" | "nl" | "sv" | "no" | "da"
    | "pl" | "cs" | "ru" | "ar" | "fa" | "hi" | "zh" | "ja" | "ko" | "th" | "vi"
    | "generic";

// --- 1) Lang-code normalizer (aliases + fallback) ---
function normLang(code?: string): LangKey {
    if (!code) return "generic";
    const raw = code.toLowerCase().trim().replace(/_/g, "-");
    const primary = raw.split("-")[0];

    const aliases: Record<string, LangKey> = {
        // Base
        tr: "tr", en: "en", fr: "fr", es: "es", de: "de", it: "it", pt: "pt", nl: "nl",
        sv: "sv", no: "no", nb: "no", nn: "no", da: "da", pl: "pl", cs: "cs", ru: "ru",
        ar: "ar", fa: "fa", hi: "hi", zh: "zh", ja: "ja", ko: "ko", th: "th", vi: "vi",
        // Common regionals
        "pt-br": "pt", "pt-pt": "pt",
        "zh-cn": "zh", "zh-sg": "zh", "zh-hans": "zh", "zh-hant": "zh", "zh-tw": "zh", "zh-hk": "zh",
        "en-gb": "en", "en-us": "en", "en-au": "en", "en-ca": "en",
        "fr-ca": "fr",
        "es-mx": "es", "es-419": "es",
        "tr-tr": "tr", "de-de": "de", "it-it": "it"
    };

    return aliases[raw] || aliases[primary] || "generic";
}

// --- 2) Language-specific guardrails (map-based) ---
const RULES_BY_LANG: Record<LangKey, string> = {
    tr: `
### 🇹🇷 Turkish Style Rules
- DO NOT USE: "aferin", "bravo", "helal", "uyanık kalın", "gözünüz açık olsun", "aman dikkat", "sakın ola", "hadi bakalım".
- Preferred alternatives:
  - For praise: "Tebrikler!", "Harika, eğitimi başarıyla tamamladınız.", "Başarılı bir şekilde tamamladınız."
  - For alerts: "Dikkat edin", "Lütfen dikkat", "Lütfen doğrulayın."
- Keep tone respectful, confident, and adult. Avoid teacher–student or parental tone.
`.trim(),

    en: `
### 🇬🇧 English Style Rules
- Avoid childish/casual praise ("Good job, buddy!"), slogan-like alerts ("Stay sharp!").
- Prefer: "Well done — you've completed the training.", "Congratulations — module finished successfully."
- Tone: professional, concise, confident.
`.trim(),

    fr: `
### 🇫🇷 French Style Rules
- Avoid didactic "bravo !" or alarmist slogans "restez vigilants !".
- Prefer: "Félicitations, vous avez terminé la formation.", "Veuillez vérifier l'expéditeur avant de cliquer."
- Keep tone calm, courteous, professional (avoid multiple exclamations).
`.trim(),

    es: `
### 🇪🇸 Spanish Style Rules
- Avoid childish/exaggerated exclamations: "¡bravo!", "¡cuidado!", "¡ojo!", "¡atención!".
- Prefer: "¡Felicidades, completaste la formación con éxito!", "Por favor verifica antes de hacer clic."
- Tone: friendly yet professional.
`.trim(),

    de: `
### 🇩🇪 German Style Rules
- Avoid authoritarian or old-fashioned ("Achtung!", "Seien Sie wachsam!").
- Prefer: "Gut gemacht — Sie haben die Schulung abgeschlossen.", "Bitte überprüfen Sie die Absenderadresse."
- Maintain formal corporate tone (Sie-Form), polite but not stiff.
`.trim(),

    it: `
### 🇮🇹 Italian Style Rules
- Avoid teacherly "bravo!" and alarmist "stai attento!".
- Prefer: "Complimenti, hai completato la formazione.", "Controlla l'indirizzo del mittente prima di cliccare."
- Warm yet professional; simple, modern phrasing.
`.trim(),

    pt: `
### 🇵🇹 Portuguese Style Rules
- Avoid childish praise ("bom trabalho!" in teacherly tone) or fear tone ("cuidado!").
- Prefer: "Parabéns, concluiu a formação com sucesso.", "Verifique o remetente antes de clicar."
- Formal yet friendly workplace tone.
`.trim(),

    nl: `
### 🇳🇱 Dutch Style Rules
- Avoid overly casual ("Goed bezig!", "Wees alert!").
- Prefer: "Gefeliciteerd, u heeft de training voltooid.", "Controleer de afzender voordat u klikt."
- Neutral, clear, professional phrasing.
`.trim(),

    sv: `
### 🇸🇪 Swedish Style Rules
- Avoid childish/cheerful exclamations ("Bra jobbat!", "Var försiktig!").
- Prefer: "Grattis, du har slutfört utbildningen.", "Kontrollera avsändaren innan du klickar."
- Factual, polite, workplace-appropriate tone.
`.trim(),

    no: `
### 🇳🇴 Norwegian Style Rules
- Avoid slang/over-excited ("Bra jobba!", "Vær på vakt!").
- Prefer: "Gratulerer, du har fullført opplæringen.", "Vennligst sjekk avsenderen før du klikker."
`.trim(),

    da: `
### 🇩🇰 Danish Style Rules
- Avoid casual ("Godt klaret!", "Pas på!").
- Prefer: "Tillykke, du har gennemført træningen.", "Kontroller afsenderen, før du klikker."
`.trim(),

    pl: `
### 🇵🇱 Polish Style Rules
- Avoid lecturing ("Uważaj!", "Bądź czujny!").
- Prefer: "Gratulacje, ukończyłeś szkolenie.", "Zawsze sprawdzaj nadawcę przed kliknięciem."
`.trim(),

    cs: `
### 🇨🇿 Czech Style Rules
- Avoid imperative slogans ("Buďte opatrní!", "Pozor!").
- Prefer: "Gratulujeme, dokončili jste školení.", "Před kliknutím ověřte odesílatele."
`.trim(),

    ru: `
### 🇷🇺 Russian Style Rules
- Avoid sloganistic/authoritarian ("Будьте бдительны!", "Молодцы!").
- Prefer: "Поздравляем, вы завершили обучение.", "Проверьте адрес отправителя перед кликом."
- Calm, professional, respectful.
`.trim(),

    ar: `
### 🇸🇦 Arabic Style Rules
- Avoid paternal/moralizing tone ("يا بُني", "احذر دائمًا").
- Prefer: "تهانينا، أكملت التدريب بنجاح.", "يرجى التحقق من المرسل قبل النقر."
- Use neutral forms where possible; professional tone.
`.trim(),

    fa: `
### 🇮🇷 Persian Style Rules
- Avoid old-fashioned/moral phrases ("مواظب باش!", "آفرین!").
- Prefer: "تبریک می‌گوییم، آموزش را با موفقیت به پایان رساندید.", "لطفاً فرستنده را بررسی کنید."
`.trim(),

    hi: `
### 🇮🇳 Hindi Style Rules
- Avoid patronizing ("शाबाश", "सावधान रहें").
- Prefer: "बधाई हो, आपने प्रशिक्षण पूरा किया।", "क्लिक करने से पहले प्रेषक की जाँच करें।"
- Polite, modern, workplace-professional.
`.trim(),

    zh: `
### 🇨🇳 Chinese (Simplified) Style Rules
- Avoid moralistic slogans ("注意安全！", "保持警惕！").
- Prefer: "恭喜您，已完成培训。", "点击前请确认发件人。"
- Concise, polite, business tone (no exclamation stacking).
`.trim(),

    ja: `
### 🇯🇵 Japanese Style Rules
- Avoid school-like encouragement ("よくできました！", "気をつけて！").
- Prefer: "お疲れ様でした。トレーニングが完了しました。", "クリックする前に送信者を確認してください。"
- Polite workplace style (です・ます調), no casual tone.
`.trim(),

    ko: `
### 🇰🇷 Korean Style Rules
- Avoid childlike/directive ("잘했어요!", "조심하세요!").
- Prefer: "축하합니다. 교육을 완료했습니다.", "클릭하기 전에 발신자를 확인하세요."
- Professional, adult, polite.
`.trim(),

    th: `
### 🇹🇭 Thai Style Rules
- Avoid exaggerated praise ("เก่งมาก!", "ระวังนะ!").
- Prefer: "ขอแสดงความยินดี คุณได้จบการฝึกอบรมแล้ว", "กรุณาตรวจสอบผู้ส่งก่อนคลิก"
- Polite, corporate, natural.
`.trim(),

    vi: `
### 🇻🇳 Vietnamese Style Rules
- Avoid overexcited tone ("Tốt lắm!", "Hãy cẩn thận!").
- Prefer: "Chúc mừng bạn đã hoàn thành khóa đào tạo.", "Vui lòng kiểm tra người gửi trước khi nhấp."
- Polite workplace tone.
`.trim(),

    generic: `
### 🌐 Generic Style Rules
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
