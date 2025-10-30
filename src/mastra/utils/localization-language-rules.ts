/**
 * Language-specific guardrails to inject into the system prompt.
 * Keeps tone professional (adult workplace), bans childish / slogan-like phrases,
 * and suggests culturally natural equivalents per target language.
 */

export function getLanguagePrompt(langCode: string) {
    const prefix = (langCode || "").toLowerCase().split("-")[0];

    switch (prefix) {
        // --- EUROPE / MENA ---

        case "tr":
            return `
### 🇹🇷 Turkish Style Rules
- DO NOT USE: "aferin", "bravo", "helal", "uyanık kalın", "gözünüz açık olsun", "aman dikkat", "sakın ola", "hadi bakalım".
- Preferred alternatives:
  - For praise: "Tebrikler!", "Harika, eğitimi başarıyla tamamladınız.", "Başarılı bir şekilde tamamladınız."
  - For alerts: "Dikkat edin", "Lütfen dikkat", "Lütfen doğrulayın."
- Keep tone respectful, confident, and adult. Avoid teacher–student or parental tone.
`;

        case "en":
            return `
### 🇬🇧 English Style Rules
- Avoid childish/casual praise ("Good job, buddy!"), slogan-like alerts ("Stay sharp!").
- Prefer: "Well done — you've completed the training.", "Congratulations — module finished successfully."
- Tone: professional, concise, confident.
`;

        case "fr":
            return `
### 🇫🇷 French Style Rules
- Avoid didactic "bravo !" or alarmist slogans "restez vigilants !".
- Prefer: "Félicitations, vous avez terminé la formation.", "Veuillez vérifier l'expéditeur avant de cliquer."
- Keep tone calm, courteous, professional (avoid multiple exclamations).
`;

        case "es":
            return `
### 🇪🇸 Spanish Style Rules
- Avoid childish/exaggerated exclamations: "¡bravo!", "¡cuidado!", "¡ojo!", "¡atención!".
- Prefer: "¡Felicidades, completaste la formación con éxito!", "Por favor verifica antes de hacer clic."
- Tone: friendly yet professional.
`;

        case "de":
            return `
### 🇩🇪 German Style Rules
- Avoid authoritarian or old-fashioned ("Achtung!", "Seien Sie wachsam!").
- Prefer: "Gut gemacht — Sie haben die Schulung abgeschlossen.", "Bitte überprüfen Sie die Absenderadresse."
- Maintain formal corporate tone (Sie-Form), polite but not stiff.
`;

        case "it":
            return `
### 🇮🇹 Italian Style Rules
- Avoid teacherly "bravo!" and alarmist "stai attento!".
- Prefer: "Complimenti, hai completato la formazione.", "Controlla l'indirizzo del mittente prima di cliccare."
- Warm yet professional; simple, modern phrasing.
`;

        case "pt":
            return `
### 🇵🇹 Portuguese Style Rules
- Avoid childish praise ("bom trabalho!" in teacherly tone) or fear tone ("cuidado!").
- Prefer: "Parabéns, concluiu a formação com sucesso.", "Verifique o remetente antes de clicar."
- Formal yet friendly workplace tone.
`;

        case "nl":
            return `
### 🇳🇱 Dutch Style Rules
- Avoid overly casual ("Goed bezig!", "Wees alert!").
- Prefer: "Gefeliciteerd, u heeft de training voltooid.", "Controleer de afzender voordat u klikt."
- Neutral, clear, professional phrasing.
`;

        case "sv":
            return `
### 🇸🇪 Swedish Style Rules
- Avoid childish/cheerful exclamations ("Bra jobbat!", "Var försiktig!").
- Prefer: "Grattis, du har slutfört utbildningen.", "Kontrollera avsändaren innan du klickar."
- Factual, polite, workplace-appropriate tone.
`;

        case "no":
            return `
### 🇳🇴 Norwegian Style Rules
- Avoid slang/over-excited ("Bra jobba!", "Vær på vakt!").
- Prefer: "Gratulerer, du har fullført opplæringen.", "Vennligst sjekk avsenderen før du klikker."
`;

        case "da":
            return `
### 🇩🇰 Danish Style Rules
- Avoid casual ("Godt klaret!", "Pas på!").
- Prefer: "Tillykke, du har gennemført træningen.", "Kontroller afsenderen, før du klikker."
`;

        case "pl":
            return `
### 🇵🇱 Polish Style Rules
- Avoid lecturing ("Uważaj!", "Bądź czujny!").
- Prefer: "Gratulacje, ukończyłeś szkolenie.", "Zawsze sprawdzaj nadawcę przed kliknięciem."
`;

        case "cs":
            return `
### 🇨🇿 Czech Style Rules
- Avoid imperative slogans ("Buďte opatrní!", "Pozor!").
- Prefer: "Gratulujeme, dokončili jste školení.", "Před kliknutím ověřte odesílatele."
`;

        case "ru":
            return `
### 🇷🇺 Russian Style Rules
- Avoid sloganistic/authoritarian ("Будьте бдительны!", "Молодцы!").
- Prefer: "Поздравляем, вы завершили обучение.", "Проверьте адрес отправителя перед кликом."
- Calm, professional, respectful.
`;

        case "ar":
            return `
### 🇸🇦 Arabic Style Rules
- Avoid paternal/moralizing tone ("يا بُني", "احذر دائمًا").
- Prefer: "تهانينا، أكملت التدريب بنجاح.", "يرجى التحقق من المرسل قبل النقر."
- Use neutral forms where possible; professional tone.
`;

        case "fa":
            return `
### 🇮🇷 Persian Style Rules
- Avoid old-fashioned/moral phrases ("مواظب باش!", "آفرین!").
- Prefer: "تبریک می‌گوییم، آموزش را با موفقیت به پایان رساندید.", "لطفاً فرستنده را بررسی کنید."
`;

        // --- APAC ---

        case "hi":
            return `
### 🇮🇳 Hindi Style Rules
- Avoid patronizing ("शाबाश", "सावधान रहें").
- Prefer: "बधाई हो, आपने प्रशिक्षण पूरा किया।", "क्लिक करने से पहले प्रेषक की जाँच करें।"
- Polite, modern, workplace-professional.
`;

        case "zh":
            return `
### 🇨🇳 Chinese (Simplified) Style Rules
- Avoid moralistic slogans ("注意安全！", "保持警惕！").
- Prefer: "恭喜您，已完成培训。", "点击前请确认发件人。"
- Concise, polite, business tone (no exclamation stacking).
`;

        case "ja":
            return `
### 🇯🇵 Japanese Style Rules
- Avoid school-like encouragement ("よくできました！", "気をつけて！").
- Prefer: "お疲れ様でした。トレーニングが完了しました。", "クリックする前に送信者を確認してください。"
- Polite workplace style (です・ます調), no casual tone.
`;

        case "ko":
            return `
### 🇰🇷 Korean Style Rules
- Avoid childlike/directive ("잘했어요!", "조심하세요!").
- Prefer: "축하합니다. 교육을 완료했습니다.", "클릭하기 전에 발신자를 확인하세요."
- Professional, adult, polite.
`;

        case "th":
            return `
### 🇹🇭 Thai Style Rules
- Avoid exaggerated praise ("เก่งมาก!", "ระวังนะ!").
- Prefer: "ขอแสดงความยินดี คุณได้จบการฝึกอบรมแล้ว", "กรุณาตรวจสอบผู้ส่งก่อนคลิก"
- Polite, corporate, natural.
`;

        case "vi":
            return `
### 🇻🇳 Vietnamese Style Rules
- Avoid overexcited tone ("Tốt lắm!", "Hãy cẩn thận!").
- Prefer: "Chúc mừng bạn đã hoàn thành khóa đào tạo.", "Vui lòng kiểm tra người gửi trước khi nhấp."
- Polite workplace tone.
`;

        // --- FALLBACK ---

        default:
            return `
### 🌐 Generic Style Rules
- Maintain professional, adult, motivational tone.
- Avoid exaggerated praise, teacherly tone, or fear-based language.
- Focus on clarity, respect, and cultural neutrality.
`;
    }
}

/**
 * Builds the full system prompt for n→n localization.
 * Injects language-specific guardrails based on targetLanguage.
 */
export function buildSystemPrompt({ topicContext = "", sourceLanguage, targetLanguage, extractedLength }: { topicContext?: string, sourceLanguage: string, targetLanguage: string, extractedLength: number }): string {
    const languagePrompt = getLanguagePrompt(targetLanguage);

    return `
${topicContext}

${languagePrompt}

NOTE: Source and target languages may vary widely (any → any).
Always interpret meaning language-agnostically first, then rewrite naturally in ${targetLanguage}.

TASK: Localize JSON values from ${sourceLanguage} to ${targetLanguage} ONLY, producing fluent, culturally natural, native-quality output.

---

## 🌍 MULTI-LANGUAGE INTELLIGENCE (n→n TRANSLATION)
- Handle translation **between any language pair** (${sourceLanguage} → ${targetLanguage}) with equal accuracy and cultural fluency.
- Detect and adapt to **linguistic family differences** (Latin, Cyrillic, Arabic, Indic, East Asian, etc.).
- Respect target-language **grammar, syntax, and rhythm**.
- Avoid calques/literal carryover; rephrase naturally for ${targetLanguage}.
- When both languages are **non-English**, use English only as a semantic bridge — not literal wording.
- Prioritize **semantic parity** (meaning & tone) over syntactic parity.
- For gendered languages, prefer **gender-neutral phrasing** unless context implies otherwise.
- Preserve **register/tone equivalence** (formal↔formal, friendly↔friendly, motivational↔motivational).
- Localize **idioms, metaphors, and praise** to culturally appropriate forms.

---

## CRITICAL RULES

### 1️⃣ LANGUAGE PURITY
- Output ONLY in ${targetLanguage}.
- Do not mix with other languages.
- Keep globally standard cybersecurity nouns/acronyms (phishing, CEO, MFA, SPF, DMARC, DKIM, AI).
- If no direct equivalent exists, keep the English term; localize surrounding grammar naturally.

### 2️⃣ CONTEXT-AWARE LOCALIZATION (NOT LITERAL)
- Focus on **meaning, tone, and natural phrasing**—not word-for-word translation.
- Adapt to ${targetLanguage} communication style.
- Avoid robotic, academic, or overly formal tone.

**Content Type Guidance**
- **Titles:** Action-oriented, clear, motivating.
- **Warnings/Alerts:** Direct statement + impact + awareness.
- **Descriptions:** Verb + what + why (practical and concise).
- **Actions/Commands:** Simple active verbs, natural imperatives.
- **Informational Text:** Professional, conversational, never textbook-like.

**Localization Patterns**
1) **Warnings/Threats:** Direct statement → relevant threat → personal impact → awareness call.
2) **Actions:** Simple verb + clear context (active voice).
3) **Descriptions:** Verb + what + why (benefit/purpose).

### 3️⃣ STRUCTURE PRESERVATION
- Preserve all JSON keys exactly ("0", "1", ..., "${extractedLength - 1}").
- Keep HTML tags/attributes unchanged (same count and order).
- Preserve placeholders/variables: \`{…}\`, \`{{…}}\`, \`%s\`, \`%d\`, \`{{name}}\`, URLs, emails, timestamps, \`\\n\`, capitalization.
- Never add/remove tags, placeholders, or extra sentences.
- Example: <p>Hello <strong>world</strong></p> → <p>[localized]<strong>[localized]</strong></p>

### 4️⃣ STYLE (AUTO-ADAPT TO TARGET LANGUAGE)
- Automatically adapt rhythm, idioms, and tone to ${targetLanguage} norms.
- Prefer short, natural sentences (≈8–18 words).
- Follow native punctuation, date, and number formats.
- Professional yet conversational tone.
- Rewrite literal phrasing to sound native while preserving meaning.

### 🎯 TONE ADAPTATION (MOTIVATIONAL & PROFESSIONAL)
- Convert praise (e.g., "Well done", "Great job") to **adult, professional** equivalents in ${targetLanguage}.
- Avoid childish/teacherly expressions and alarmist slogans.
- Fit workplace microlearning: respectful, motivating, professional.

### 5️⃣ TERMINOLOGY
- Use standard cybersecurity terminology in ${targetLanguage}.
- Do NOT invent new terms.
- Keep global acronyms (MFA, SPF, DMARC, DKIM) unless a localized standard exists.
- When uncertain, choose the most common enterprise-security usage in ${targetLanguage}.
- Maintain consistent terminology across this batch AND across all scenes.

### 6️⃣ CULTURAL ADAPTATION
- Adapt examples/references to ${targetLanguage} cultural context where natural.
- Avoid idioms that don't translate well; rephrase to preserve meaning.
- Recast scenarios that don't make local sense while keeping universal security principles.
- Use local naming conventions for person/company examples.

### 7️⃣ FEW-SHOT SCAFFOLD (ILLUSTRATIVE — adapt to ${targetLanguage})
- [Warning] SRC: "Phishing alert: Do not open unexpected attachments — they may install malware."
  TGT: "[Natural ${targetLanguage} equivalent: clear, direct, professional warning]"
- [Action]  SRC: "Verify the sender's address before clicking any link."
  TGT: "[Natural ${targetLanguage} equivalent: polite imperative in active voice]"
- [Description] SRC: "Report suspicious emails so we can block similar attacks."
  TGT: "[Natural ${targetLanguage} equivalent: concise call to action with benefit]"

---

## 8️⃣ VALIDATION BEFORE OUTPUT
1) JSON keys match exactly (0…${extractedLength - 1}).
2) Text fully localized in ${targetLanguage} (no mixed fragments).
3) HTML tags, placeholders, capitalization preserved in structure.
4) Terminology consistent across entries/scenes.
5) Meaning preserved — no omissions/additions.
6) **Language guardrails enforced**: No banned phrases for the resolved targetLanguage prefix; if any appear, replace with preferred equivalents and re-validate.
7) Output is strictly valid JSON (no comments/metadata).

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
