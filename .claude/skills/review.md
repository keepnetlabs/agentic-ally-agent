# /review - Code Quality Review (SCAN Approach)

Analyze code using: **S**tructure, **C**orrectness, **A**bstraction, **N**aming

## Usage
```
/review [file or directory]
```

## What it does

1. **S - Structure**
   - File organization and size (prefer <500 LOC)
   - Import statements and dependencies
   - Circular dependency check
   - Module responsibilities

2. **C - Correctness**
   - Edge case handling
   - Input validation
   - Error handling strategy
   - Type safety and narrowing
   - Off-by-one errors

3. **A - Abstraction**
   - Code duplication detection
   - Repeated patterns
   - Function complexity (cyclomatic)
   - Opportunities for helpers/extraction
   - Generic vs specific implementations

4. **N - Naming**
   - Variable name clarity
   - Function naming conventions
   - Consistency across codebase
   - Self-documenting code

## Example Output

```
✅ STRUCTURE
- File: 724 lines (could split into 2-3 files)
- Imports: 14 (well-organized)
- No circular dependencies

⚠️ CORRECTNESS
- Line 103: Silent default for invalid difficulty
- Missing validation for language codes
- No null checks on optional parameters

✅ ABSTRACTION
- Good centralization in shared-email-rules.ts
- Some duplication in analysis builders (95% overlap)
- Consider extraction factory pattern

✅ NAMING
- Function names clear and descriptive
- Consistent patterns throughout
```

## From SKILLS.md
See SKILLS.md for detailed code review methodology
