// 1. Osnovni AIProvider interface
export interface AIProvider {
  generateText(prompt: string, options?: AIGenerationOptions): Promise<string>;
  validateConnection(): Promise<boolean>;
  getProviderName(): string;
}

// 2. Opcije za generiranje teksta
export interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  context?: Record<string, any>;
}

// 3. Eksportiranje factory funkcija i tipova
export type { AIProviderType, AIProviderConfig } from './ai.factory.js';
export { createAIProvider, createDefaultAIProvider } from './ai.factory.js';

// 4. Eksportiranje konkretnih providera za direktnu upotrebu ako je potrebno
export { AnthropicProvider } from './providers/anthropic.provider.js';

// 5. Glavna AIService klasa (opcionalno, za kompleksniju logiku)
export class AIService {
  constructor(private provider: AIProvider) { }

  async generateText(prompt: string, options?: AIGenerationOptions): Promise<string> {
    return this.provider.generateText(prompt, options);
  }

  async validateProvider(): Promise<boolean> {
    return this.provider.validateConnection();
  }

  switchProvider(newProvider: AIProvider): void {
    this.provider = newProvider;
  }

  getProviderName(): string {
    return this.provider.getProviderName();
  }
}
