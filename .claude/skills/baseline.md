# /baseline - Before/After Metrics Framework

Capture quantitative proof that changes maintain behavior.

## Usage
```
/baseline [file or directory]
```

## What it does

Establishes baseline metrics and verifies zero regressions:

### BASELINE DIMENSIONS

1. **Code Metrics**
   - File line count (LOC)
   - Function count and complexity
   - Import count and dependencies
   - Duplication percentage

2. **Test Metrics**
   - Test count (unit, integration, e2e)
   - Test pass rate
   - Coverage percentage
   - Skipped/flaky tests

3. **Quality Metrics**
   - TypeScript errors (strict mode)
   - ESLint violations by type
   - Unused imports
   - Type safety gaps

4. **Behavioral Metrics**
   - Critical function outputs (sample test runs)
   - Prompt output consistency
   - API response structure
   - Error handling coverage

## Example Baseline Report

```
📊 BASELINE METRICS

🔵 CODE METRICS - Before
- phishing-prompts.ts: 944 LOC
- buildEmailPrompts: 12 branches (cyclomatic complexity)
- Imports: 14 (3 unused)
- Duplication: 95% overlap in quishing vs normal variants

🔵 TEST METRICS - Before
- Unit tests: 7056 passing
- Coverage: prompt-builders 68%
- Skipped tests: 0
- Flaky: 0

🔵 QUALITY - Before
- TypeScript errors: 2 (type mismatches)
- ESLint violations: 5 (unused imports)
- Unused functions: 1 (dead code)

---

🟢 CODE METRICS - After
- phishing-prompts.ts: 725 LOC (-23%)
- landing-page-prompts.ts: 264 LOC (new)
- buildEmailPrompts: 12 branches (unchanged)
- Imports: 6 per file (no unused)
- Duplication: Extraction removes 236 lines

🟢 TEST METRICS - After
- Unit tests: 7126 passing (+70)
- Coverage: prompt-builders 84% (+16%)
- Skipped tests: 0 (unchanged)
- Flaky: 0 (unchanged)

🟢 QUALITY - After
- TypeScript errors: 0 ✅
- ESLint violations: 0 ✅
- Unused functions: 0 ✅

---

✅ REGRESSION ANALYSIS
- All baseline metrics stable or improved
- Behavior verification: 100% pass rate
- No breakage detected in dependent code
- Ready for production
```

## Verification Checklist

```markdown
### Before Change
- [ ] Record: File LOC, complexity, imports
- [ ] Record: Test count, pass rate, coverage
- [ ] Record: TypeScript/ESLint violations
- [ ] Document: Critical function outputs (2-3 test runs)
- [ ] Commit: Baseline snapshots to notes

### After Change
- [ ] Record: Same metrics as above
- [ ] Compare: Deltas acceptable?
- [ ] Verify: Test pass rate ≥ baseline
- [ ] Verify: TypeScript errors ≤ baseline
- [ ] Verify: Coverage ≥ baseline
- [ ] Document: Behavior unchanged (sample runs match)

### Regression Detection
- [ ] New failures in tests? STOP, investigate
- [ ] Type safety worse? STOP, fix
- [ ] Complexity increased? Document reason
- [ ] Coverage decreased? Add tests
```

## Baseline Snapshot Template

```json
{
  "timestamp": "2025-01-27T10:30:00Z",
  "phase": "Before Refactoring",
  "files": {
    "phishing-prompts.ts": {
      "loc": 944,
      "functions": 8,
      "complexity": "12 branches",
      "imports": 14,
      "unused_imports": 3
    }
  },
  "tests": {
    "total": 7056,
    "passing": 7056,
    "failing": 0,
    "skipped": 0
  },
  "quality": {
    "typescript_errors": 2,
    "eslint_violations": 5,
    "coverage_percent": 68
  },
  "behavior_samples": {
    "buildEmailPrompts": "Output stable across 5 test runs",
    "buildLandingPageSystemPrompt": "Output stable across 5 test runs"
  }
}
```

## Critical Outputs to Preserve

When refactoring code that generates content, verify outputs match:

```typescript
// BEFORE: Sample output
const emailBefore = buildEmailPrompts({...});
// Hash: abc123def456...

// AFTER: Same input
const emailAfter = buildEmailPrompts({...});
// Hash: abc123def456... (must match)
```

## From SKILLS.md
See SKILLS.md for verification strategies, regression detection methodology, and metric-driven development practices.
