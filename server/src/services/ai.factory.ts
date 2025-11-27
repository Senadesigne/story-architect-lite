import { AIProvider } from './ai.service';

// Tipovi za factory pattern
export type AIProviderType = 'anthropic' | 'openai';

export interface AIProviderConfig {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
}

// Factory funkcija za kreiranje AI providera
export async function createAIProvider(
  type: AIProviderType,
  config: AIProviderConfig
): Promise<AIProvider> {
  switch (type) {
    case 'anthropic':
      // Dinamički import AnthropicProvider-a
      const { AnthropicProvider } = await import('./providers/anthropic.provider.js');
      return new AnthropicProvider(config.apiKey);

    case 'openai':
      // Dinamički import OpenAIProvider-a
      const { OpenAIProvider } = await import('./providers/openai.provider.js');
      return new OpenAIProvider(config.apiKey);

    default:
      throw new Error(`Unknown AI provider type: ${type}`);
  }
}

/**
 * Kreira AI providera na temelju preferencije, uz automatski fallback.
 * 
 * @param preference - Preferirani provider ('anthropic' ili 'openai')
 * @returns Instanca AI providera
 */
export async function createPreferredAIProvider(preference: AIProviderType = 'anthropic'): Promise<AIProvider> {
  const { getAIConfig } = await import('../lib/config.js');
  const config = getAIConfig();

  const timeout = parseInt(process.env.AI_DEFAULT_TIMEOUT || '30000');
  const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '3');

  console.log("[AI_FACTORY] Config check:", {
    hasAnthropicKey: !!config.anthropicApiKey,
    anthropicKeyLength: config.anthropicApiKey?.length,
    hasOpenAIKey: !!config.openaiApiKey,
    openAIKeyLength: config.openaiApiKey?.length,
    preference
  });

  // 1. Pokušaj kreirati preferiranog providera
  if (preference === 'anthropic' && config.anthropicApiKey) {
    console.log('[AI_FACTORY] Using preferred provider: Anthropic');
    return createAIProvider('anthropic', { apiKey: config.anthropicApiKey, timeout, maxRetries });
  }

  if (preference === 'openai' && config.openaiApiKey) {
    console.log('[AI_FACTORY] Using preferred provider: OpenAI');
    return createAIProvider('openai', { apiKey: config.openaiApiKey, timeout, maxRetries });
  }

  // 2. Fallback logika
  if (config.anthropicApiKey) {
    console.log(`[AI_FACTORY] Fallback to Anthropic (preferred '${preference}' not available)`);
    return createAIProvider('anthropic', { apiKey: config.anthropicApiKey, timeout, maxRetries });
  }

  if (config.openaiApiKey) {
    console.log(`[AI_FACTORY] Fallback to OpenAI (preferred '${preference}' not available)`);
    return createAIProvider('openai', { apiKey: config.openaiApiKey, timeout, maxRetries });
  }

  throw new Error('No valid AI API keys found in configuration.');
}

// Convenience funkcija koja koristi environment config (zadržana radi kompatibilnosti)
export async function createDefaultAIProvider(): Promise<AIProvider> {
  // Default ponašanje je preferirati Anthropic
  return createPreferredAIProvider('anthropic');
}
