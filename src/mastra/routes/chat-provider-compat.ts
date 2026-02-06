import { Model, ModelProvider } from '../model-providers';

function normalizeModelProvider(provider: string): string {
  return provider.toLowerCase().replace(/_/g, '-').trim();
}

function normalizeModelName(model: string): string {
  const raw = String(model || '').trim();
  if (!raw) return raw;

  if (Object.values(Model).includes(raw as Model)) {
    return raw;
  }

  if (raw in Model) {
    return Model[raw as keyof typeof Model];
  }

  const enumKeyCandidate = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (enumKeyCandidate in Model) {
    return Model[enumKeyCandidate as keyof typeof Model];
  }

  const stripped = raw
    .toLowerCase()
    .replace(/^openai[-_]/, '')
    .replace(/^google[-_]/, '')
    .replace(/^gemini[-_]/, '')
    .trim();

  return stripped;
}

export function resolveEffectiveProvider(modelProvider?: string, modelName?: string): ModelProvider {
  if (!modelProvider || !modelName) {
    return ModelProvider.WORKERS_AI;
  }

  const normalizedProvider = normalizeModelProvider(modelProvider);
  const normalizedModel = normalizeModelName(modelName);

  const providerIsValid = Object.values(ModelProvider).includes(normalizedProvider as ModelProvider);
  const modelIsValid = Object.values(Model).includes(normalizedModel as Model);

  if (!providerIsValid || !modelIsValid) {
    return ModelProvider.WORKERS_AI;
  }

  return normalizedProvider as ModelProvider;
}

export function shouldMapAssistantHistoryAsUser(modelProvider?: string, modelName?: string): boolean {
  return resolveEffectiveProvider(modelProvider, modelName) === ModelProvider.WORKERS_AI;
}
