import OpenAI from 'openai';
import { AIProvider, AIGenerationOptions } from '../ai.service.js';
import {
    AIProviderError,
    AIInvalidResponseError,
    AITimeoutError,
    mapAIError
} from '../ai.errors.js';
import { retryWithBackoff, RetryConfigs } from '../../utils/retry.js';

// Konkretna implementacija OpenAI providera
export class OpenAIProvider implements AIProvider {
    private client: OpenAI;
    private model = 'gpt-4o-mini'; // Koristimo gpt-4o-mini kao ekvivalent Haiku modelu (brz i jeftin)

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
    }

    public getProviderName(): string {
        return 'openai';
    }

    // Implementirana stvarna validacija s retry logikom i timeout handlingom
    public async validateConnection(): Promise<boolean> {
        try {
            await retryWithBackoff(async () => {
                // Postavi timeout (10 sekundi za validaciju)
                const timeoutMs = 10000;
                const controller = new AbortController();

                const timeoutId = setTimeout(() => {
                    controller.abort();
                }, timeoutMs);

                try {
                    // Radi "jeftin" poziv samo da provjeri radi li API ključ
                    await this.client.chat.completions.create({
                        model: this.model,
                        messages: [{ role: 'user', content: 'Test' }],
                        max_tokens: 5,
                    }, {
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                } catch (error) {
                    clearTimeout(timeoutId);

                    if (error instanceof Error && error.name === 'AbortError') {
                        throw new AITimeoutError(this.getProviderName(), timeoutMs);
                    }

                    throw error;
                }
            }, RetryConfigs.FAST_OPERATION);

            return true;
        } catch (error) {
            const mappedError = mapAIError(error, this.getProviderName());
            console.error('OpenAI connection validation failed after retries:', mappedError);
            return false;
        }
    }

    // Implementirana stvarna logika generiranja s retry logikom i timeout handlingom
    public async generateText(
        prompt: string,
        options?: AIGenerationOptions,
    ): Promise<string> {
        return retryWithBackoff(async () => {
            // Postavi timeout (30 sekundi default)
            const timeoutMs = options?.timeout || 30000;
            const controller = new AbortController();

            const timeoutId = setTimeout(() => {
                controller.abort();
            }, timeoutMs);

            try {
                const response = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: options?.maxTokens || 1024,
                    temperature: options?.temperature || 0.7,
                }, {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                const content = response.choices[0]?.message?.content;

                if (content) {
                    return content;
                }

                throw new AIInvalidResponseError(
                    this.getProviderName(),
                    'No valid text content in response'
                );
            } catch (error) {
                clearTimeout(timeoutId);

                if (error instanceof Error && error.name === 'AbortError') {
                    throw new AITimeoutError(this.getProviderName(), timeoutMs);
                }

                if (error instanceof AIProviderError) {
                    throw error;
                }

                const mappedError = mapAIError(error, this.getProviderName());
                console.error('OpenAI AI generation failed:', mappedError);
                throw mappedError;
            }
        }, RetryConfigs.AI_API);
    }
}
