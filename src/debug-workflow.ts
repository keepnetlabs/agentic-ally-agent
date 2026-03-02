#!/usr/bin/env npx tsx
/**
 * Debug Workflow — Manual trigger for Autonomous generation
 *
 * Don't wait for Cron. Run this locally to test the full autonomous flow.
 * Logs detailed emojis (🤖, ✅, ❌) to show exactly what step failed.
 *
 * Usage:
 *   npx tsx src/debug-workflow.ts
 *   npx tsx src/debug-workflow.ts --user=user-123
 *   npx tsx src/debug-workflow.ts --group=group-456
 *   npx tsx src/debug-workflow.ts --phishing-only --user=user-123
 *   npx tsx src/debug-workflow.ts --training-only --group=group-456
 *   npx tsx src/debug-workflow.ts --smishing-only --user=user-123
 *   npx tsx src/debug-workflow.ts --vishing-call-only --user=user-123
 *
 * Options:
 *   --user=ID       Target user by resource ID (fast path)
 *   --group=ID      Target group by resource ID
 *   --name=First Last  Target user by name (slow path, requires search)
 *   --phishing-only Run only phishing action
 *   --training-only Run only training action
 *   --smishing-only Run only smishing action
 *   --vishing-call-only Run only vishing-call (outbound voice simulation, user must have phone)
 *   --send-training After phishing, send training
 *   --lang=code     Preferred language (e.g. en-gb, tr-tr)
 */

import 'dotenv/config';
import { executeAutonomousGeneration } from './mastra/services/autonomous';
import type { AutonomousAction } from './mastra/types';

const PREFIX = {
  start: '🤖',
  ok: '✅',
  fail: '❌',
  info: '📋',
};

function parseArgs(): {
  targetUserResourceId?: string;
  targetGroupResourceId?: string;
  firstName?: string;
  lastName?: string;
  actions: AutonomousAction[];
  sendAfterPhishingSimulation: boolean;
  preferredLanguage?: string;
} {
  const args = process.argv.slice(2);
  let targetUserResourceId: string | undefined;
  let targetGroupResourceId: string | undefined;
  let firstName: string | undefined;
  let lastName: string | undefined;
  let actions: AutonomousAction[] = ['training', 'phishing', 'smishing'];
  let sendAfterPhishingSimulation = false;
  let preferredLanguage: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--user=')) targetUserResourceId = arg.slice(7);
    else if (arg.startsWith('--group=')) targetGroupResourceId = arg.slice(8);
    else if (arg.startsWith('--name=')) {
      const parts = arg.slice(7).trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || undefined;
    } else if (arg === '--phishing-only') actions = ['phishing'];
    else if (arg === '--training-only') actions = ['training'];
    else if (arg === '--smishing-only') actions = ['smishing'];
    else if (arg === '--vishing-call-only') actions = ['vishing-call'];
    else if (arg === '--send-training') sendAfterPhishingSimulation = true;
    else if (arg.startsWith('--lang=')) preferredLanguage = arg.slice(7);
  }

  return {
    targetUserResourceId,
    targetGroupResourceId,
    firstName,
    lastName,
    actions,
    sendAfterPhishingSimulation,
    preferredLanguage,
  };
}

async function main() {
  const opts = parseArgs();

  const token = process.env.PRODUCT_API_KEY || process.env.OPENAI_API_KEY || 'debug-token';
  if (token === 'debug-token') {
    console.warn(`${PREFIX.info} Using placeholder token. Set PRODUCT_API_KEY for real API calls.`);
  }

  const hasUser = opts.targetUserResourceId || (opts.firstName && opts.lastName);
  const hasGroup = !!opts.targetGroupResourceId;

  if (!hasUser && !hasGroup) {
    console.error(`${PREFIX.fail} Must specify --user=ID, --group=ID, or --name="First Last"`);
    console.log(`\nExamples:`);
    console.log(`  npx tsx src/debug-workflow.ts --user=user-123`);
    console.log(`  npx tsx src/debug-workflow.ts --group=group-456`);
    console.log(`  npx tsx src/debug-workflow.ts --name="John Doe"`);
    process.exit(1);
  }

  if (hasUser && hasGroup) {
    console.error(`${PREFIX.fail} Specify either user OR group, not both.`);
    process.exit(1);
  }

  console.log(`${PREFIX.start} Starting autonomous generation...`);
  console.log(`${PREFIX.info} Actions: ${opts.actions.join(', ')}`);
  if (opts.targetUserResourceId) console.log(`${PREFIX.info} User ID: ${opts.targetUserResourceId}`);
  if (opts.targetGroupResourceId) console.log(`${PREFIX.info} Group ID: ${opts.targetGroupResourceId}`);
  if (opts.firstName) console.log(`${PREFIX.info} Name: ${opts.firstName} ${opts.lastName || ''}`);
  if (opts.preferredLanguage) console.log(`${PREFIX.info} Language: ${opts.preferredLanguage}`);
  console.log('');

  const request = {
    token,
    baseApiUrl: process.env.BASE_API_URL || 'https://api.keepnetlabs.com',
    targetUserResourceId: opts.targetUserResourceId,
    targetGroupResourceId: opts.targetGroupResourceId,
    firstName: opts.firstName,
    lastName: opts.lastName,
    actions: opts.actions,
    sendAfterPhishingSimulation: opts.sendAfterPhishingSimulation,
    preferredLanguage: opts.preferredLanguage,
  };

  try {
    const result = await executeAutonomousGeneration(request);

    if (result.success) {
      console.log(`${PREFIX.ok} Autonomous generation completed successfully`);
      if (result.phishingResult?.success) console.log(`${PREFIX.ok} Phishing: ${result.phishingResult.message || 'OK'}`);
      else if (result.phishingResult?.error) console.log(`${PREFIX.fail} Phishing: ${result.phishingResult.error}`);
      if (result.trainingResult?.success) console.log(`${PREFIX.ok} Training: ${result.trainingResult.message || 'OK'}`);
      else if (result.trainingResult?.error) console.log(`${PREFIX.fail} Training: ${result.trainingResult.error}`);
      if (result.smishingResult?.success) console.log(`${PREFIX.ok} Smishing: ${result.smishingResult.message || 'OK'}`);
      else if (result.smishingResult?.error) console.log(`${PREFIX.fail} Smishing: ${result.smishingResult.error}`);
      if (result.vishingCallResult?.success)
        console.log(`${PREFIX.ok} Vishing-call: ${result.vishingCallResult.message || 'OK'}`);
      else if (result.vishingCallResult?.error)
        console.log(`${PREFIX.fail} Vishing-call: ${result.vishingCallResult.error}`);
    } else {
      console.error(`${PREFIX.fail} Autonomous generation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${PREFIX.fail} Unexpected error: ${msg}`);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
