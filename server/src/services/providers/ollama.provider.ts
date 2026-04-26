import { AIProvider, AIGenerationOptions } from '../ai.service.js';
import { AIInvalidResponseError, AITimeoutError, AIProviderError } from '../ai.errors.js';

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  public getProviderName(): string {
    return `ollama/${this.model}`;
  }

  public async validateConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async generateText(prompt: string, options?: AIGenerationOptions): Promise<string> {
    const timeoutMs = options?.timeout ?? 90000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens ?? 1024,
          temperature: options?.temperature ?? 0.7,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AIProviderError(this.getProviderName(), `HTTP ${res.status}: ${body}`);
      }

      const json = await res.json() as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new AIInvalidResponseError(this.getProviderName(), 'Empty response from Ollama');
      return content;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AITimeoutError(this.getProviderName(), timeoutMs);
      }
      throw new AIProviderError(this.getProviderName(), String(error));
    }
  }
}
