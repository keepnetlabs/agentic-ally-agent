// src/mastra/tools/user-management/behavior-analyst-constants.ts
// Centralized constants for behavioral resilience report generation

export const ANALYSIS_REFERENCES = [
  "ENISA – Cybersecurity Culture Guidelines (Behavioural Aspects of Cybersecurity)",
  "Loewenstein (1994) – Curiosity Gap",
  "Milgram (1963) – Authority Bias",
  "Duhigg (2012) – Habit Loop",
  "Kahneman & Tversky (1979) – Loss Aversion",
  "IBM – Cost of a Data Breach Report",
  "Verizon – Data Breach Investigations Report (DBIR)",
  "Gartner – Security Behavior and Culture Program (Context Only)"
];

export const ALLOWED_ENUMS_TEXT = `
Allowed values (use ONLY these):
- meta.access_level: LOW | MEDIUM | HIGH
- header.behavioral_resilience.current_stage / target_stage: Foundational | Building | Consistent | Champion
- simulations[].vector: EMAIL | QR
- simulations[].scenario_type: CLICK_ONLY | DATA_SUBMISSION
- simulations[].difficulty: EASY | MEDIUM | HARD
- simulations[].persuasion_tactic: AUTHORITY | URGENCY | CURIOSITY
- simulations[].nist_phish_scale.cue_difficulty: LOW | MEDIUM | HIGH
- simulations[].nist_phish_scale.premise_alignment: LOW | MEDIUM | HIGH
- nudges[].channel: TEAMS | EMAIL
- nudges[].cadence: ONE_OFF | WEEKLY | MONTHLY
- internal.behavior_science_engine.fogg_trigger_type: SIGNAL | SPARK | FACILITATOR
`;
