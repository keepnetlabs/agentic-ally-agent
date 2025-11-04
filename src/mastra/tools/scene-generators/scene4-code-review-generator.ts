import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';
import { buildContextData } from '../../utils/prompt-builders/base-context-builder';

export function generateScene4CodeReviewPrompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  const contextData = buildContextData(analysis, microlearning);

  return `${contextData}

CODE REVIEW SCENE - Secure Code Analysis:
PURPOSE: Teach developers to identify security vulnerabilities in real code examples.
FORMAT: Show intentionally vulnerable code with explanations, allowing learner to understand the flaw.

CRITICAL RULES:
1. Code MUST be intentionally VULNERABLE - the goal is to show what NOT to do
2. The vulnerability should match the topic (e.g., SQL Injection for SQL topics, XSS for web topics)
3. Language should be detected from topic or use common languages: javascript, python, java, php, c#, go, rust
4. Hints should guide learning, not give direct answers
5. All text in ${analysis.language}

CODE REVIEW SCENE (Always code-focused):
CRITICAL: This scene is ALWAYS a code review exercise with intentionally vulnerable code.
- iconName: MUST always be "code" - code review visual indicator
- The code snippet MUST contain a realistic security vulnerability relevant to the topic
- Language should match the vulnerability type (e.g., JavaScript for XSS, SQL for SQL Injection)
- All text guides learner to IDENTIFY the flaw, not implement the fix

{
  "4": {
    "title": "Code review task title (max 8 words). Topic-aware instruction. Examples: 'Review the code for risks' | 'Find the security flaw' | 'Spot the vulnerability'. Pattern: Action verb + code/vulnerability focus",
    "subtitle": "Learning objective statement (max 12 words). Describe what learner will identify. Examples: 'Identify logic errors and security vulnerabilities' | 'Spot missing input validation' | 'Find the unsafe DOM access'. Pattern: Action verb (Identify/Spot/Find) + specific flaw types",
    "description": "Task instruction for learner (max 25 words). Clearly explain what the code snippet demonstrates. Examples: 'The snippet below contains at least one insecure practice. Highlight the issue and explain how you would mitigate it.' | 'This code has a security flaw. Can you find it and describe the risk?'",
    "helperText": "Learning hint to focus analysis (max 15 words). Guide learner to the vulnerability area. Examples: 'Look for missing validation, unsafe DOM access, or unescaped output.' | 'Check how user input is being handled.' | 'Notice any missing security checks'",
    "successHelperText": "Positive confirmation message (max 15 words). Reinforce learning achievement. Examples: 'Great job! Note what you found and continue to the next step.' | 'Excellent analysis. You identified the core security issue.' | 'Well spotted. Understanding this pattern prevents real attacks.'",
    "callToActionText": "Initial review button label. Localize to ${analysis.language}. Examples: 'Review before continuing'. Output the localized text directly.",
    "successCallToActionText": "Completion button label after review. Localize to ${analysis.language}. Examples: 'Continue'. Output the localized text directly.",
    "checkButtonLabel": "Security validation button label. Localize to ${analysis.language}. Examples: 'Check code'. Output the localized text directly.",
    "issueType": "Type of issue in the code (string, required for API validation). Describe the specific flaw. Examples: 'SQL Injection' | 'Cross-Site Scripting (XSS)' | 'Missing Input Validation' | 'Buffer Overflow' | 'Logic Error'. Must be clear and specific.",
    "codeSnippet": {
      "language": "Programming language matching the vulnerability type. Detect from topic. Options: javascript, python, java, php, c#, go, rust, sql, typescript. MUST match the topic context (e.g., JavaScript for XSS, Python for injection, SQL for SQL attacks).",
      "content": "Intentionally vulnerable code (15-30 lines). Must be: 1) Realistic and plausible 2) Contain obvious flaw when examined 3) Use clear variable/function names 4) Include comments hinting at intent 5) NOT include fix comments - let learner find the issue. Examples: SQL Injection→user input concatenated into query | XSS→unsanitized user data in innerHTML | Missing validation→no input checks before processing"
    },
    "checkStatusTexts": {
      "checking": "Message during code analysis (max 15 words). Example: 'Analyzing the snippet…' | 'Reviewing your analysis...' | 'Checking code...'",
      "success": "Message when code review completed successfully (max 20 words). Example: 'No critical issues detected. You can continue.' | 'Good analysis. You identified the vulnerability.' | 'Correct. This is a real security risk.'",
      "error": "Message prompting learner to review again (max 20 words). Example: 'We spotted risky patterns. Fix them and run the check again.' | 'Not quite. Look for input handling issues.' | 'Review the code more carefully for security flaws.'"
    },
    "ariaTexts": {
      "mainLabel": "Accessibility label for the entire code review scene. Example: 'Code review exercise'",
      "mainDescription": "Accessibility description of what the scene does. Example: 'Interactive code block for manual security review'",
      "codeRegionLabel": "Accessibility label for code display area. Example: 'Code block'",
      "codeRegionDescription": "Accessibility description of code region. Example: 'Editable code snippet to inspect for security vulnerabilities'",
      "checkButtonLabel": "Accessibility label for check button. Example: 'Check code'"
    }
  }
}

CRITICAL:
1. Use EXACTLY these JSON keys - do not add or remove any
2. All field descriptions are within their values - adapt to ${analysis.topic} context, NOT instruction copies
3. Code MUST be intentionally VULNERABLE - show what NOT to do
4. All text in ${analysis.language}
5. NO placeholders, NO "Return...", NO "Output..." - just the final text
6. Code language MUST match the vulnerability type context
`;
}
