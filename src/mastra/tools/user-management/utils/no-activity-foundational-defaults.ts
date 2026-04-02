type FoundationalProfileFamily = 'finance' | 'hr' | 'it' | 'sales-marketing' | 'generic';

interface FoundationalSimulationDefaults {
  vector: 'EMAIL' | 'QR';
  scenarioType: 'CLICK_ONLY' | 'DATA_SUBMISSION';
  persuasionTactic: string;
  title: string;
  whyThis: string;
  designedToProgress: string;
  cueDifficulty: 'LOW' | 'MEDIUM';
  premiseAlignment: 'LOW' | 'MEDIUM';
}

export interface NoActivitySimulationShape {
  vector?: string;
  scenario_type?: string;
  difficulty?: string;
  persuasion_tactic?: string;
  title?: string;
  why_this?: string;
  designed_to_progress?: string;
  nist_phish_scale?: {
    cue_difficulty?: string;
    premise_alignment?: string;
  };
}

const NO_ACTIVITY_FOUNDATIONAL_PROFILES: Record<FoundationalProfileFamily, FoundationalSimulationDefaults[]> = {
  finance: [
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'AUTHORITY',
      title: 'Invoice review request',
      whyThis: 'Targets routine approval behavior with mild urgency and authority cues (Authority Bias).',
      designedToProgress: 'Build the habit of validating sender and payment context before opening finance-related links.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'AUTHORITY',
      title: 'Supplier payment detail verification',
      whyThis: 'Tests whether the user trusts account-update requests without independent verification (Friction reduction).',
      designedToProgress: 'Encourage out-of-band verification before entering finance or payment details.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
    {
      vector: 'QR',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'SCARCITY',
      title: 'Expense approval reminder',
      whyThis: 'Checks whether deadline pressure drives quick scanning behavior without link inspection (Urgency Effect).',
      designedToProgress: 'Reinforce pause-and-verify behavior before acting on deadline-based approval prompts.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'SCARCITY',
      title: 'Quarter-close document review',
      whyThis: 'Uses end-of-period urgency to test whether routine finance pressure lowers link scrutiny (Urgency Effect).',
      designedToProgress: 'Build the habit of checking sender legitimacy before opening close-of-period finance requests.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'CURIOSITY',
      title: 'Expense reimbursement status check',
      whyThis: 'Measures whether curiosity about pending reimbursement status leads to fast trust in a finance form (Curiosity Gap).',
      designedToProgress: 'Encourage finance users to verify reimbursement and payment forms before submitting any details.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
  ],
  hr: [
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'COMMITMENT',
      title: 'Policy acknowledgment reminder',
      whyThis: 'Uses familiar internal workflow cues to measure routine trust in policy notices (Habit Loop).',
      designedToProgress: 'Strengthen verification habits before opening internal acknowledgment links.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'AUTHORITY',
      title: 'Benefits profile confirmation',
      whyThis: 'Tests whether the user enters personal details when the request appears administrative and routine (Authority Bias).',
      designedToProgress: 'Encourage checking the source of HR forms before submitting personal information.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
    {
      vector: 'QR',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'SOCIAL_PROOF',
      title: 'Employee handbook update',
      whyThis: 'Measures whether familiar workplace cues reduce scrutiny when the message feels widely applicable (Social Proof).',
      designedToProgress: 'Promote careful review of employee-wide notices before scanning or clicking.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'SOCIAL_PROOF',
      title: 'Training completion reminder',
      whyThis: 'Uses familiar compliance language and peer-completion cues to reduce skepticism (Social Proof).',
      designedToProgress: 'Build a stronger habit of validating training and compliance links before opening them.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'COMMITMENT',
      title: 'Employee directory profile update',
      whyThis: 'Tests whether routine profile-maintenance tasks encourage users to trust a form too quickly (Consistency Principle).',
      designedToProgress: 'Encourage checking HR profile-update requests before entering employee information.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
  ],
  it: [
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'AUTHORITY',
      title: 'Password reset validation',
      whyThis: 'Targets routine account-access habits where authority and familiarity can lower scrutiny (Authority Bias).',
      designedToProgress: 'Build a pause-and-verify habit before entering credentials after receiving access notices.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'CURIOSITY',
      title: 'VPN access review',
      whyThis: 'Tests whether operational curiosity leads to link clicks without checking the source first (Curiosity Gap).',
      designedToProgress: 'Improve inspection of account and access-review prompts before clicking.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'QR',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'AUTHORITY',
      title: 'Security tool activation notice',
      whyThis: 'Measures whether technical users trust setup instructions too quickly when the message sounds official (Authority Bias).',
      designedToProgress: 'Encourage independent verification of security rollout messages before scanning QR codes.',
      cueDifficulty: 'MEDIUM',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'SCARCITY',
      title: 'Mailbox quota warning',
      whyThis: 'Uses everyday service urgency to test whether technical users click before checking the sender or destination (Urgency Effect).',
      designedToProgress: 'Build the habit of validating operational warnings before clicking remediation links.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'AUTHORITY',
      title: 'Single sign-on session verification',
      whyThis: 'Measures whether users trust a familiar access-control workflow when it appears routine and official (Authority Bias).',
      designedToProgress: 'Reinforce independent verification before entering credentials into access-verification pages.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
  ],
  'sales-marketing': [
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'SCARCITY',
      title: 'Event registration update',
      whyThis: 'Uses time-sensitive event messaging to test impulse clicking under deadline pressure (Scarcity Effect).',
      designedToProgress: 'Reduce fast clicks by encouraging checks on promotional and event-related links.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'SOCIAL_PROOF',
      title: 'Campaign asset access request',
      whyThis: 'Checks whether collaboration cues increase trust in shared-asset forms (Social Proof).',
      designedToProgress: 'Strengthen verification of shared-workspace prompts before entering credentials or campaign data.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
    {
      vector: 'QR',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'CURIOSITY',
      title: 'Lead list update notice',
      whyThis: 'Tests whether curiosity about pipeline changes drives quick scanning behavior (Curiosity Gap).',
      designedToProgress: 'Encourage link and QR verification before acting on lead or campaign updates.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'CURIOSITY',
      title: 'Webinar speaker asset update',
      whyThis: 'Tests whether curiosity about live campaign materials drives quick clicks without verification (Curiosity Gap).',
      designedToProgress: 'Encourage checking event and asset-update links before opening them.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'SCARCITY',
      title: 'Partner portal refresh request',
      whyThis: 'Uses time-sensitive collaboration language to see whether users rush through a familiar partner workflow (Urgency Effect).',
      designedToProgress: 'Build the habit of validating shared-workspace and partner-login prompts before entering data.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
  ],
  generic: [
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'AUTHORITY',
      title: 'Account review notice',
      whyThis: 'Uses a familiar administrative request to establish a foundational baseline for click behavior (Authority Bias).',
      designedToProgress: 'Build the habit of checking sender and destination before clicking routine notices.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'CURIOSITY',
      title: 'Document access confirmation',
      whyThis: 'Measures whether curiosity about shared content leads to premature form trust (Curiosity Gap).',
      designedToProgress: 'Encourage verification of document-access pages before entering any information.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
    {
      vector: 'QR',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'SCARCITY',
      title: 'Security notice follow-up',
      whyThis: 'Tests whether urgency cues are enough to trigger scanning without validating context first (Urgency Effect).',
      designedToProgress: 'Promote a pause-and-check habit before scanning codes from generic security notices.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'CLICK_ONLY',
      persuasionTactic: 'SOCIAL_PROOF',
      title: 'Shared workspace review notice',
      whyThis: 'Uses familiar collaboration language to test whether shared-review cues reduce verification behavior (Social Proof).',
      designedToProgress: 'Encourage validation of shared-workspace links before opening collaborative notices.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'LOW',
    },
    {
      vector: 'EMAIL',
      scenarioType: 'DATA_SUBMISSION',
      persuasionTactic: 'AUTHORITY',
      title: 'Portal access confirmation',
      whyThis: 'Measures whether a routine access check prompts fast trust in an administrative form (Authority Bias).',
      designedToProgress: 'Build a baseline habit of checking access-confirmation pages before entering information.',
      cueDifficulty: 'LOW',
      premiseAlignment: 'MEDIUM',
    },
  ],
};

const WEAK_VALUE_PATTERNS = [/^\s*$/, /^default$/i, /^generic$/i, /^n\/a$/i, /^unknown$/i, /^unspecified$/i];
const VALID_VECTORS = new Set(['EMAIL', 'QR']);
const VALID_SCENARIO_TYPES = new Set(['CLICK_ONLY', 'DATA_SUBMISSION']);
const VALID_DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);
const VALID_CUE_DIFFICULTIES = new Set(['LOW', 'MEDIUM', 'HIGH']);
const VALID_PREMISE_ALIGNMENTS = new Set(['LOW', 'MEDIUM', 'HIGH']);

function getStableBucket(seed: string, bucketCount: number): number {
  return seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % bucketCount;
}

function getFoundationalProfileFamily(department?: string, role?: string): FoundationalProfileFamily {
  const haystack = `${department || ''} ${role || ''}`.toLowerCase();

  if (/finance|account|billing|procurement|payroll/.test(haystack)) return 'finance';
  if (/human resources|hr|people|talent|recruit/.test(haystack)) return 'hr';
  if (/it|security|engineering|developer|infra|operations|devops|help.?desk/.test(haystack)) return 'it';
  if (/sales|marketing|growth|partnership|customer success|business development/.test(haystack)) return 'sales-marketing';

  return 'generic';
}

function isWeakValue(value?: string): boolean {
  return !value || WEAK_VALUE_PATTERNS.some(pattern => pattern.test(value.trim()));
}

export function buildNoActivitySimulationDefaults(params: {
  userId: string;
  department?: string;
  role?: string;
}): FoundationalSimulationDefaults {
  const family = getFoundationalProfileFamily(params.department, params.role);
  const profiles = NO_ACTIVITY_FOUNDATIONAL_PROFILES[family];
  return profiles[getStableBucket(params.userId, profiles.length)];
}

export function ensureNoActivitySimulationSlot(nextSteps: {
  simulations?: NoActivitySimulationShape[];
  microlearnings?: unknown[];
  nudges?: unknown[];
} | undefined): NoActivitySimulationShape | undefined {
  if (!nextSteps || typeof nextSteps !== 'object') return undefined;
  if (!Array.isArray(nextSteps.simulations)) {
    nextSteps.simulations = [];
  }
  if (!Array.isArray(nextSteps.microlearnings)) {
    nextSteps.microlearnings = [];
  }
  if (!Array.isArray(nextSteps.nudges)) {
    nextSteps.nudges = [];
  }
  if (!nextSteps.simulations[0] || typeof nextSteps.simulations[0] !== 'object') {
    nextSteps.simulations[0] = {};
  }
  return nextSteps.simulations[0];
}

export function applyNoActivitySimulationGuardrails(
  simulation: NoActivitySimulationShape | undefined,
  defaults: FoundationalSimulationDefaults
): void {
  if (!simulation || typeof simulation !== 'object') return;

  if (!VALID_VECTORS.has(simulation.vector || '')) {
    simulation.vector = defaults.vector;
  }

  if (!VALID_SCENARIO_TYPES.has(simulation.scenario_type || '')) {
    simulation.scenario_type = defaults.scenarioType;
  }

  if (!VALID_DIFFICULTIES.has(simulation.difficulty || '')) {
    simulation.difficulty = 'EASY';
  }

  if (isWeakValue(simulation.persuasion_tactic)) {
    simulation.persuasion_tactic = defaults.persuasionTactic;
  }

  if (isWeakValue(simulation.title)) {
    simulation.title = defaults.title;
  }

  if (isWeakValue(simulation.why_this)) {
    simulation.why_this = defaults.whyThis;
  }

  if (isWeakValue(simulation.designed_to_progress)) {
    simulation.designed_to_progress = defaults.designedToProgress;
  }

  if (!simulation.nist_phish_scale || typeof simulation.nist_phish_scale !== 'object') {
    simulation.nist_phish_scale = {};
  }

  if (!VALID_CUE_DIFFICULTIES.has(simulation.nist_phish_scale.cue_difficulty || '')) {
    simulation.nist_phish_scale.cue_difficulty = defaults.cueDifficulty;
  }

  if (!VALID_PREMISE_ALIGNMENTS.has(simulation.nist_phish_scale.premise_alignment || '')) {
    simulation.nist_phish_scale.premise_alignment = defaults.premiseAlignment;
  }
}
