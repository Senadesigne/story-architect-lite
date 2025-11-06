# Plan Oporavka Koda - AI Integracija

Tehnički plan za implementaciju kritičnih i važnih poboljšanja identificiranih u pregledu koda za Zadatak 3.5.

## 🚨 Prioritet 1 (Kritično)

### 1. Implementacija Rate Limitinga

#### Koraci:

**1.1 Kreirati middleware za rate limiting**
```typescript
// Kreirati: server/src/middleware/rateLimiter.ts
import { Context, Next } from 'hono';

interface RateLimitOptions {
  windowMs: number;  // Vremenski okvir u ms
  max: number;       // Maksimalno zahtjeva po okviru
  keyGenerator?: (c: Context) => string;
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private options: RateLimitOptions) {}

  middleware() {
    return async (c: Context, next: Next) => {
      const key = this.options.keyGenerator 
        ? this.options.keyGenerator(c)
        : c.get('user')?.id || c.req.header('x-forwarded-for') || 'anonymous';

      const now = Date.now();
      const windowStart = now - this.options.windowMs;

      // Očisti stare zapise
      for (const [k, v] of this.requests.entries()) {
        if (v.resetTime < windowStart) {
          this.requests.delete(k);
        }
      }

      const current = this.requests.get(key) || { count: 0, resetTime: now + this.options.windowMs };

      if (current.count >= this.options.max) {
        return c.json({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        }, 429);
      }

      current.count++;
      this.requests.set(key, current);

      // Dodaj headers
      c.header('X-RateLimit-Limit', this.options.max.toString());
      c.header('X-RateLimit-Remaining', (this.options.max - current.count).toString());
      c.header('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());

      await next();
    };
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  return new RateLimiter(options);
}

// Preddefinirane konfiguracije
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minuta
  max: 10,              // 10 zahtjeva po minuti po korisniku
  keyGenerator: (c) => `ai:${c.get('user')?.id || 'anonymous'}`
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minuta
  max: 100                   // 100 zahtjeva po 15 minuta
});
```

**1.2 Modificirati API endpointe**
```typescript
// Modificirati: server/src/api.ts
import { aiRateLimiter } from './middleware/rateLimiter';

// Dodati prije postojećih AI endpointa:

// --- AI Test Route (dodati rate limiting) ---
app.post('/api/ai/test', aiRateLimiter.middleware(), async (c) => {
  // postojeći kod...
});

// --- AI: Generate Scene Synopsis (dodati rate limiting) ---
app.post(
  '/api/projects/:projectId/ai/generate-scene-synopsis',
  aiRateLimiter.middleware(),
  validateBody(GenerateSceneSynopsisBodySchema),
  async (c) => {
    // postojeći kod...
  }
);
```

### 2. Implementacija Osnovnih Testova

#### Koraci:

**2.1 Kreirati testove za AIProvider**
```typescript
// Kreirati: server/src/services/__tests__/ai.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../ai.service';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockClient: any;

  beforeEach(() => {
    const Anthropic = vi.mocked(require('@anthropic-ai/sdk').default);
    mockClient = {
      messages: {
        create: vi.fn()
      }
    };
    Anthropic.mockReturnValue(mockClient);
    provider = new AnthropicProvider('test-api-key');
  });

  describe('getProviderName', () => {
    it('should return "anthropic"', () => {
      expect(provider.getProviderName()).toBe('anthropic');
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Generated text response' }]
      };
      mockClient.messages.create.mockResolvedValue(mockResponse);

      const result = await provider.generateText('Test prompt');

      expect(result).toBe('Generated text response');
      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 1024,
        temperature: 0.7
      });
    });

    it('should handle API errors', async () => {
      mockClient.messages.create.mockRejectedValue(new Error('API Error'));

      await expect(provider.generateText('Test prompt'))
        .rejects.toThrow('AI generation failed: API Error');
    });

    it('should handle empty response', async () => {
      mockClient.messages.create.mockResolvedValue({ content: [] });

      await expect(provider.generateText('Test prompt'))
        .rejects.toThrow('No valid text content received from Anthropic');
    });
  });

  describe('validateConnection', () => {
    it('should return true for valid connection', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test' }]
      });

      const result = await provider.validateConnection();

      expect(result).toBe(true);
    });

    it('should return false for invalid connection', async () => {
      mockClient.messages.create.mockRejectedValue(new Error('Invalid API key'));

      const result = await provider.validateConnection();

      expect(result).toBe(false);
    });
  });
});
```

**2.2 Kreirati testove za ContextBuilder**
```typescript
// Kreirati: server/src/services/__tests__/context.builder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextBuilder } from '../context.builder';
import { HTTPException } from 'hono/http-exception';

// Mock database
const mockDb = {
  query: {
    scenes: {
      findFirst: vi.fn()
    },
    characters: {
      findMany: vi.fn()
    }
  }
};

describe('ContextBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildSceneContext', () => {
    it('should build scene context successfully', async () => {
      const mockScene = {
        id: 'scene-1',
        title: 'Test Scene',
        projectId: 'project-1',
        location: { id: 'loc-1', name: 'Test Location' }
      };
      const mockCharacters = [
        { id: 'char-1', name: 'Character 1' },
        { id: 'char-2', name: 'Character 2' }
      ];

      mockDb.query.scenes.findFirst.mockResolvedValue(mockScene);
      mockDb.query.characters.findMany.mockResolvedValue(mockCharacters);

      const result = await ContextBuilder.buildSceneContext(
        'scene-1',
        mockDb as any,
        'project-1'
      );

      expect(result).toEqual({
        scene: mockScene,
        characters: mockCharacters,
        location: mockScene.location
      });
    });

    it('should throw 404 for non-existent scene', async () => {
      mockDb.query.scenes.findFirst.mockResolvedValue(null);

      await expect(
        ContextBuilder.buildSceneContext('scene-1', mockDb as any, 'project-1')
      ).rejects.toThrow(HTTPException);
    });
  });
});
```

**2.3 Kreirati integracijskeTestove za AI endpointe**
```typescript
// Kreirati: server/src/__tests__/ai.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../api';

// Mock AI service
vi.mock('../services/ai.service', () => ({
  AnthropicProvider: vi.fn().mockImplementation(() => ({
    validateConnection: vi.fn().mockResolvedValue(true),
    generateText: vi.fn().mockResolvedValue('Mocked AI response'),
    getProviderName: vi.fn().mockReturnValue('anthropic')
  }))
}));

// Mock config
vi.mock('../lib/config', () => ({
  getAIConfig: vi.fn().mockReturnValue({
    anthropicApiKey: 'test-key'
  })
}));

describe('AI Endpoints', () => {
  describe('POST /api/ai/test', () => {
    it('should return AI response for valid request', async () => {
      const response = await request(app)
        .post('/api/ai/test')
        .send({ prompt: 'Test prompt' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'success',
        prompt: 'Test prompt',
        response: 'Mocked AI response'
      });
    });

    it('should use default prompt when none provided', async () => {
      const response = await request(app)
        .post('/api/ai/test')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.prompt).toBe('Hello, Claude!');
    });
  });
});
```

## ⚠️ Prioritet 2 (Važno)

### 3. Refaktoring: Custom Error Klase

#### Koraci:

**3.1 Kreirati AI error klase**
```typescript
// Kreirati: server/src/services/ai.errors.ts
export class AIProviderError extends Error {
  constructor(
    message: string, 
    public providerName: string, 
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AITimeoutError extends AIProviderError {
  constructor(providerName: string, public timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`, providerName);
    this.name = 'AITimeoutError';
  }
}

export class AIQuotaExceededError extends AIProviderError {
  constructor(providerName: string) {
    super('AI provider quota exceeded', providerName);
    this.name = 'AIQuotaExceededError';
  }
}

export class AIInvalidKeyError extends AIProviderError {
  constructor(providerName: string) {
    super('Invalid API key for AI provider', providerName);
    this.name = 'AIInvalidKeyError';
  }
}

export class AIInvalidResponseError extends AIProviderError {
  constructor(providerName: string, reason: string) {
    super(`Invalid response from AI provider: ${reason}`, providerName);
    this.name = 'AIInvalidResponseError';
  }
}

// Helper funkcija za mapiranje grešaka
export function mapAIError(error: any, providerName: string): AIProviderError {
  if (error.name === 'AbortError') {
    return new AITimeoutError(providerName, 30000);
  }
  
  if (error.code === 'insufficient_quota' || error.message?.includes('quota')) {
    return new AIQuotaExceededError(providerName);
  }
  
  if (error.code === 'invalid_api_key' || error.status === 401) {
    return new AIInvalidKeyError(providerName);
  }
  
  return new AIProviderError(
    `AI generation failed: ${error.message}`, 
    providerName, 
    error
  );
}
```

**3.2 Proširiti errorHandler middleware**
```typescript
// Modificirati: server/src/middleware/errorHandler.ts
import { 
  AIProviderError, 
  AITimeoutError, 
  AIQuotaExceededError, 
  AIInvalidKeyError 
} from '../services/ai.errors';

// Dodati u errorHandler funkciju, nakon postojećih case-ova:
case 'AIProviderError':
  return c.json({ error: 'AI service temporarily unavailable' }, 503);

case 'AITimeoutError':
  return c.json({ 
    error: 'AI request timed out. Please try again.',
    retryAfter: 30 
  }, 408);

case 'AIQuotaExceededError':
  return c.json({ 
    error: 'AI service quota exceeded. Please try again later.',
    retryAfter: 3600 
  }, 429);

case 'AIInvalidKeyError':
  return c.json({ error: 'AI service configuration error' }, 500);
```

**3.3 Refaktorirati AnthropicProvider**
```typescript
// Modificirati: server/src/services/ai.service.ts
import { 
  AIProviderError, 
  AITimeoutError, 
  AIInvalidResponseError,
  mapAIError 
} from './ai.errors';

// U AnthropicProvider klasi, zamijeniti generateText metodu:
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
    });

    if (response.content && response.content[0]?.type === 'text') {
      return response.content[0].text;
    }

    throw new AIInvalidResponseError(
      this.getProviderName(), 
      'No valid text content in response'
    );
  } catch (error) {
    if (error instanceof AIProviderError) {
      throw error; // Re-throw naše custom greške
    }
    
    throw mapAIError(error, this.getProviderName());
  }
}

// Također zamijeniti validateConnection metodu:
public async validateConnection(): Promise<boolean> {
  try {
    await this.client.messages.create({
      model: this.model,
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 10,
    });
    return true;
  } catch (error) {
    console.error('Anthropic connection validation failed:', mapAIError(error, this.getProviderName()));
    return false;
  }
}
```

### 4. Refaktoring: Factory Pattern za Providere

#### Koraci:

**4.1 Kreirati provider tipove i konfiguraciju**
```typescript
// Kreirati: server/src/services/ai.types.ts
export type AIProviderType = 'anthropic' | 'openai';

export interface AIProviderConfig {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  context?: Record<string, any>;
}

export interface AIProvider {
  generateText(prompt: string, options?: AIGenerationOptions): Promise<string>;
  validateConnection(): Promise<boolean>;
  getProviderName(): string;
}
```

**4.2 Kreirati OpenAI provider (za buduću upotrebu)**
```typescript
// Kreirati: server/src/services/providers/openai.provider.ts
import OpenAI from 'openai';
import { AIProvider, AIGenerationOptions } from '../ai.types';
import { mapAIError, AIInvalidResponseError } from '../ai.errors';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model = 'gpt-3.5-turbo';

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  public getProviderName(): string {
    return 'openai';
  }

  public async validateConnection(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10,
      });
      return true;
    } catch (error) {
      console.error('OpenAI connection validation failed:', mapAIError(error, this.getProviderName()));
      return false;
    }
  }

  public async generateText(
    prompt: string,
    options?: AIGenerationOptions,
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return content;
      }

      throw new AIInvalidResponseError(
        this.getProviderName(), 
        'No valid content in response'
      );
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      
      throw mapAIError(error, this.getProviderName());
    }
  }
}
```

**4.3 Premjestiti AnthropicProvider**
```typescript
// Kreirati: server/src/services/providers/anthropic.provider.ts
// (premjesti postojeći AnthropicProvider kod iz ai.service.ts)

import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIGenerationOptions } from '../ai.types';
import { mapAIError, AIInvalidResponseError } from '../ai.errors';

export class AnthropicProvider implements AIProvider {
  // ... postojeći kod ...
}
```

**4.4 Kreirati factory**
```typescript
// Kreirati: server/src/services/ai.factory.ts
import { AIProvider, AIProviderType, AIProviderConfig } from './ai.types';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';

export function createAIProvider(
  type: AIProviderType, 
  config: AIProviderConfig
): AIProvider {
  switch (type) {
    case 'anthropic':
      return new AnthropicProvider(config.apiKey);
    
    case 'openai':
      return new OpenAIProvider(config.apiKey);
    
    default:
      throw new Error(`Unknown AI provider type: ${type}`);
  }
}

// Convenience funkcija koja koristi environment config
export function createDefaultAIProvider(): AIProvider {
  const { getAIConfig } = require('../lib/config');
  const config = getAIConfig();
  
  const providerType: AIProviderType = (process.env.AI_PROVIDER as AIProviderType) || 'anthropic';
  
  return createAIProvider(providerType, {
    apiKey: config.anthropicApiKey, // Ovo će trebati proširiti za OpenAI
    timeout: parseInt(process.env.AI_DEFAULT_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3')
  });
}
```

**4.5 Refaktorirati ai.service.ts**
```typescript
// Modificirati: server/src/services/ai.service.ts
export { AIProvider, AIGenerationOptions, AIProviderType } from './ai.types';
export { createAIProvider, createDefaultAIProvider } from './ai.factory';
export { AnthropicProvider } from './providers/anthropic.provider';
export { OpenAIProvider } from './providers/openai.provider';

// Glavna AIService klasa (opcionalno, za kompleksniju logiku)
export class AIService {
  constructor(private provider: AIProvider) {}

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
```

**4.6 Ažurirati API endpointe**
```typescript
// Modificirati: server/src/api.ts
import { createDefaultAIProvider } from './services/ai.service';

// Zamijeniti postojeće AI endpoint implementacije:
app.post('/api/ai/test', aiRateLimiter.middleware(), async (c) => {
  try {
    const aiProvider = createDefaultAIProvider();
    
    const isValid = await aiProvider.validateConnection();
    if (!isValid) {
      return c.json({ error: 'AI provider connection failed. Check API key.' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const prompt = body.prompt || 'Hello, Claude!';

    const aiResponse = await aiProvider.generateText(prompt, { maxTokens: 100 });

    return c.json({
      status: 'success',
      prompt: prompt,
      response: aiResponse,
    });

  } catch (error) {
    console.error('AI /test endpoint error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});
```

### 5. Implementacija Retry Logike

#### Koraci:

**5.1 Kreirati retry utility**
```typescript
// Kreirati: server/src/utils/retry.ts
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class RetryableError extends Error {
  constructor(message: string, public shouldRetry: boolean = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    ...options
  };

  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Ne pokušavaj ponovno za non-retryable greške
      if (error instanceof RetryableError && !error.shouldRetry) {
        throw error;
      }

      // Ne pokušavaj ponovno za authentication greške
      if (error.name === 'AIInvalidKeyError') {
        throw error;
      }

      // Zadnji pokušaj
      if (attempt === config.maxRetries) {
        throw lastError;
      }

      // Izračunaj delay s exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );

      console.log(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

**5.2 Integrirati retry u AI providere**
```typescript
// Modificirati: server/src/services/providers/anthropic.provider.ts
import { retryWithBackoff, RetryableError } from '../../utils/retry';

// U AnthropicProvider klasi, wrappati generateText:
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
      });

      if (response.content && response.content[0]?.type === 'text') {
        return response.content[0].text;
      }

      throw new AIInvalidResponseError(
        this.getProviderName(), 
        'No valid text content in response'
      );
    } catch (error) {
      if (error instanceof AIProviderError) {
        // Određuj je li greška retryable
        const shouldRetry = !(error instanceof AIInvalidKeyError);
        throw new RetryableError(error.message, shouldRetry);
      }
      
      const mappedError = mapAIError(error, this.getProviderName());
      const shouldRetry = !(mappedError instanceof AIInvalidKeyError);
      throw new RetryableError(mappedError.message, shouldRetry);
    }
  }, {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000
  });
}
```

### 6. Implementacija Timeout Handlinga

#### Koraci:

**6.1 Kreirati timeout utility**
```typescript
// Kreirati: server/src/utils/timeout.ts
export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

export function createAbortableRequest<T>(
  requestFn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return requestFn(controller.signal)
    .finally(() => clearTimeout(timeoutId));
}
```

**6.2 Integrirati timeout u AI providere**
```typescript
// Modificirati: server/src/services/providers/anthropic.provider.ts
import { withTimeout, createAbortableRequest, TimeoutError } from '../../utils/timeout';

// U AnthropicProvider klasi:
public async generateText(
  prompt: string,
  options?: AIGenerationOptions,
): Promise<string> {
  const timeout = options?.timeout || 30000;

  return retryWithBackoff(async () => {
    try {
      const response = await withTimeout(
        this.client.messages.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature || 0.7,
        }),
        timeout
      );

      if (response.content && response.content[0]?.type === 'text') {
        return response.content[0].text;
      }

      throw new AIInvalidResponseError(
        this.getProviderName(), 
        'No valid text content in response'
      );
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new AITimeoutError(this.getProviderName(), timeout);
      }
      
      if (error instanceof AIProviderError) {
        const shouldRetry = !(error instanceof AIInvalidKeyError);
        throw new RetryableError(error.message, shouldRetry);
      }
      
      const mappedError = mapAIError(error, this.getProviderName());
      const shouldRetry = !(mappedError instanceof AIInvalidKeyError);
      throw new RetryableError(mappedError.message, shouldRetry);
    }
  }, {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000
  });
}

public async validateConnection(): Promise<boolean> {
  try {
    await withTimeout(
      this.client.messages.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10,
      }),
      10000 // Kraći timeout za validaciju
    );
    return true;
  } catch (error) {
    console.error('Anthropic connection validation failed:', error);
    return false;
  }
}
```

## 📋 Sažetak Implementacije

### Redoslijed implementacije:
1. **Rate Limiting** - Kritično za troškove i sigurnost
2. **Osnovni Testovi** - Osiguraj da postojeći kod radi
3. **Custom Error Klase** - Poboljšaj error handling
4. **Factory Pattern** - Pripremi za buduće providere
5. **Retry Logika** - Poboljšaj pouzdanost
6. **Timeout Handling** - Sprečava viseće zahtjeve

### Datoteke za kreiranje:
- `server/src/middleware/rateLimiter.ts`
- `server/src/services/ai.errors.ts`
- `server/src/services/ai.types.ts`
- `server/src/services/ai.factory.ts`
- `server/src/services/providers/anthropic.provider.ts`
- `server/src/services/providers/openai.provider.ts`
- `server/src/utils/retry.ts`
- `server/src/utils/timeout.ts`
- `server/src/services/__tests__/ai.service.test.ts`
- `server/src/services/__tests__/context.builder.test.ts`
- `server/src/__tests__/ai.integration.test.ts`

### Datoteke za modificiranje:
- `server/src/api.ts`
- `server/src/services/ai.service.ts`
- `server/src/middleware/errorHandler.ts`

Ovaj plan osigurava robusniju, sigurniju i skalabilniju AI integraciju spremnu za produkciju.
