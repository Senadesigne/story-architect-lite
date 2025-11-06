import Anthropic from '@anthropic-ai/sdk'; // <-- ZADATAK 3.2.4
import { 
  AIProviderError, 
  AIInvalidResponseError,
  mapAIError 
} from './ai.errors';

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

// 3. Konkretna implementacija (ZADATAK 3.2.5)
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model = 'claude-3-haiku-20240307'; // Koristimo Haiku, najbrži model

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  public getProviderName(): string {
    return 'anthropic';
  }

  // ZADATAK 3.4.2: Implementirana stvarna validacija
  public async validateConnection(): Promise<boolean> {
    try {
      // Radi "jeftin" poziv samo da provjeri radi li API ključ
      await this.client.messages.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10,
      });
      return true;
    } catch (error) {
      const mappedError = mapAIError(error, this.getProviderName());
      console.error('Anthropic connection validation failed:', mappedError);
      return false;
    }
  }

  // ZADATAK 3.4.1: Implementirana stvarna logika generiranja
  public async generateText(
    prompt: string,
    options?: AIGenerationOptions,
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.7,
        // Ovdje možemo mapirati i druge opcije ako je potrebno
      });

      // Ekstrahiraj tekstualni odgovor iz Anthropicovog formata
      if (response.content && response.content[0]?.type === 'text') {
        return response.content[0].text;
      }

      throw new AIInvalidResponseError(
        this.getProviderName(), 
        'No valid text content in response'
      );
    } catch (error) {
      // Ako je već naša custom greška, proslijedi je dalje
      if (error instanceof AIProviderError) {
        throw error;
      }
      
      // Mapiraj vanjsku grešku u našu custom grešku
      const mappedError = mapAIError(error, this.getProviderName());
      console.error('Anthropic AI generation failed:', mappedError);
      throw mappedError;
    }
  }
}
