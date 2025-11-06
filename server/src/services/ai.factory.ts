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
      // Priprema za buduću OpenAI implementaciju
      throw new Error('OpenAI provider not yet implemented. Use "anthropic" provider.');
    
    default:
      throw new Error(`Unknown AI provider type: ${type}`);
  }
}

// Convenience funkcija koja koristi environment config
export async function createDefaultAIProvider(): Promise<AIProvider> {
  // Dinamički import za config
  const { getAIConfig } = await import('../lib/config.js');
  const config = getAIConfig();
  
  // Trenutno podržavamo samo Anthropic, ali pripravljeno za proširenje
  const providerType: AIProviderType = (process.env.AI_PROVIDER as AIProviderType) || 'anthropic';
  
  if (providerType === 'anthropic') {
    return await createAIProvider(providerType, {
      apiKey: config.anthropicApiKey,
      timeout: parseInt(process.env.AI_DEFAULT_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3')
    });
  }
  
  // Za buduće providere možemo dodati dodatnu logiku
  throw new Error(`Provider type "${providerType}" is not supported yet.`);
}
