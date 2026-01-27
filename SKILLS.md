# Claude Code - Working Methodology & Skills Guide

**How Claude approaches complex development tasks systematically.**

---

## 📋 Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [Task Analysis Framework](#task-analysis-framework)
3. [Safety-First Protocols](#safety-first-protocols)
4. [Code Review Methodology](#code-review-methodology)
5. [Refactoring Patterns](#refactoring-patterns)
6. [Testing & Verification](#testing--verification)
7. [Communication Style](#communication-style)
8. [Decision-Making Framework](#decision-making-framework)

---

## 🎯 Core Philosophy

### Principle 1: Never Assume, Always Verify
```
❌ WRONG: "I think this file might have errors"
✅ RIGHT: Read the file, check TypeScript diagnostics, run tests
```

**In Practice:**
- Always read code before modifying
- Run full test suite before/after changes
- Check git diff to verify exact changes
- Use diagnostic tools (TypeScript, ESLint)

### Principle 2: Atomic, Reversible Changes
```
❌ WRONG: Make 10 changes, commit once
✅ RIGHT: Small logical changes, separate commits, easy rollback
```

**In Practice:**
- One feature per commit
- Each commit is self-contained and works
- Can revert any commit without breaking others
- Git history tells a story

### Principle 3: Talk Through Before Acting
```
❌ WRONG: Start coding immediately
✅ RIGHT: Plan → Verify → Code → Test → Review
```

**In Practice:**
- Explain the approach first
- Get confirmation before major changes
- Break complex tasks into phases
- Parallel checks where possible

### Principle 4: Risk Assessment Always
```
RISK MATRIX:
- LOW RISK: New files, pure additions, documentation
- MEDIUM RISK: Code modifications, logic changes
- HIGH RISK: Structural refactors, deleting code, type changes

RULE: Only proceed with HIGH RISK after explicit approval
```

---

## 📊 Task Analysis Framework

### Step 1: Understand the Scope

**Questions Always Asked:**
```
1. What exactly needs to be done?
2. What could go wrong?
3. What's the scope? (1 file? 10 files? System-wide?)
4. What are the constraints? (Timeline? Risk tolerance?)
5. Are there dependencies?
```

**Example: This Project**
```
✅ Scope: Prompt builders improvement
✅ Constraints: Can't break production, must pass tests
✅ Dependencies: Constants.ts, phishing-prompts.ts related
✅ Risk: HIGH for logic changes, ZERO for docs/tests
```

### Step 2: Map Dependencies

**Always Create a Dependency Graph:**
```
phishing-prompts.ts
    ↓
shared-email-rules.ts
    ↓
constants.ts
    ↓
Tests (phishing-prompts.test.ts)

IMPACT: Change shared-email-rules.ts → breaks phishing-prompts.ts
MITIGATION: Extensive testing + git history tracking
```

### Step 3: Identify All Touch Points

**Search Pattern:**
```bash
# Before refactoring, find all usage:
grep -r "buildLandingPageSystemPrompt" src/
grep -r "PHISHING_EMAIL" src/
grep -r "300 character\|600px\|24 hour" src/
```

**Why:** Prevents missing refactoring locations

### Step 4: Create Baseline

**Before any change:**
```bash
# Take snapshot
npm test 2>&1 | tail -5  # Capture test counts
npm run lint 2>&1 | wc -l  # Capture error counts
git status                 # List all files

# Keep these values for verification AFTER changes
```

---

## 🛡️ Safety-First Protocols

### Protocol 1: Zero-Risk Extract Pattern

**For moving code without changing logic:**

```typescript
// STEP 1: Create NEW file (no risk)
// landing-page-prompts.ts ← 100% COPY from phishing-prompts.ts
function buildLandingPageSystemPrompt(...) {
  return `... exact same content ...`
}

// STEP 2: Verify function outputs identical
// Test: buildLandingPageSystemPrompt() === originalInlinePrompt()

// STEP 3: Update importer (minimal change)
// phishing-prompts.ts
const systemPrompt = buildLandingPageSystemPrompt(...)  // ← NEW

// STEP 4: Run full test suite
// Result: 7056 tests passed (same as before)

// STEP 5: Commit with clear message
git commit -m "refactor: extract landing page prompts (NO LOGIC CHANGE)"
```

**Key Insight:** Each step is testable in isolation

### Protocol 2: Magic Numbers Centralization

**When extracting hardcoded values to constants:**

```typescript
// STEP 1: Add to constants (new space, no breaking changes)
export const PHISHING_EMAIL = {
  MAX_DESCRIPTION_LENGTH: 300,  // ← NEW
  QR_CODE_IMAGE_WIDTH_PX: 200,  // ← NEW
}

// STEP 2: Verify constant values match current usage
grep -r "300 character" src/  # Should find multiple
grep -r "200px" src/          # Should find multiple

// STEP 3: Replace each location with constant reference
// OLD: "300 characters or less"
// NEW: "${PHISHING_EMAIL.MAX_DESCRIPTION_LENGTH} characters or less"

// STEP 4: Run tests AFTER EACH REPLACEMENT
// Verify tests still pass after each change

// STEP 5: Final verification
// Verify all 11 locations replaced
// Verify no hardcoded "300" or "200px" left in prompts
```

**Key Insight:** Incremental replacement reduces breakage risk

### Protocol 3: Test-Driven Verification

**Always verify before → after behavior is identical:**

```typescript
// STEP 1: Capture baseline behavior
const baseline = buildPhishingEmailPrompts(testParams);
const baselineLength = baseline.systemPrompt.length;
const baselineHash = md5(baseline.systemPrompt);

// STEP 2: Make refactoring changes

// STEP 3: Verify identical output
const afterRefactor = buildPhishingEmailPrompts(testParams);
const afterLength = afterRefactor.systemPrompt.length;
const afterHash = md5(afterRefactor.systemPrompt);

// STEP 4: Assert
expect(afterHash).toBe(baselineHash);  // Byte-for-byte identical
expect(afterLength).toBe(baselineLength);
```

**Key Insight:** Can prove refactoring didn't change behavior

---

## 🔍 Code Review Methodology

### The "SCAN" Approach

**S - Structure**
```typescript
// Ask:
- Is code organized logically?
- Do imports make sense?
- Are there circular dependencies?
- File size appropriate? (<500 LOC preferred)

// Example this project:
✅ phishing-prompts.ts = 724 lines (could split)
✅ landing-page-prompts.ts = 263 lines (good size)
✅ shared-email-rules.ts = 180 lines (perfect)
```

**C - Correctness**
```typescript
// Ask:
- Does code do what it claims to do?
- Are edge cases handled?
- Are there off-by-one errors?
- Do type checks pass?

// Example this project:
✅ emailUsesLogoTag properly coerced with !!
⚠️ No validation of invalid difficulty (silent defaults)
⚠️ Magic strings scattered in prompts
```

**A - Abstraction**
```typescript
// Ask:
- Is code duplicated?
- Could helpers extract common patterns?
- Are functions doing too much?
- Can this be made more generic?

// Example this project:
❌ buildQuishingAnalysisPrompts & buildNormalPhishingAnalysisPrompts = 95% duplicate
✅ shared-email-rules.ts = excellent centralization
⚠️ Constants partially centralized (15 magic numbers now in constants)
```

**N - Naming**
```typescript
// Ask:
- Are variable names clear?
- Do function names describe what they do?
- Could a new developer understand intent?
- Are naming conventions consistent?

// Example this project:
✅ buildLandingPageSystemPrompt - clear and specific
✅ getDepartmentContext - verb + noun pattern
⚠️ Some rules use CAPS (AUTH_CONTEXT) vs SNAKE_CASE
```

---

## 🔧 Refactoring Patterns

### Pattern 1: Extract to Constant

**When:** A value is used in multiple places or is a "magic number"

```typescript
// BEFORE
if (difficulty === 'Easy') { ... }
if (difficulty === 'Medium') { ... }
if (difficulty === 'Hard') { ... }

// AFTER
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'] as const;
type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

if (DIFFICULTY_LEVELS.includes(difficulty)) { ... }
```

**Benefits:** Single source of truth, reusable, type-safe

### Pattern 2: Extract to Helper Function

**When:** Same logic repeated 2+ times

```typescript
// BEFORE (repeated 3 times)
const emailUsesLogoTag1 = template && template.includes('{CUSTOMMAINLOGO}');
const emailUsesLogoTag2 = template && template.includes('{CUSTOMMAINLOGO}');
const emailUsesLogoTag3 = template && template.includes('{CUSTOMMAINLOGO}');

// AFTER
function checkEmailUsesLogo(template?: string): boolean {
  return !!(template && template.includes('{CUSTOMMAINLOGO}'));
}

const usesLogo = checkEmailUsesLogo(template);
```

**Benefits:** Easier to maintain, testable, clearer intent

### Pattern 3: Extract to File

**When:** A concept (rules, validators, helpers) grows >200 lines

```typescript
// BEFORE: All in phishing-prompts.ts (944 lines)

// AFTER: Split into:
- phishing-prompts.ts (core logic)
- landing-page-prompts.ts (landing page system prompt)
- shared-email-rules.ts (reusable rules)
- validators.ts (input validation)
- prompt-templates.ts (template functions)
```

**Benefits:** Easier to navigate, test, and maintain

### Pattern 4: Extract to Type Guard

**When:** Need to check if value matches a type multiple times

```typescript
// BEFORE
const difficultyRules = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
// ↑ Unsafe cast, repeated pattern

// AFTER
function isDifficultyLevel(value: string): value is 'Easy' | 'Medium' | 'Hard' {
  return ['Easy', 'Medium', 'Hard'].includes(value);
}

// Usage:
if (isDifficultyLevel(params.difficulty)) {
  const rules = DIFFICULTY_CONFIG[params.difficulty];  // Type-safe!
}
```

**Benefits:** Type-safe, reusable, self-documenting

---

## ✅ Testing & Verification

### Test Pyramid Approach

```
          ▲
         ╱│╲  E2E Tests (1-2)
        ╱ │ ╲ Full workflow, real output
       ╱──┼──╲
      ╱   │   ╲ Integration Tests (5-10)
     ╱    │    ╲ Component interactions
    ╱─────┼─────╲
   ╱      │      ╲ Unit Tests (20-50)
  ╱       │       ╲ Individual functions
 ╱────────┼────────╲
╱         │         ╲ Lint/Type Checks (automated)
──────────┴─────────── Build passes, types check
```

**This Project Example:**
```
✅ E2E: buildLandingPagePrompts() produces valid HTML prompt (1 test)
✅ Integration: Landing page + email + analysis work together (7 tests)
✅ Unit: Each rule component works correctly (21 tests)
✅ Linting: ESLint passes, TypeScript clean (automated)
```

### Verification Checklist

**Before Committing:**
```
□ Read all changed files one more time
□ Run: npm run lint
□ Run: npm test (check all tests pass)
□ Run: npx tsc --noEmit (type check)
□ Check: git diff (review exact changes)
□ Verify: No console.logs left
□ Verify: No commented-out code left
□ Ask: "Would I be comfortable with this in production?"
```

**After Committing (Verification):**
```
□ git log --oneline (see commit message)
□ git diff HEAD~1 (review changes in final commit)
□ npm test (full suite passes)
□ Confirm no regressions vs baseline
```

---

## 💬 Communication Style

### Principle 1: Explain Before Acting

**Pattern:**
```
✅ GOOD: "I'll extract landing page prompts to a new file because
         it's 23% of phishing-prompts.ts and can be reused. This is
         ZERO RISK - same logic, just moved. After extraction:
         phishing-prompts.ts: 944 → 720 lines, tests unchanged."

❌ BAD: "Extracting landing page prompts"
```

### Principle 2: Show Evidence, Not Opinions

**Pattern:**
```
✅ GOOD: "Tests: 7126 passed. ESLint: 0 errors. TypeScript: 0 errors.
         Code diff shows 236-line removal from phishing-prompts.ts,
         236-line addition to landing-page-prompts.ts (identical content)."

❌ BAD: "I think this is better"
```

### Principle 3: Offer Choices, Not Dictates

**Pattern:**
```
✅ GOOD: "Three approaches:
         A) Low risk: extract landing pages (pure reorganization)
         B) Medium risk: consolidate validators
         C) High risk: refactor analysis prompts
         Which would you prefer?"

❌ BAD: "I'm going to refactor everything"
```

### Principle 4: Summary + Next Steps

**Pattern:**
```
✅ GOOD: "PHASE 1 Complete:
         ✅ landing-page-prompts.ts extracted (264 lines)
         ✅ phishing-prompts.ts refactored (944 → 725 lines)
         ✅ Tests: 7056 passed, no regressions
         ✅ Git ready: 2 new files, 1 modified file

         Next: PHASE 3 or commit?"

❌ BAD: "Done"
```

---

## 🧠 Decision-Making Framework

### Risk-Impact Matrix

```
               ▲ IMPACT
               │
          HIGH │  DO IT    │  PLAN CAREFULLY
               │  (Quick   │  (Get approval,
               │   wins)   │   phase carefully)
               │           │
          MED  │  MAYBE    │  DISCUSS FIRST
               │  (Nice    │  (High risk,
               │   to      │   needs consensus)
               │   have)   │
               │           │
          LOW  │  SKIP     │  AUDIT ONLY
               │  (Not     │  (Read-only,
               │   worth   │   no code change)
               │   it)     │
               └───────────┴────────────────► RISK
                  LOW      MED      HIGH
```

**This Project Examples:**

```
✅ Extract landing prompts (HIGH impact, LOW risk) → DO IT
✅ Add validation tests (HIGH impact, LOW risk) → DO IT
✅ Centralize magic numbers (HIGH impact, LOW risk) → DO IT
✅ Consolidate processors (HIGH impact, MEDIUM risk) → PLAN CAREFULLY
❌ Full prompt rewrite (LOW impact, HIGH risk) → SKIP
⚠️  Refactor analysis prompts (MEDIUM impact, MEDIUM risk) → DISCUSS FIRST
```

### Question Hierarchy

**Always ask in this order:**

```
1. SCOPE: What needs to be done? (Be specific)
   ↓
2. RISK: What could break? (Identify failure modes)
   ↓
3. DEPENDENCIES: What else might this affect? (Map impact)
   ↓
4. TESTING: How will we verify? (Define success)
   ↓
5. REVERSIBILITY: Can we rollback if needed? (Git history check)
   ↓
6. APPROVAL: Is this approach acceptable? (Get sign-off)
```

**Example - This Project:**
```
1. SCOPE: Refactor phishing prompts into separate modules
2. RISK: Could break AI prompt generation, need to test AI output
3. DEPENDENCIES: Tests, constants, landing-page-prompts
4. TESTING: Run full test suite, compare prompt outputs
5. REVERSIBILITY: Git commits atomic, can revert any
6. APPROVAL: ✅ User confirmed SAFE PATH approach
```

---

## 🎯 Workflow Summary: From Task to Completion

```
┌─────────────────────────────────────────────────────────┐
│ 1. UNDERSTAND                                           │
│    └─ Read requirement, ask clarifying questions        │
│    └─ Map scope, dependencies, risks                    │
│    └─ Create baseline (tests, metrics)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. PLAN                                                 │
│    └─ Break into phases (low-risk first)               │
│    └─ Identify touch points (grep, search)             │
│    └─ Explain approach, get approval                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. EXECUTE                                              │
│    └─ Start with Phase 1 (lowest risk)                 │
│    └─ Make atomic changes, test after each             │
│    └─ Verify: tests pass, linting clean, types OK      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. VERIFY                                               │
│    └─ Compare before/after metrics                      │
│    └─ Run full test suite                              │
│    └─ Check git diff for correctness                   │
│    └─ ESLint, TypeScript diagnostics                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. COMMUNICATE                                          │
│    └─ Summarize changes clearly                         │
│    └─ Show evidence (test counts, file changes)         │
│    └─ Explain trade-offs and next steps                │
│    └─ Ready for commit or next phase                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Best Practices Summary

### DO ✅
```
✅ Read code before modifying
✅ Run tests before and after changes
✅ Keep commits atomic and logical
✅ Explain approach before coding
✅ Use type system for safety
✅ Extract duplication to reusable pieces
✅ Test edge cases
✅ Document why, not just what
✅ Communicate progress clearly
✅ Ask for approval on high-risk changes
```

### DON'T ❌
```
❌ Assume without reading
❌ Make multiple unrelated changes
❌ Skip testing "because I'm sure"
❌ Silent defaults instead of errors
❌ Duplicate code when extracting would help
❌ Make risky changes without approval
❌ Commit without full test verification
❌ Use "obvious" when explaining
❌ Proceed without clear failure recovery plan
❌ Hope previous behavior was correct
```

---

## 🎓 Key Learnings from This Project

### What Worked Well
```
✅ Safety-first approach: Phase 1 (extract) before Phase 3 (constants)
✅ Atomic commits: Each phase is separate, reviewable, reversible
✅ Test-driven validation: Tests prove no regressions occurred
✅ Communication: Explained risk vs impact for each phase
✅ Verification: Multiple checks (tests, lint, typescript, diff)
```

### What Could Be Improved (Next Time)
```
⚠️  Consider: Document test plan before implementation
⚠️  Consider: Create task list for multi-phase projects
⚠️  Consider: Add metrics baseline reporting (before/after)
⚠️  Consider: Pair high-risk changes with new tests
```

---

## 💡 Remember

**Engineering is about trade-offs, not perfection.**

```
Risk vs Quality:
  Too conservative = Slow, misses opportunities
  Too aggressive = Breaks things, loses trust
  → Balance: Calculated risks with safety nets

Perfection vs Pragmatism:
  Over-engineering = Unmaintainable complexity
  Under-engineering = Technical debt, future pain
  → Balance: "Just enough" for current + foreseeable future

Speed vs Correctness:
  Rushing = Bugs, rework, trust loss
  Over-analyzing = Paralysis, missed deadlines
  → Balance: Understand deeply, act decisively
```

**The goal is always: Ship working code, minimize risk, maximize learning.**

---

**Last Updated:** January 27, 2026
**Version:** 1.0 (Initial - This Methodology)
