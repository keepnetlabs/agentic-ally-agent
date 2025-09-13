import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';

export function buildBaseContext(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const analysisContext = JSON.stringify({
    language: analysis.language,
    topic: analysis.topic,
    title: analysis.title,
    department: analysis.department,
    level: analysis.level,
    category: analysis.category,
    subcategory: analysis.subcategory,
    learningObjectives: analysis.learningObjectives,
    industries: analysis.industries,
    roles: analysis.roles,
    keyTopics: analysis.keyTopics,
    practicalApplications: analysis.practicalApplications,
    assessmentAreas: analysis.assessmentAreas,
    customRequirements: analysis.customRequirements
  }, null, 2);

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

ANALYSIS CONTEXT (JSON):
${analysisContext}

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
   - Write all user-visible text fully in ${analysis.language}. The output must read as if it were originally authored and edited by a native professional instructional designer in that language.
   - Do not mix languages. Use only ${analysis.language}, except for proper nouns, established abbreviations, or technical terms that must remain unchanged.
   - Express ideas by meaning, not word-for-word. Use idiomatic, contemporary ${analysis.language} with correct grammar, natural sentence flow, and culturally appropriate phrasing.
   - Titles and headings must read like authentic training program names in ${analysis.language}, not literal descriptions. Favor formats that sound professional and engaging (e.g., "Awareness Training", "Best Practices", "Safe Use of X").
   - Ensure domain-specific terminology matches the standard professional usage in ${analysis.language} (e.g., legal, technical, compliance terms).
   - Maintain a professional instructional tone: clear, respectful, concise, and action-oriented. Use imperative forms for guidance (e.g., "Identify…", "Apply…").
   - Avoid literal or awkward phrasing, machine-like translation, redundancy, brand names, tool references, exclamation marks, emojis, slang, or casual fillers unless explicitly required by the context.
   - Ensure terminology is consistent, precise, and appropriate to the subject domain throughout the output.
   - Prefer short, memorable sentences (ideally under 20 words) that support comprehension and retention. Each should sound like natural spoken/written training content, not dictionary definitions.

4. **Structure & Quality**
   - Replace ALL placeholders with real, topic-specific content.
   - Keep JSON structure EXACTLY as provided (no extra keys, no omissions).
   - Each field must deliver practical, realistic learning content aligned with objectives.
   - Use short sentences, plain language, memory-friendly phrasing.

5. **Learning Science**
   - Integrate the listed learning theories into explanations (e.g., attention, memory, practice, reflection).
   - Show links between practical actions and durable learning.

=== CRITICAL ===
- Never leave placeholders like "clear benefit statement" or "concise point".
- Never change scene_type values (must remain: intro, goal, scenario, actionable_content, quiz, survey, nudge, summary).
- Output must be STRICT JSON only.
`;
}