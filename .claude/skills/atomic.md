# /atomic - Atomic Decomposition Framework

Break large changes into minimal, reversible, testable phases.

## Usage
```
/atomic [complex task description]
```

## What it does

Decomposes large refactorings into manageable atomic phases:

### PHASE DESIGN PRINCIPLES

1. **Single Responsibility**
   - Each phase does ONE thing well
   - Can be understood in one read
   - Can be tested in isolation

2. **Zero Risk to Non-Zero Risk Progression**
   - Phase 1: 🟢 **EXTRACTION** (zero risk, move code unchanged)
   - Phase 2: 🟢 **VALIDATION** (add tests, catch regressions)
   - Phase 3: 🟡 **CENTRALIZATION** (reduce duplication)
   - Phase 4: 🟠 **REFACTORING** (modify behavior)

3. **Reversibility**
   - Each phase can be reverted independently
   - `git revert PHASE_COMMIT` works cleanly
   - No accumulated complexity

4. **Verifiability**
   - Each phase has measurable verification
   - Before/after metrics clearly defined
   - Tests prove no regressions

## Example Decomposition

**Task:** Refactor prompt-builders directory (944 lines, high duplication)

```
PHASE 1 - EXTRACTION (Zero Risk) ✅
├─ Extract landing-page-prompts.ts from phishing-prompts.ts
├─ No logic changes (byte-by-byte identical)
├─ Tests: Baseline → 7056 → 7056 (no change)
├─ Risk: 🟢 ZERO (copy-paste with import update)
└─ Verification: Diff shows only imports/function calls

PHASE 2 - VALIDATION (Zero Risk) ✅
├─ Create prompt-validation.test.ts (+29 tests)
├─ Validates all prompts meet quality standards
├─ Tests: 7056 → 7126 (+70 tests)
├─ Risk: 🟢 ZERO (new tests only)
└─ Verification: All 29 tests pass, zero failures

PHASE 3 - CENTRALIZATION (Low Risk) ✅
├─ Move magic numbers to constants.ts
├─ Update 15 references across 3 files
├─ Tests: 7126 → 7126 (no change)
├─ Risk: 🟡 LOW (constants are simple)
└─ Verification: Test values adjust, behavior identical

PHASE 4 - REFACTORING (Medium Risk) ⏳
├─ Eliminate 95% duplication with composition pattern
├─ Modify buildEmailPrompts & buildAnalysisPrompts
├─ Tests: 7126 → 7150 (+24 new coverage tests)
├─ Risk: 🟠 MEDIUM (logic changes, impacts email generation)
└─ Verification: New tests cover all branches

PHASE 5 - TYPE SAFETY (Low Risk) ⏳
├─ Add type guards for landing page parameters
├─ Create discriminated union for analysis types
├─ Tests: 7150 → 7150 (same, but stricter)
├─ Risk: 🟡 LOW (compilation-time only)
└─ Verification: TypeScript strict mode passes
```

## Phase Template

```markdown
## PHASE N - [ACTION] ([Risk Level])

**What it does:**
- Single sentence describing outcome

**Files affected:**
- List exactly which files change

**Lines of change:**
- Rough estimate (100 lines, 5 functions, etc)

**Testing strategy:**
- What tests verify this phase?
- Baseline → Expected after phase

**Rollback plan:**
- Single git revert command?
- Any state cleanup needed?

**Verification checklist:**
□ Code: specific review points
□ Tests: all passing, no regressions
□ Git: clean diff, no accidents
□ Types: TypeScript strict mode passes
```

## From SKILLS.md
See SKILLS.md for atomic refactoring patterns, verification strategies, and phase dependency management.
