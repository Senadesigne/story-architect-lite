# Tehnički Plan za AI Service Sloj - Zadatak 3.2

Analizirajući postojeću arhitekturu projekta i zahtjeve iz `.cursorrules` i tehničke specifikacije, evo detaljnog tehničkog plana za implementaciju AI service sloja:

## 1. **Backend: Organizacija AIProvider sučelja i konkretnih klasa**

### Struktura datoteke `server/src/services/ai.service.ts`:

```typescript
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

// 3. Konkretne implementacije
export class AnthropicProvider implements AIProvider
export class OpenAIProvider implements AIProvider
export class LocalLLMProvider implements AIProvider (za buduću upotrebu)

// 4. Factory pattern
export function createAIProvider(type: AIProviderType, config: AIProviderConfig): AIProvider

// 5. Glavna AIService klasa
export class AIService {
  private provider: AIProvider;
  
  constructor(providerType: AIProviderType)
  async generateText(prompt: string, options?: AIGenerationOptions): Promise<string>
  async validateProvider(): Promise<boolean>
  switchProvider(newProviderType: AIProviderType): void
}
```

### Ključne arhitekturne odluke:
- **Dependency Injection pattern**: AIService prima provider kroz konstruktor
- **Strategy pattern**: Lako mijenjanje između različitih AI providera
- **Factory pattern**: Centralizirano kreiranje providera s validacijom
- **Interface segregation**: Jasno definirane odgovornosti

## 2. **Kontekst: Integracija s bazom podataka (schema.ts)**

Podaci iz baze će se ubacivati kroz:

### Context Builder funkcije:
```typescript
// U ai.service.ts ili zasebnoj datoteci
export class ContextBuilder {
  static async buildProjectContext(projectId: string, db: Database): Promise<ProjectContext>
  static async buildSceneContext(sceneId: string, projectId: string, db: Database): Promise<SceneContext>
  static async buildCharacterContext(characterId: string, projectId: string, db: Database): Promise<CharacterContext>
}
```

### Tipovi konteksta:
```typescript
export interface ProjectContext {
  project: ProjectData;
  characters: CharacterData[];
  locations: LocationData[];
  scenes: SceneData[];
}
```

**Integracija s postojećom shemom:**
- Koristi postojeće Drizzle ORM relacije iz `schema.ts`
- Poštuje `projectId` ownership pattern
- Koristi postojeće indekse za performanse

## 3. **Prompt Engineering: Organizacija promptova**

### Strategija organizacije:
```typescript
// server/src/services/prompt.service.ts (nova datoteka)
export class PromptService {
  static buildSceneSynopsisPrompt(context: SceneContext): string
  static buildCharacterDevelopmentPrompt(context: CharacterContext): string
  static buildPlotOutlinePrompt(context: ProjectContext): string
}
```

**Razlog za zasebnu datoteku:**
- Promptovi su kompleksni i trebaju vlastitu logiku
- Lakše testiranje i održavanje
- Mogućnost A/B testiranja različitih prompt strategija
- Separation of concerns - AI service se fokusira na komunikaciju, prompt service na sadržaj

## 4. **Frontend: Konzumacija kroz API rute**

Frontend će konzumirati AI funkcionalnost kroz:

### API endpoint pattern:
```typescript
// U api.ts
POST /api/projects/:projectId/ai/generate-scene-synopsis
POST /api/projects/:projectId/ai/generate-character-arc
POST /api/ai/test (za development)
```

### Frontend integracija:
```typescript
// ui/src/lib/serverComm.ts - proširiti postojeći api objekt
export const api = {
  // postojeće metode...
  ai: {
    generateSceneSynopsis: (projectId: string, sceneId: string) => Promise<AIResponse>,
    testConnection: (prompt: string) => Promise<AITestResponse>
  }
}
```

## 5. **Error Handling: Strategija za AI greške**

### Hijerarhija AI grešaka:
```typescript
// Proširiti postojeće error klase u middleware/errorHandler.ts
export class AIProviderError extends Error {
  constructor(message: string, public providerName: string, public originalError?: Error)
}

export class AITimeoutError extends AIProviderError {
  constructor(providerName: string, timeoutMs: number)
}

export class AIQuotaExceededError extends AIProviderError {
  constructor(providerName: string)
}

export class AIInvalidKeyError extends AIProviderError {
  constructor(providerName: string)
}
```

### Error handling strategija u AIProvider implementacijama:
```typescript
// U svakoj konkretnoj implementaciji
async generateText(prompt: string, options?: AIGenerationOptions): Promise<string> {
  try {
    // AI API poziv s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout || 30000);
    
    const response = await this.client.generate(prompt, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    return response;
  } catch (error) {
    // Specifično mapiranje grešaka ovisno o provideru
    if (error.code === 'insufficient_quota') {
      throw new AIQuotaExceededError(this.getProviderName());
    }
    if (error.code === 'invalid_api_key') {
      throw new AIInvalidKeyError(this.getProviderName());
    }
    if (error.name === 'AbortError') {
      throw new AITimeoutError(this.getProviderName(), options?.timeout || 30000);
    }
    
    throw new AIProviderError(`AI generation failed: ${error.message}`, this.getProviderName(), error);
  }
}
```

### Graceful degradation:
- Retry logika s exponential backoff
- Fallback na alternativni provider
- Cache prethodnih odgovora za slične promptove

## 6. **Sigurnost: API ključevi i environment varijable**

### Environment varijable struktura:
```env
# Glavni AI provider
AI_PROVIDER=anthropic  # ili 'openai'
AI_API_KEY=sk-ant-...  # ili OpenAI ključ

# Backup provider (opcionalno)
AI_BACKUP_PROVIDER=openai
AI_BACKUP_API_KEY=sk-...

# AI konfiguracija
AI_DEFAULT_TIMEOUT=30000
AI_MAX_RETRIES=3
AI_CACHE_TTL=3600
```

### Sigurnosne mjere u kodu:
```typescript
// server/src/lib/env.ts - proširiti postojeće funkcije
export function getAIConfig(): AIConfig {
  const provider = process.env.AI_PROVIDER;
  const apiKey = process.env.AI_API_KEY;
  
  if (!provider || !apiKey) {
    throw new Error('AI configuration missing. Please set AI_PROVIDER and AI_API_KEY environment variables.');
  }
  
  // Nikad ne logiraj API ključeve
  console.log(`AI Provider configured: ${provider}`);
  
  return {
    provider: provider as AIProviderType,
    apiKey,
    timeout: parseInt(process.env.AI_DEFAULT_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3')
  };
}
```

### Dodatne sigurnosne mjere:
- API ključevi se čitaju samo pri inicijalizaciji
- Ključevi se ne prosljeđuju kroz logove ili error poruke
- Rate limiting na AI endpoint-ima
- Validacija da ključevi imaju ispravnu strukturu

---

## Konkretni koraci implementacije:

### Korak 1: Kreiranje osnovne strukture
1. Kreirati `server/src/services/` direktorij
2. Kreirati `ai.service.ts` s osnovnim interface-ima
3. Implementirati `AnthropicProvider` kao prvu konkretnu implementaciju

### Korak 2: Integracija s postojećim sustavom
1. Proširiti `server/src/lib/env.ts` s AI konfiguracijskim funkcijama
2. Dodati AI error klase u `middleware/errorHandler.ts`
3. Kreirati `PromptService` za upravljanje promptovima

### Korak 3: API integracija
1. Dodati AI rute u `api.ts` koristeći postojeći middleware pattern
2. Implementirati `POST /api/ai/test` za proof of concept
3. Implementirati `POST /api/projects/:projectId/ai/generate-scene-synopsis`

### Korak 4: Testiranje i validacija
1. Kreirati unit testove za `AIProvider` implementacije
2. Testirati error handling scenarije
3. Validirati sigurnost API ključeva

Ovaj plan poštuje sve zahtjeve iz `.cursorrules`, koristi postojeću arhitekturu projekta i osigurava skalabilnost za buduće AI značajke.

Plan je spreman za implementaciju i poštuje sva pravila iz `.cursorrules` te se uklapa u postojeću arhitekturu projekta! 🚀

---

## Implementacijski Koraci (To-Do)

Ovdje pratimo pod-zadatke razbijene iz gornjeg tehničkog plana.

### ✅ Zadatak 3.2: Kreirati AI service sloj

* [x] **3.2.1:** Kreiraj direktorij `server/src/services/`.
* [x] **3.2.2:** Kreiraj datoteku `server/src/services/ai.service.ts`.
* [x] **3.2.3:** U `ai.service.ts`, definiraj i izvezi (export) sučelja `AIProvider` i `AIGenerationOptions` (točno kako je definirano u planu).
* [x] **3.2.4:** U `ai.service.ts`, importaj `Anthropic` klijent iz `@anthropic-ai/sdk`.
* [x] **3.2.5:** U `ai.service.ts`, implementiraj i izvezi `class AnthropicProvider implements AIProvider`.
    * Dodaj `private client: Anthropic;` polje.
    * Implementiraj `constructor(apiKey: string)` koji inicijalizira klijent (`this.client = new Anthropic({ apiKey });`).
    * Implementiraj `getProviderName(): string` (mora vraćati `'anthropic'`).
    * Implementiraj *praznu* (za sada) `validateConnection(): Promise<boolean>` (mora vraćati `Promise.resolve(true);`).
    * Implementiraj *praznu* (za sada) `generateText(prompt: string, options?: AIGenerationOptions): Promise<string>` (mora vraćati `Promise.resolve('AI response placeholder');`).
* [x] **3.2.6:** Kreiraj datoteku `server/src/lib/config.ts` (ako već ne postoji) i dodaj funkciju `getAIConfig()` koja čita `ANTHROPIC_API_KEY` iz `process.env`. Funkcija mora baciti grešku ako varijabla nije postavljena.
* [x] **3.2.7:** Uputi korisnika (mene) da doda `ANTHROPIC_API_KEY=...` u svoju `.env` datoteku (prema i iz `.cursorrules`).

### ✅ Zadatak 3.4: Implementirati `POST /api/ai/test` (Proof of Concept) - DOVRŠENO
* [x] **3.4.1:** Implementirati pravu logiku u `generateText` metodi (unutar `AnthropicProvider`) da poziva `this.client.messages.create()`.
* [x] **3.4.2:** Implementirati pravu logiku u `validateConnection` metodi da radi stvarni (ali jeftin) testni poziv prema Anthropic API-ju.
* [x] **3.4.3:** Dodati novu API rutu `POST /api/ai/test` u `server/src/api.ts`.
* [x] **3.4.4:** Unutar nove rute, importati i koristiti `getAIConfig` i `AnthropicProvider` za testiranje AI odgovora.

---
