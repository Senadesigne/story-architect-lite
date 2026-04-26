import { AIProvider } from './ai.service.js';

export type AIProviderType = 'anthropic' | 'openai' | 'ollama';

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export async function createAIProvider(
  type: AIProviderType,
  config: AIProviderConfig
): Promise<AIProvider> {
  switch (type) {
    case 'anthropic': {
      const { AnthropicProvider } = await import('./providers/anthropic.provider.js');
      return new AnthropicProvider(config.apiKey, config.model);
    }
    case 'openai': {
      const { OpenAIProvider } = await import('./providers/openai.provider.js');
      return new OpenAIProvider(config.apiKey);
    }
    case 'ollama': {
      const { OllamaProvider } = await import('./providers/ollama.provider.js');
      if (!config.baseUrl) throw new Error('OLLAMA_BASE_URL is required for ollama provider');
      return new OllamaProvider(config.baseUrl, config.model ?? 'qwen3:30b-a3b');
    }
    default:
      throw new Error(`Unknown AI provider type: ${type}`);
  }
}

export async function createPreferredAIProvider(preference: AIProviderType = 'anthropic', model?: string): Promise<AIProvider> {
  const { getAIConfig } = await import('../lib/config.js');
  const config = getAIConfig();

  const timeout = parseInt(process.env.AI_DEFAULT_TIMEOUT || '30000');
  const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '3');

  console.log("[AI_FACTORY] Config check:", {
    hasAnthropicKey: !!config.anthropicApiKey,
    anthropicKeyLength: config.anthropicApiKey?.length,
    hasOpenAIKey: !!config.openaiApiKey,
    openAIKeyLength: config.openaiApiKey?.length,
    preference,
    model,
  });

  if (preference === 'anthropic' && config.anthropicApiKey) {
    console.log('[AI_FACTORY] Using preferred provider: Anthropic');
    return createAIProvider('anthropic', { apiKey: config.anthropicApiKey, model, timeout, maxRetries });
  }

  if (preference === 'openai' && config.openaiApiKey) {
    console.log('[AI_FACTORY] Using preferred provider: OpenAI');
    return createAIProvider('openai', { apiKey: config.openaiApiKey, timeout, maxRetries });
  }

  if (config.anthropicApiKey) {
    console.log(`[AI_FACTORY] Fallback to Anthropic (preferred '${preference}' not available)`);
    return createAIProvider('anthropic', { apiKey: config.anthropicApiKey, model, timeout, maxRetries });
  }

  if (config.openaiApiKey) {
    console.log(`[AI_FACTORY] Fallback to OpenAI (preferred '${preference}' not available)`);
    return createAIProvider('openai', { apiKey: config.openaiApiKey, timeout, maxRetries });
  }

  throw new Error('No valid AI API keys found in configuration.');
}

export async function createDefaultAIProvider(): Promise<AIProvider> {
  return createPreferredAIProvider('anthropic');
}

export async function createManagerProvider(): Promise<AIProvider> {
  const providerType = (process.env.MANAGER_PROVIDER as AIProviderType) || 'anthropic';
  const model = process.env.MANAGER_MODEL ?? 'claude-sonnet-4-6';
  console.log(`[AI_FACTORY] Creating Manager provider: ${providerType}/${model}`);
  if (providerType === 'ollama') {
    const baseUrl = process.env.OLLAMA_BASE_URL;
    if (!baseUrl) throw new Error('OLLAMA_BASE_URL is required when MANAGER_PROVIDER=ollama');
    const { OllamaProvider } = await import('./providers/ollama.provider.js');
    const primary = new OllamaProvider(baseUrl, model);
    if (await primary.validateConnection()) return primary;
    const fallbackUrl = process.env.OLLAMA_FALLBACK_URL;
    if (fallbackUrl) {
      console.warn(`[AI_FACTORY] HPE #1 unreachable, trying fallback: ${fallbackUrl}`);
      const fallback = new OllamaProvider(fallbackUrl, model);
      if (await fallback.validateConnection()) return fallback;
    }
    throw new Error(`Ollama HPE #1 (${baseUrl}) not reachable. Check Tailscale.`);
  }
  return createPreferredAIProvider(providerType, model);
}

export async function createWorkerProvider(modelOverride?: string): Promise<AIProvider> {
  const providerType = (process.env.WORKER_PROVIDER as AIProviderType) || 'anthropic';
  const model = modelOverride ?? process.env.WORKER_MODEL ?? 'claude-sonnet-4-6';
  console.log(`[AI_FACTORY] Creating Worker provider: ${providerType}/${model}`);
  if (providerType === 'ollama') {
    const baseUrl = process.env.OLLAMA_BASE_URL;
    if (!baseUrl) throw new Error('OLLAMA_BASE_URL is required when WORKER_PROVIDER=ollama');
    const { OllamaProvider } = await import('./providers/ollama.provider.js');
    return new OllamaProvider(baseUrl, model);
  }
  return createPreferredAIProvider(providerType, model);
}
