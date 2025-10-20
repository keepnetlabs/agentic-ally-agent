import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';

export function buildBaseContext(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  return `
Generate ${analysis.language} training content for "${analysis.topic}" in STRICT JSON only.

=== CONTEXT ===
- Level: ${analysis.level} | Department: ${analysis.department}
- Category: ${analysis.category}${analysis.subcategory ? ` / ${analysis.subcategory}` : ''}
- Objectives: ${analysis.learningObjectives.join(', ')}
- Rich Context: ${analysis.contextSummary || 'Standard training'}
- Custom Requirements: ${analysis.customRequirements || 'None'}
- Roles: ${(analysis.roles || []).join(', ') || 'All Roles'}
- Industries: ${(analysis.industries || []).join(', ') || 'General'}
- Key Topics: ${(analysis.keyTopics || []).join(', ')}
- Practical Applications: ${(analysis.practicalApplications || []).join(', ')}
- Assessment Areas: ${(analysis.assessmentAreas || []).join(', ')}
- Compliance Requirements: ${(analysis.regulationCompliance || []).join(', ') || 'General'}

SCIENTIFIC CONTEXT:
- Category: ${microlearning.microlearning_metadata.category}/${microlearning.microlearning_metadata.subcategory}
- Risk Area: ${microlearning.microlearning_metadata.risk_area}
- Learning Theories: ${Object.keys(microlearning.scientific_evidence?.learning_theories || {}).slice(0, 2).join(', ')}

=== GLOBAL RULES ===
1. **Topic Consistency**
   - Keep all content focused strictly on ${analysis.topic}.
   - Use consistent terminology and examples directly tied to ${analysis.topic}.
   - Avoid unrelated concepts, characters, or domains.

2. **Domain Guardrails**
   - Content must align with the given category/subcategory and key topics.
   - Security-specific terms (phishing, reporting, email) are allowed **only** if category/key topics explicitly mention them.
   - Choose Lucide icons semantically matched to topic/category. Never default to generic security icons unless explicitly relevant.

3. **Language & Style - CRITICAL**
   OUTPUT: ${analysis.language} ONLY. No other languages.

   RULE 1: Language Purity
   • Every JSON field: ${analysis.language} ONLY (100% target language)
   • ZERO words from other languages (only proper nouns, unavoidable technical terms)
   • NO language mixing

   RULE 2: Transform, Don't Translate
   • English examples in instructions = PATTERN only, not copy source
   • YOUR JOB: Express meaning naturally in ${analysis.language} like native professional would
   • WRONG ❌: Word-for-word translation (formal, awkward, mechanical)
   • RIGHT ✅: Natural idiom in target language (conversational, native)

   Example: English "Remember that one click compromises account"
   ❌ NOT: "Bir tıklamanın hesabı tehlikeye attığını unutmayın" (literal, stiff)
   ✅ YES: "Unutmayın ki tek bir tıklama hesabınızı ele verebilir" (natural native phrasing)

   RULE 3: Quality Standard
   • Professional colleague-to-colleague tone (NOT textbook, NOT formal, NOT translated)
   • Natural sentence flow and idiomatic phrasing
   • Authentic training language (sounds real, not artificial)
   • Short sentences (<20 words), consistent terminology

   AVOID: Machine translation artifacts, formal academic tone, awkward phrasing, redundancy

   PRE-OUTPUT CHECK: "Would a native professional in ${analysis.language} naturally say this?" If NO → rewrite

4. **Structure & Quality**
   - Replace ALL placeholders with real, topic-specific content.
   - Keep JSON structure EXACTLY as provided (no extra keys, no omissions).
   - Each field must deliver practical, realistic learning content aligned with objectives.
   - Use short sentences, plain language, memory-friendly phrasing.

5. **Learning Science**
   - Use memory-friendly patterns: repeat key points, chunk information (3-5 items max)
   - Link actions to outcomes: "When you [action], you [benefit]"
   - Keep cognitive load low: one concept per screen, simple language

=== CRITICAL ===
- Never leave placeholders like "clear benefit statement" or "concise point".
- Never change scene_type values (must remain: intro, goal, scenario, actionable_content, quiz, survey, nudge, summary).
- Output must be STRICT JSON only.
`;
}