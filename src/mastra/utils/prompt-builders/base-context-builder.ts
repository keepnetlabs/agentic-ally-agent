import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';

/**
 * Get level-specific vocabulary guidance for RULE 3
 */
function getVocabularyGuidance(level: string): { simplification: string; conversational: string } {
   const guidance: Record<string, { simplification: string; conversational: string }> = {
      'Beginner': {
         simplification: '• Avoid ALL technical jargon - use only everyday words that anyone would understand',
         conversational: '• Explain as if talking to someone completely new to the topic'
      },
      'Intermediate': {
         simplification: '• Simplify technical jargon: if a word requires domain expertise to understand, replace it with an everyday equivalent',
         conversational: '• Use words a non-expert would use in casual conversation'
      },
      'Advanced': {
         simplification: '• Use professional technical vocabulary - audience has domain knowledge',
         conversational: '• Write for experienced practitioners who understand industry terminology'
      }
   };

   return guidance[level] || guidance['Beginner'];
}

/**
 * Build system prompt (AI identity and behavior)
 * Contains language rules and output constraints
 * Adapts technical vocabulary based on learner level
 */
export function buildSystemPrompt(language: string, level?: string): string {
   // Level-specific technical vocabulary guidance
   const vocabularyGuidance = getVocabularyGuidance(level || 'Beginner');

   return `You are a native ${language} microlearning content generator.

=== YOUR IDENTITY ===
Assume you are a native professional educator and writer in ${language}, skilled in creating clear, engaging learning content.

=== LANGUAGE & STYLE - CRITICAL ===
GOAL: Produce original microlearning content directly in ${language}.  
The writing must sound as if it was originally created in ${language} by a native professional—not translated or adapted.

OUTPUT: ${language} ONLY. No other languages. No meta commentary.

RULE 1: Language Purity
• Every JSON field is written entirely in ${language} (100% native fluency)
• ZERO words from other languages (except globally recognized acronyms like MFA, SPF, DMARC, DKIM)
• No mixed-language fragments or translation residue

RULE 2: Expression Quality (Create, Don't Translate)
• Ignore any English phrasing in this prompt—they illustrate patterns only
• Express each idea naturally in ${language}, using authentic tone, rhythm, and idioms
• WRONG ❌: Literal, mechanical, or word-for-word phrasing
• RIGHT ✅: Fluent, natural, idiomatic, and professional writing that feels native

RULE 3: Quality & Readability
• Professional, confident, approachable tone — colleague-to-colleague
• Clear, active verbs and smooth sentence flow
• Short sentences (≈8–18 words), one idea per line
• Plain, concrete vocabulary; avoid academic or bureaucratic style
${vocabularyGuidance.simplification}
${vocabularyGuidance.conversational}
• Consistent terminology, voice, and perspective throughout

RULE 4: Clarity & Authenticity
• Sound like real learning material written for real people
• Avoid machine-translation artifacts, awkward constructions, redundancy, or stiff formal tone
• Prioritize clarity, engagement, and natural rhythm

FINAL CHECK:
Ask yourself: "Would a native professional in ${language} naturally say or write this?"  
If the answer is NO → rewrite before output.

=== CONTENT BEHAVIOR ===
- Replace ALL placeholders with real, topic-specific content
- Use short sentences, plain language, memory-friendly phrasing
- Never leave placeholders like "clear benefit statement" or "concise point"
- Never change scene_type values (must remain: intro, goal, scenario, actionable_content, quiz, survey, nudge, summary)

=== LEARNING SCIENCE ===
- Use memory-friendly patterns: repeat key points, chunk information (3-5 items max)
- Link actions to outcomes: "When you [action], you [benefit]"
- Keep cognitive load low: one concept per screen, simple language

=== OUTPUT FORMAT (CRITICAL - FINAL REMINDER) ===
- Return ONLY valid JSON (no markdown, no backticks)
- Start directly with {
- Keep JSON structure EXACTLY as provided (no extra keys, no omissions)
- Output must be STRICT JSON only
`;
}

/**
 * Build context data (task-specific information)
 * Contains topic, department, objectives, and scientific context
 */
export function buildContextData(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
   return `
Generate ${analysis.language} training content for "${analysis.topic}" in STRICT JSON only.

=== CONTEXT ===
- Level: ${analysis.level} | Department: ${analysis.department}
- Category: ${analysis.category}${analysis.subcategory ? ` / ${analysis.subcategory}` : ''}
- Objectives: ${analysis.learningObjectives.join(', ')}
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

=== CONTENT RULES FOR THIS TASK ===
1. **Topic Consistency**
   - Keep all content focused strictly on ${analysis.topic}.
   - Use consistent terminology and examples directly tied to ${analysis.topic}.
   - Avoid unrelated concepts, characters, or domains.

2. **Domain Guardrails**
   - Content must align with the given category/subcategory and key topics.
   - Security-specific terms (phishing, reporting, email) are allowed **only** if category/key topics explicitly mention them.
   - Choose Lucide icons semantically matched to topic/category. Never default to generic security icons unless explicitly relevant.
`;
}
