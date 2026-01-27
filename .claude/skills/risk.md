# /risk - Risk-Impact Assessment Framework

Evaluate change proposals using structured risk analysis.

## Usage
```
/risk [change description]
```

## What it does

Analyzes proposed changes across 4 dimensions and provides decision guidance:

### 1. **SCOPE**
- How many files affected?
- How many functions/features touched?
- Are dependencies clear?

### 2. **RISK FACTORS**
- **Regression Risk**: Will existing tests catch breakage?
- **Type Safety**: Are TypeScript guarantees maintained?
- **State Changes**: Does it affect shared state/globals?
- **Breaking Changes**: Are APIs compatible?
- **Edge Cases**: Untested scenarios?

### 3. **IMPACT ASSESSMENT**
- What's the maximum blast radius if wrong?
- How observable is the failure?
- How quickly can we rollback?
- User-facing or internal?

### 4. **DECISION FRAMEWORK**
- 🟢 **GREEN** (Do immediately): Risk < 5%, Impact minimal, high confidence
- 🟡 **YELLOW** (Proceed cautiously): Risk 5-20%, Medium impact, needs verification
- 🟠 **ORANGE** (Plan carefully): Risk 20-50%, High impact, requires atomization
- 🔴 **RED** (Reconsider approach): Risk > 50%, Severe impact, needs redesign

## Example Output

```
🟡 RISK ASSESSMENT

📊 SCOPE
- 3 files affected (phishing-prompts.ts, shared-email-rules.ts, constants.ts)
- 1 function modified (buildEmailPrompts)
- 2 dependencies (PHISHING_EMAIL constants)

⚠️ RISK FACTORS
- Regression Risk: LOW (29 validation tests cover this)
- Type Safety: MAINTAINED (TypeScript strict mode)
- State Changes: NONE (pure functions only)
- Breaking Changes: NONE (backward compatible)
- Edge Cases: UNKNOWN (empty arrays not tested)

📈 IMPACT
- Max Blast Radius: Email generation failures in production
- Observability: HIGH (test framework catches it)
- Rollback: FAST (git revert, no state migration)
- User-facing: YES (affects generated emails)

✅ DECISION: YELLOW - Proceed cautiously
- Add edge case tests before commit
- Phase in: centralize constants → validate → deploy
```

## From SKILLS.md
See SKILLS.md for decision-making framework and risk-impact matrix methodology.
