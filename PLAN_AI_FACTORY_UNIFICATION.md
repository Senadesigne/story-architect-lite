⚠️ IMPLEMENTIRANO u Fazi 2 (commit 3be2b66). Ovaj dokument je arhiviran.
Aktualna referenca: MASTER_PLAN_REFAKTORIRANJA.md — Faza 2.

---

# Plan: Unifikacija AI Factory Sustava

**Datum:** 2026-04-20  
**Status:** ✅ IMPLEMENTIRANO (commit 3be2b66, 2026-04-26)  
**Cilj:** Ukloniti duplikaciju, dodati env-konfigurabilne modele i Ollama podršku, refaktorirati nodes.ts.

---

## 0. Kontekst: Trenutno stanje (problem)

Postoje **dva odvojena, nekompatibilna factory sustava** koja se koriste simultano:

### Factory A — Stari (aktivan u produkciji)
`server/src/services/ai.factory.ts`  
- Koristi custom `AIProvider` interfejs (`ai.service.ts`)
- Async, podržava anthropic i openai
- **Koristi se u:** `api.ts` (2 mjesta), `graph/nodes.ts` (5 mjesta)
- `createManagerProvider` i `createWorkerProvider` **ne podržavaju model selection** — uvijek padaju na Haiku
- Nema Ollama podrške

### Factory B — Novi (mrtvi kod)
`server/src/services/ai/ai.factory.ts`  
- Koristi LangChain `BaseChatModel` (nekompatibilan s `AIProvider` interfejsom)
- Synchronous, podržava anthropic/openai/**ollama**
- **Koristi se u:** `ai/ai.nodes.ts` i `ai/ai.graph.ts` — koji su **mrtvi kod** (niko ih ne importa)
- Hardkodirani modeli, nema env var za model

### Posljedica
`graph/nodes.ts:59,113,157` — `transformQueryNode`, `routeTaskNode`, `handleSimpleRetrievalNode` pozivaju `createPreferredAIProvider('anthropic')` umjesto `createManagerProvider()`, čime zaobilaze cijelu manager/worker logiku i uvijek koriste Haiku.

---

## 1. Pregled promjena (summary)

| Fajl | Akcija | Opis |
|---|---|---|
| `services/ai.factory.ts` | **MODIFICIRATI** | Dodati Ollama, model env vars, proširiti tip |
| `services/providers/anthropic.provider.ts` | **MODIFICIRATI** | Čitati model iz konstruktora/env, ne hardkodirati |
| `services/providers/openai.provider.ts` | **MODIFICIRATI** | Čitati model iz konstruktora/env, ne hardkodirati |
| `services/providers/ollama.provider.ts` | **KREIRATI** | Novi provider koji implementira `AIProvider` |
| `services/ai/graph/nodes.ts` | **MODIFICIRATI** | 3 mjesta: `createPreferredAIProvider` → `createManagerProvider` |
| `services/ai/ai.factory.ts` | **OBRISATI** | Mrtvi kod (LangChain varijanta) |
| `services/ai/ai.nodes.ts` | **OBRISATI** | Mrtvi kod |
| `services/ai/ai.graph.ts` | **OBRISATI** | Mrtvi kod |
| `services/ai.service.ts` | **MODIFICIRATI** | Ažurirati exportove |
| `server/.env.example` | **MODIFICIRATI** | Dodati nove varijable |

---

## 2. Detaljne promjene po fajlu

---

### 2.1. `server/src/services/ai.factory.ts` — MODIFICIRATI

Ovo je jedini factory. Sve promjene u njemu.

#### 2.1.1. Proširiti `AIProviderType` tip

```typescript
// PRIJE:
export type AIProviderType = 'anthropic' | 'openai';

// POSLIJE:
export type AIProviderType = 'anthropic' | 'openai' | 'ollama';
```

#### 2.1.2. Proširiti `AIProviderConfig` interfejs

```typescript
// PRIJE:
export interface AIProviderConfig {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
}

// POSLIJE:
export interface AIProviderConfig {
  apiKey?: string;          // Optional jer Ollama ne treba API ključ
  model?: string;           // Specifičan model (override defaulta)
  baseUrl?: string;         // Za Ollama endpoint
  timeout?: number;
  maxRetries?: number;
}
```

#### 2.1.3. Ažurirati `createAIProvider` da prihvaća i prosljeđuje model

```typescript
export async function createAIProvider(
  type: AIProviderType,
  config: AIProviderConfig
): Promise<AIProvider> {
  switch (type) {
    case 'anthropic': {
      const { AnthropicProvider } = await import('./providers/anthropic.provider.js');
      return new AnthropicProvider(config.apiKey!, config.model);
    }
    case 'openai': {
      const { OpenAIProvider } = await import('./providers/openai.provider.js');
      return new OpenAIProvider(config.apiKey!, config.model);
    }
    case 'ollama': {
      const { OllamaProvider } = await import('./providers/ollama.provider.js');
      return new OllamaProvider(
        config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        config.model || process.env.OLLAMA_MODEL || 'llama3'
      );
    }
    default:
      throw new Error(`Unknown AI provider type: ${type}`);
  }
}
```

#### 2.1.4. Ažurirati `createPreferredAIProvider` da podržava Ollama

```typescript
export async function createPreferredAIProvider(preference: AIProviderType = 'anthropic'): Promise<AIProvider> {
  const { getAIConfig } = await import('../lib/config.js');
  const config = getAIConfig();

  const timeout = parseInt(process.env.AI_DEFAULT_TIMEOUT || '30000');
  const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '3');

  // Ollama ne treba API ključ — samo provjeri je li odabran
  if (preference === 'ollama') {
    console.log('[AI_FACTORY] Using Ollama (local LLM)');
    return createAIProvider('ollama', { timeout });
  }

  if (preference === 'anthropic' && config.anthropicApiKey) {
    console.log('[AI_FACTORY] Using preferred provider: Anthropic');
    return createAIProvider('anthropic', { apiKey: config.anthropicApiKey, timeout, maxRetries });
  }

  if (preference === 'openai' && config.openaiApiKey) {
    console.log('[AI_FACTORY] Using preferred provider: OpenAI');
    return createAIProvider('openai', { apiKey: config.openaiApiKey, timeout, maxRetries });
  }

  // Fallback logika (ostaje ista)
  if (config.anthropicApiKey) {
    console.log(`[AI_FACTORY] Fallback to Anthropic`);
    return createAIProvider('anthropic', { apiKey: config.anthropicApiKey, timeout, maxRetries });
  }

  if (config.openaiApiKey) {
    console.log(`[AI_FACTORY] Fallback to OpenAI`);
    return createAIProvider('openai', { apiKey: config.openaiApiKey, timeout, maxRetries });
  }

  throw new Error('No valid AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or use MANAGER_AI_PROVIDER=ollama.');
}
```

#### 2.1.5. Ažurirati `createManagerProvider` da čita i model

```typescript
// PRIJE:
export async function createManagerProvider(): Promise<AIProvider> {
  const providerType = (process.env.MANAGER_AI_PROVIDER as AIProviderType) || 'anthropic';
  return createPreferredAIProvider(providerType);
}

// POSLIJE:
export async function createManagerProvider(): Promise<AIProvider> {
  const providerType = (process.env.MANAGER_AI_PROVIDER as AIProviderType) || 'anthropic';
  const model = process.env.MANAGER_AI_MODEL; // undefined = provider default
  console.log(`[AI_FACTORY] Creating Manager provider: ${providerType}${model ? ` (model: ${model})` : ''}`);

  if (providerType === 'ollama') {
    return createAIProvider('ollama', { model });
  }

  const { getAIConfig } = await import('../lib/config.js');
  const config = getAIConfig();
  const timeout = parseInt(process.env.AI_DEFAULT_TIMEOUT || '30000');

  if (providerType === 'anthropic' && config.anthropicApiKey) {
    return createAIProvider('anthropic', { apiKey: config.anthropicApiKey, model, timeout });
  }
  if (providerType === 'openai' && config.openaiApiKey) {
    return createAIProvider('openai', { apiKey: config.openaiApiKey, model, timeout });
  }

  // Fallback
  return createPreferredAIProvider(providerType);
}
```

#### 2.1.6. Ažurirati `createWorkerProvider` (isti pattern kao Manager)

```typescript
// POSLIJE:
export async function createWorkerProvider(): Promise<AIProvider> {
  const providerType = (process.env.WORKER_AI_PROVIDER as AIProviderType) || 'anthropic';
  const model = process.env.WORKER_AI_MODEL;
  console.log(`[AI_FACTORY] Creating Worker provider: ${providerType}${model ? ` (model: ${model})` : ''}`);

  if (providerType === 'ollama') {
    return createAIProvider('ollama', { model });
  }

  const { getAIConfig } = await import('../lib/config.js');
  const config = getAIConfig();
  const timeout = parseInt(process.env.AI_DEFAULT_TIMEOUT || '45000'); // Worker dobiva duži timeout

  if (providerType === 'anthropic' && config.anthropicApiKey) {
    return createAIProvider('anthropic', { apiKey: config.anthropicApiKey, model, timeout });
  }
  if (providerType === 'openai' && config.openaiApiKey) {
    return createAIProvider('openai', { apiKey: config.openaiApiKey, model, timeout });
  }

  return createPreferredAIProvider(providerType);
}
```

---

### 2.2. `server/src/services/providers/anthropic.provider.ts` — MODIFICIRATI

#### Promjena konstruktora da prihvati opcionalni model

```typescript
// PRIJE:
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model = 'claude-3-haiku-20240307';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

// POSLIJE:
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    // Prioritet: 1. argument, 2. env var, 3. default
    this.model = model
      || process.env.ANTHROPIC_MODEL
      || 'claude-3-haiku-20240307';
  }
```

**Napomena:** Ostatak klase ostaje nepromijenjen — `this.model` se već koristi u svim pozivima.

---

### 2.3. `server/src/services/providers/openai.provider.ts` — MODIFICIRATI

Isti pattern kao Anthropic:

```typescript
// POSLIJE:
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model
      || process.env.OPENAI_MODEL
      || 'gpt-4o-mini';
  }
```

---

### 2.4. `server/src/services/providers/ollama.provider.ts` — KREIRATI (novi fajl)

Novi fajl koji implementira `AIProvider` interfejs koristeći Ollama REST API.

```typescript
import { AIProvider, AIGenerationOptions } from '../ai.service.js';
import {
  AIProviderError,
  AIInvalidResponseError,
  AITimeoutError,
  mapAIError
} from '../ai.errors.js';
import { retryWithBackoff, RetryConfigs } from '../../utils/retry.js';

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Ukloni trailing slash
    this.model = model;
  }

  public getProviderName(): string {
    return 'ollama';
  }

  public async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      console.error('[OllamaProvider] Connection validation failed');
      return false;
    }
  }

  public async generateText(prompt: string, options?: AIGenerationOptions): Promise<string> {
    return retryWithBackoff(async () => {
      const timeoutMs = options?.timeout || 60000; // Ollama može biti sporiji

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 1024,
          }
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        throw new AIProviderError(
          `Ollama API error: ${response.status} ${response.statusText}`,
          this.getProviderName()
        );
      }

      const data = await response.json() as { response?: string; error?: string };

      if (data.error) {
        throw new AIProviderError(`Ollama error: ${data.error}`, this.getProviderName());
      }

      if (!data.response) {
        throw new AIInvalidResponseError(this.getProviderName(), 'Empty response from Ollama');
      }

      return data.response.trim();
    }, RetryConfigs.AI_API);
  }
}
```

---

### 2.5. `server/src/services/ai/graph/nodes.ts` — MODIFICIRATI (3 mjesta)

#### Promjena importa (linija 3)

```typescript
// PRIJE:
import { createPreferredAIProvider, createManagerProvider, createWorkerProvider } from '../../ai.factory.js';

// POSLIJE:
import { createManagerProvider, createWorkerProvider } from '../../ai.factory.js';
// createPreferredAIProvider se više ne koristi — brisanje importa sprječava budući misuse
```

#### `transformQueryNode` (linija ~59)

```typescript
// PRIJE:
const aiProvider = await createPreferredAIProvider('anthropic');

// POSLIJE:
const aiProvider = await createManagerProvider();
```

#### `routeTaskNode` (linija ~113)

```typescript
// PRIJE:
const aiProvider = await createPreferredAIProvider('anthropic');

// POSLIJE:
const aiProvider = await createManagerProvider();
```

#### `handleSimpleRetrievalNode` (linija ~157)

```typescript
// PRIJE:
const aiProvider = await createPreferredAIProvider('anthropic');

// POSLIJE:
const aiProvider = await createManagerProvider();
```

**Rezultat:** Svi čvorovi koji rade "jeftinu" analizu (transform, route, simple retrieval, manager context, critique) sada koriste isti `createManagerProvider()` koji je konfiguriran kroz env varijable.

---

### 2.6. `server/src/services/ai.service.ts` — MODIFICIRATI

Dodati eksport `createManagerProvider` i `createWorkerProvider` radi konzistentnosti (opcionalno, ali korisno za `api.ts`):

```typescript
// Dodati na kraju exporta:
export { createManagerProvider, createWorkerProvider } from './ai.factory.js';
```

---

### 2.7. `server/src/services/ai/ai.factory.ts` — OBRISATI

Cijeli fajl. Koristi `BaseChatModel` (LangChain) koji nije kompatibilan s `AIProvider` interfejsom. Importaju ga samo mrtvi fajlovi.

**Provjera prije brisanja:** Pokrenuti `grep -r "ai/ai.factory" server/src` — ne smije biti rezultata izvan `ai.nodes.ts` i `ai.graph.ts`.

---

### 2.8. `server/src/services/ai/ai.nodes.ts` — OBRISATI

Mrtvi kod — nitko ga ne importa osim `ai.graph.ts`. Zamjenjen je sa `graph/nodes.ts`.

**Provjera:** `grep -r "ai.nodes" server/src/api.ts` — mora biti prazan rezultat.

---

### 2.9. `server/src/services/ai/ai.graph.ts` — OBRISATI

Mrtvi kod — nije importan nigdje u produkcijskom kodu (samo u README.md).

**Provjera:** `grep -r "ai.graph" server/src/api.ts` — mora biti prazan rezultat.

---

### 2.10. `server/.env.example` — MODIFICIRATI

```dotenv
# Database Configuration
DATABASE_URL=

# Server Configuration
PORT=8787
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# ============================================================
# AI Provider Configuration
# ============================================================
# Dostupni provideri: anthropic | openai | ollama
#
# MANAGER = jeftini/lokalni model (analiza, routing, kritika)
# WORKER  = pametniji model (generiranje teksta)
# ============================================================

# Manager provider (default: anthropic)
MANAGER_AI_PROVIDER=anthropic

# Manager model override (ako je prazno, koristi se provider default)
# Anthropic default: claude-3-haiku-20240307
# OpenAI default: gpt-4o-mini
# Ollama default: llama3
MANAGER_AI_MODEL=

# Worker provider (default: anthropic)
WORKER_AI_PROVIDER=anthropic

# Worker model override
# Anthropic default: claude-3-haiku-20240307 (promjeni u claude-3-5-sonnet-20241022 za bolji output)
# OpenAI default: gpt-4o-mini (promjeni u gpt-4o za bolji output)
WORKER_AI_MODEL=

# API ključevi (potrebni samo za cloud providere)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Ollama konfiguracija (potrebno samo ako je provider=ollama)
# Lokalni endpoint (default: http://localhost:11434)
OLLAMA_BASE_URL=http://localhost:11434
# Model koji mora biti instaliran u Ollami (npr. llama3, mistral, phi3)
OLLAMA_MODEL=llama3

# AI timeout i retry konfiguracija
AI_DEFAULT_TIMEOUT=30000
AI_MAX_RETRIES=3
```

---

## 3. Primjeri konfiguracije (kako koristiti)

### Produkcija (cloud, ekonomično)
```dotenv
MANAGER_AI_PROVIDER=anthropic
MANAGER_AI_MODEL=claude-3-haiku-20240307
WORKER_AI_PROVIDER=anthropic
WORKER_AI_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-...
```

### Produkcija (cloud, kvalitetno)
```dotenv
MANAGER_AI_PROVIDER=openai
MANAGER_AI_MODEL=gpt-4o-mini
WORKER_AI_PROVIDER=openai
WORKER_AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
```

### Lokalni razvoj (RTX 8000 / Ollama)
```dotenv
MANAGER_AI_PROVIDER=ollama
MANAGER_AI_MODEL=llama3
WORKER_AI_PROVIDER=ollama
WORKER_AI_MODEL=llama3
OLLAMA_BASE_URL=http://localhost:11434
# API ključevi nisu potrebni
```

### Hibridno (Manager lokalno, Worker cloud)
```dotenv
MANAGER_AI_PROVIDER=ollama
MANAGER_AI_MODEL=llama3
WORKER_AI_PROVIDER=anthropic
WORKER_AI_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 4. Redoslijed implementacije

Raditi točno ovim redoslijedom da se nikad ne naruši build:

1. **Kreirati** `ollama.provider.ts` (novi fajl, nema utjecaja na postojeći kod)
2. **Modificirati** `anthropic.provider.ts` (dodati opcionalni argument, backwards compatible)
3. **Modificirati** `openai.provider.ts` (isti pattern)
4. **Modificirati** `ai.factory.ts` (proširiti tipove i logiku)
5. **Modificirati** `ai.service.ts` (dodati exportove)
6. **Modificirati** `graph/nodes.ts` (zamijeniti 3 poziva + ukloniti import)
7. **Ažurirati** `.env.example`
8. **Obrisati** `ai/ai.factory.ts`, `ai/ai.nodes.ts`, `ai/ai.graph.ts`

---

## 5. Testiranje nakon implementacije

### Provjera 1: TypeScript build
```bash
cd server && pnpm tsc --noEmit
```
Mora proći bez grešaka.

### Provjera 2: Postojeći testovi
```bash
cd server && pnpm test
```
Testovi u `services/__tests__/ai.service.test.ts` i `__tests__/ai.integration.test.ts` moraju prolaziti.

### Provjera 3: Mrtvi fajlovi su obrisani
```bash
grep -r "ai/ai.factory" server/src
grep -r "ai/ai.nodes" server/src
grep -r "ai/ai.graph" server/src
```
Svi upiti moraju vratiti prazan rezultat (ili samo README).

### Provjera 4: createPreferredAIProvider nije u nodes.ts
```bash
grep "createPreferredAIProvider" server/src/services/ai/graph/nodes.ts
```
Mora biti prazan rezultat.

### Provjera 5: Ollama radi lokalno (opcionalno)
```bash
# Pokrenuti Ollamu lokalno s llama3 modelom, zatim:
MANAGER_AI_PROVIDER=ollama WORKER_AI_PROVIDER=ollama node -e "
  const { createManagerProvider } = require('./dist/services/ai.factory.js');
  createManagerProvider().then(p => p.generateText('Test')).then(console.log);
"
```

---

## 6. Rizici i mitigacija

| Rizik | Vjerojatnost | Mitigacija |
|---|---|---|
| `api.ts` linija 105 i 953 koriste `createDefaultAIProvider` — ona je ostala nepromijenjena | Nizak | Funkcija se poziva samo za `/api/ai/test` rutu i `scene synopsis` — obje su fallback na Anthropic što je ispravno ponašanje |
| Ollama API format se može razlikovati između verzija | Srednji | Testirati s `/api/tags` endpoint provjera; ako format promijeni, izolirana izmjena samo u `OllamaProvider` |
| Brisanje `ai/ai.*.ts` fajlova može srušiti build ako ih nešto importa | Nizak | Provjeriti grep prije brisanja (korak u planu) |
| `AbortSignal.timeout()` nije dostupan u starijim Node verzijama | Nizak | Provjeriti verziju Node u `server/package.json`; fallback na `setTimeout + controller.abort()` pattern koji se već koristi u ostalim providerima |
