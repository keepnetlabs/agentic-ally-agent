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

3. **Language & Style**
   - ${analysis.language} only - natural, idiomatic, culturally appropriate (like native professional wrote it)
   - Do not mix languages. Use ${analysis.language} except for proper nouns, abbreviations, or technical terms
   - Express ideas by meaning, not word-for-word. Use idiomatic, contemporary phrasing with natural sentence flow
   - Conversational but professional tone (like colleague explaining to colleague) - NOT formal textbook style
   - Titles must sound like authentic training names (e.g., "Stop Phishing Attacks"), not literal descriptions
   - Short sentences (<20 words), consistent domain terminology, natural spoken/written style - NOT dictionary definitions
   - Avoid awkward phrasing, machine translation, redundancy, brand names, tool references, emojis, slang, exclamation marks

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