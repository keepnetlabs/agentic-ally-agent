# /verify - Pre-Commit Verification Checklist

Comprehensive quality checks before committing changes.

## Usage
```
/verify
```

## What it does

Runs systematic verification across 5 quality dimensions:

### 1. **TYPE SAFETY**
- Run TypeScript diagnostics (VSCode IDE quick check)
- Zero TypeScript errors required
- All type annotations present for new code
- No `any` types in modified sections

### 2. **LINT COMPLIANCE**
- ESLint: 0 errors in modified files
- ESLint: 0 new warnings introduced
- Import statements clean (no unused imports)
- Code style consistent with codebase

### 3. **TEST COVERAGE**
- All tests pass locally
- New code has corresponding tests
- Test names descriptive (not "it works" or "test 1")
- No skipped tests (`.only`, `.skip`)

### 4. **FUNCTIONAL VERIFICATION**
- Before/After metrics align
- No regressions in test count
- Critical paths tested and passing
- Edge cases considered

### 5. **GIT HYGIENE**
- `git status`: Shows only intended changes
- `git diff`: No accidental modifications
- Commit message clear and specific
- Related changes grouped logically

## Example Output

```
✅ VERIFICATION COMPLETE

📋 TYPE SAFETY
- TypeScript diagnostics: 0 errors ✅
- New functions typed: ✅
- No `any` types added: ✅

🔍 LINT COMPLIANCE
- ESLint: 0 errors ✅
- Unused imports removed: 4 cleaned ✅
- Code style consistent: ✅

✅ TEST COVERAGE
- All tests passing: 7126/7126 ✅
- New test count: +29 tests ✅
- Test names descriptive: ✅
- No skipped tests: ✅

📊 FUNCTIONAL VERIFICATION
- Baseline: 7056 tests → After: 7126 tests ✅
- Regression check: 0 failures ✅
- Critical paths: 3/3 passing ✅
- Edge cases: 1 flagged for future work

🔗 GIT HYGIENE
- Only intended files staged: ✅
- No accidental console.logs: ✅
- Commit message clear: ✅

✅ READY TO COMMIT
```

## Verification Checklist Template

```
Before committing, verify:
□ TypeScript: 0 errors
□ ESLint: 0 errors, 0 new warnings
□ Tests: All passing, no regressions
□ Git: Only intended changes staged
□ Review: Code quality meets standards
□ Docs: Any behavior changes documented
```

## From SKILLS.md
See SKILLS.md for comprehensive testing & verification strategy and pre-commit discipline methodology.
