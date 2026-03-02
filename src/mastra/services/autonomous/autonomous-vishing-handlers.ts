/**
 * Autonomous Vishing Call Handlers
 *
 * Initiates outbound voice phishing (vishing) simulation calls via ElevenLabs.
 * Used when actions includes 'vishing-call' and user has a phone number.
 *
 * Note: "vishing-call" = real-time voice call. Future "vishing" type may cover
 * voicemail, VoIP, or other voice-based channels.
 */

import { generateText } from 'ai';
import { getLogger } from '../../utils/core/logger';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../error-service';
import { ELEVENLABS, AGENT_CALL_TIMEOUT_MS } from '../../constants';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../../utils/language/language-utils';
import { listPhoneNumbersTool } from '../../tools/vishing-call';
import { getDefaultAgentModel } from '../../model-providers';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import type { AutonomousActionResult } from '../../types/autonomous-types';

const logger = getLogger('AutonomousVishingHandlers');

const VISHING_SYSTEM_PROMPT =
  'You are the voice-call simulation agent for a security training role-play. ' +
  'Act as a realistic scam caller but keep it clearly a simulation, not a real attempt. ' +
  'Never request real passwords, OTPs, money, gift cards, bank details, beneficiary details, account numbers, or secrets. ' +
  'Avoid terms like account, transfer, wire, beneficiary, funds in the scenario. ' +
  'Do not reveal that this is a simulation in the opening message. Keep realism for the first part of the call. ' +
  'Use mild urgency and pretext; no threats or abusive language. ' +
  'NEVER output tags, brackets, annotations, or stage directions. Everything you say is spoken aloud. ' +
  'FORBIDDEN: Never say standalone labels like "professional", "tone:", "style:", "format:", or any meta-annotation before or after your spoken lines. Your output must be 100% natural conversational speech. ' +
  'Do NOT ask the target to perform password resets (every company has different flows). Instead target universal credentials: MFA codes, verification codes sent to their phone, employee ID digits, badge numbers, or verbal authorization codes. ' +
  'If the user REFUSES or DEFLECTS: persist up to 3 attempts (authority, urgency, emotional appeal), then STOP and debrief. ' +
  'If the user DETECTS vishing: give immediate positive feedback, debrief and end. ' +
  'If the user COMPLIES: continue briefly (2-3 turns), then debrief. ' +
  'If you reach a voicemail or answering machine: leave a brief, realistic voicemail consistent with the persona and pretext. Keep it under 20 seconds. Include a callback instruction. Do NOT debrief in voicemail. ' +
  'Debrief format: 1 sentence "this was a simulation", 2-3 red flags, 1 correct next step. ' +
  'Limit: 7 role-play turns OR 180 seconds. After debrief: say goodbye, then STOP.';

interface VishingScenarioOutput {
  role: string;
  pretext: string;
  firstMessage: string;
}

/**
 * Always uses LLM to generate vishing scenario dynamically.
 * Department, language, and optional executiveReport are passed to the model.
 * No fallback: throws when LLM fails.
 */
async function generateVishingScenarioFromContext(params: {
  executiveReport?: string;
  department?: string;
  language: string;
}): Promise<{ role: string; pretext: string; firstMessage: string }> {
  const { executiveReport, department, language } = params;

  try {
    const systemPrompt = `You are a security training scenario designer. Generate a vishing (voice phishing) simulation scenario for a security awareness training call.

Output ONLY valid JSON with exactly these keys (no markdown, no explanation):
- role: The persona the caller will pretend to be (e.g., "IT Support Specialist", "Bank Security Officer", "HR Benefits Representative")
- pretext: The reason for the call. Focus on universal social engineering targets: MFA codes, verification codes, employee ID digits, badge numbers, verbal authorization codes. Do NOT use password reset flows (every company has different systems, breaking realism). Good examples: "MFA verification callback for anomalous login activity", "Confirm the 6-digit code sent to your phone for fraud alert", "Badge number verification for security audit".
- firstMessage: The opening line the AI voice agent will say when the call connects. MUST be written entirely in ${language} (BCP-47). Keep it natural, 1-2 sentences, mild urgency. Write as a native speaker of that language would.`;

    const userParts: string[] = [];
    if (department?.trim()) userParts.push(`Target department: ${department.trim()}`);
    if (executiveReport?.trim()) userParts.push(`User analysis report:\n${executiveReport.trim()}`);
    if (userParts.length === 0) userParts.push('Generate a generic, realistic security verification scenario.');

    const response = await withRetry(
      () =>
        withTimeout(
          generateText({
            model: getDefaultAgentModel(),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userParts.join('\n\n') },
            ],
          }),
          AGENT_CALL_TIMEOUT_MS
        ),
      'autonomous_vishing_scenario_generation'
    );

    const cleaned = cleanResponse(response.text, 'vishing-scenario');
    const parsed = JSON.parse(cleaned) as VishingScenarioOutput;

    if (
      typeof parsed?.role === 'string' &&
      typeof parsed?.pretext === 'string' &&
      typeof parsed?.firstMessage === 'string' &&
      parsed.role.trim().length > 0 &&
      parsed.pretext.trim().length > 0 &&
      parsed.firstMessage.trim().length > 0
    ) {
      logger.info('Generated vishing scenario dynamically', { role: parsed.role, language });
      return {
        role: parsed.role.trim(),
        pretext: parsed.pretext.trim(),
        firstMessage: parsed.firstMessage.trim(),
      };
    }
  } catch (err) {
    const error = normalizeError(err);
    logger.error('Vishing scenario LLM generation failed', { error: error.message, department });
    throw new Error(`Vishing scenario generation failed: ${error.message}`);
  }

  throw new Error('Vishing scenario generation failed: invalid LLM output');
}

async function buildVishingScenario(params: {
  executiveReport?: string;
  department?: string;
  language: string;
}): Promise<{ prompt: string; firstMessage: string }> {
  const { language } = params;
  const persona = await generateVishingScenarioFromContext(params);

  const scenarioBlock = `Persona: ${persona.role}
Pretext: ${persona.pretext}
Urgency: Medium
Language: All call content must be in ${language}.`;

  const prompt = `${VISHING_SYSTEM_PROMPT}\n\nScenario:\n${scenarioBlock}`;
  const firstMessage = persona.firstMessage;

  return { prompt, firstMessage };
}

async function getAgentPhoneNumberId(): Promise<string | undefined> {
  const result = await listPhoneNumbersTool.execute({ context: {} } as never);
  if (!result?.success || !result.phoneNumbers?.length) {
    logger.warn('No phone numbers available for vishing call', { error: result?.error });
    return undefined;
  }
  const first = result.phoneNumbers[0];
  return first?.phone_number_id;
}

/**
 * Initiate vishing call for autonomous mode.
 * Calls ElevenLabs outbound API directly (no UI writer).
 */
export async function initiateAutonomousVishingCall(params: {
  toNumber: string;
  executiveReport?: string;
  toolResult: { userInfo?: { department?: string; preferredLanguage?: string } };
}): Promise<AutonomousActionResult> {
  const loggerLocal = getLogger('InitiateAutonomousVishingCall');

  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      loggerLocal.warn('ELEVENLABS_API_KEY not set, skipping vishing call');
      return { success: false, error: 'ELEVENLABS_API_KEY not configured' };
    }

    const preferredLanguageRaw = params.toolResult.userInfo?.preferredLanguage || '';
    const language = preferredLanguageRaw
      ? validateBCP47LanguageCode(preferredLanguageRaw)
      : DEFAULT_LANGUAGE;

    const { prompt, firstMessage } = await buildVishingScenario({
      executiveReport: params.executiveReport,
      department: params.toolResult.userInfo?.department,
      language,
    });

    const agentPhoneNumberId = await getAgentPhoneNumberId();
    if (!agentPhoneNumberId) {
      return { success: false, error: 'No outbound phone number configured in ElevenLabs' };
    }

    const e164Regex = /^\+[1-9]\d{1,14}$/;
    const toNumber = params.toNumber.replace(/\s/g, '');
    if (!e164Regex.test(toNumber)) {
      return { success: false, error: `Invalid phone format. Must be E.164 (e.g. +905551234567)` };
    }

    const url = `${ELEVENLABS.API_BASE_URL}${ELEVENLABS.ENDPOINTS.OUTBOUND_CALL}`;
    const effectiveAgentId = ELEVENLABS.DEFAULT_AGENT_ID;

    const requestBody = {
      agent_id: effectiveAgentId,
      agent_phone_number_id: agentPhoneNumberId,
      to_number: toNumber,
      conversation_initiation_client_data: {
        conversation_config_override: {
          agent: {
            prompt: { prompt },
            first_message: firstMessage,
          },
        },
      },
    };

    loggerLocal.info('initiate_autonomous_vishing_call', {
      agentPhoneNumberId,
      toNumberPrefix: toNumber.substring(0, 6) + '***',
    });

    const response = await withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS.API_TIMEOUT_MS);
        try {
          return await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': apiKey,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      },
      'autonomous_vishing_call'
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const errMsg = `ElevenLabs API ${response.status}: ${errorBody.substring(0, 200)}`;
      const errorInfo = errorService.external(errMsg, { step: 'autonomous-vishing-call' });
      logErrorInfo(loggerLocal, 'error', 'autonomous_vishing_call_failed', errorInfo);
      return { success: false, error: errMsg };
    }

    const data = (await response.json()) as { conversation_id?: string; callSid?: string };
    const conversationId = data.conversation_id ?? '';
    const callSid = data.callSid ?? '';

    loggerLocal.info('autonomous_vishing_call_initiated', { conversationId, callSid });

    return {
      success: true,
      message: 'Vishing call initiated',
      data: { conversationId, callSid },
    };
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'autonomous-vishing-call',
      stack: err.stack,
    });
    logErrorInfo(loggerLocal, 'error', 'autonomous_vishing_call_error', errorInfo);
    return { success: false, error: err.message };
  }
}
