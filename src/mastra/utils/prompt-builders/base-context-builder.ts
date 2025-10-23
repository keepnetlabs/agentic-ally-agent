import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';

export function buildBaseContext(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const levelRules = {
    'Beginner': 'Keep simple, one control/concept, one benefit',
    'Intermediate': 'Combine related concepts, practical scenarios',
    'Advanced': 'Multiple controls, business impact, strategic context'
  };

  const levelRule = levelRules[analysis.level as keyof typeof levelRules] || levelRules['Beginner'];

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
   GOAL: Produce original microlearning content directly in ${analysis.language}.  
   The writing must sound as if it was originally created in ${analysis.language} by a native professional—not translated or adapted.  
   Assume you are a native professional educator and writer in ${analysis.language}, skilled in creating clear, engaging learning content.

   OUTPUT: ${analysis.language} ONLY. No other languages. No meta commentary.

   RULE 1: Language Purity
   • Every JSON field is written entirely in ${analysis.language} (100% native fluency)
   • ZERO words from other languages (except globally recognized acronyms like MFA, SPF, DMARC, DKIM)
   • No mixed-language fragments or translation residue

   RULE 2: Expression Quality (Create, Don’t Translate)
   • Ignore any English phrasing in this prompt—they illustrate patterns only
   • Express each idea naturally in ${analysis.language}, using authentic tone, rhythm, and idioms
   • WRONG ❌: Literal, mechanical, or word-for-word phrasing
   • RIGHT ✅: Fluent, natural, idiomatic, and professional writing that feels native

   RULE 3: Quality & Readability
   • Professional, confident, approachable tone — colleague-to-colleague
   • Clear, active verbs and smooth sentence flow
   • Short sentences (≈8–18 words), one idea per line
   • Plain, concrete vocabulary; avoid academic or bureaucratic style
   • Consistent terminology, voice, and perspective throughout

   RULE 4: Clarity & Authenticity
   • Sound like real learning material written for real people
   • Avoid machine-translation artifacts, awkward constructions, redundancy, or stiff formal tone
   • Prioritize clarity, engagement, and natural rhythm

   FINAL CHECK:
   Ask yourself: “Would a native professional in ${analysis.language} naturally say or write this?”  
   If the answer is NO → rewrite before output.

4. **Structure & Quality**
   - Replace ALL placeholders with real, topic-specific content.
   - Keep JSON structure EXACTLY as provided (no extra keys, no omissions).
   - Each field must deliver practical, realistic learning content aligned with objectives.
   - Use short sentences, plain language, memory-friendly phrasing.

5. **Learning Science**
   - Use memory-friendly patterns: repeat key points, chunk information (3-5 items max)
   - Link actions to outcomes: "When you [action], you [benefit]"
   - Keep cognitive load low: one concept per screen, simple language

6. **Level Adaptation**
   - ${levelRule}

=== CRITICAL ===
- Never leave placeholders like "clear benefit statement" or "concise point".
- Never change scene_type values (must remain: intro, goal, scenario, actionable_content, quiz, survey, nudge, summary).
- Output must be STRICT JSON only.
`;
}