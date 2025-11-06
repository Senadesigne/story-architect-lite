import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIGenerationOptions } from '../ai.service';
import { 
  AIProviderError, 
  AIInvalidResponseError,
  mapAIError 
} from '../ai.errors';
import { retryWithBackoff, RetryConfigs } from '../../utils/retry';

// Konkretna implementacija Anthropic providera
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model = 'claude-3-haiku-20240307'; // Koristimo Haiku, najbrži model

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  public getProviderName(): string {
    return 'anthropic';
  }

  // Implementirana stvarna validacija s retry logikom
  public async validateConnection(): Promise<boolean> {
    try {
      await retryWithBackoff(async () => {
        // Radi "jeftin" poziv samo da provjeri radi li API ključ
        await this.client.messages.create({
          model: this.model,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10,
        });
      }, RetryConfigs.FAST_OPERATION);
      
      return true;
    } catch (error) {
      const mappedError = mapAIError(error, this.getProviderName());
      console.error('Anthropic connection validation failed after retries:', mappedError);
      return false;
    }
  }

  // Implementirana stvarna logika generiranja s retry logikom
  public async generateText(
    prompt: string,
    options?: AIGenerationOptions,
  ): Promise<string> {
    return retryWithBackoff(async () => {
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
    }, RetryConfigs.AI_API);
  }
}
