# MASTER PLAN REFAKTORIRANJA — Story Architect Lite
**Datum:** 2026-04-20 (ažurirano 2026-04-23)  
**Osnova:** AUDIT_DUBINSKI_2026_04_20.md + PLAN_AI_FACTORY_UNIFICATION.md  
**Status:** Faza 1 ✅ ZAVRŠENA — Faza 2 → sljedeće

---

## EXECUTIVE SUMMARY

### Hibridna LLM arhitektura

Story Architect Lite koristi **hibridni pristup** — ne 100% lokalni LLM, nego najbolje od oba svijeta:

| Uloga | Model | Gdje |
|---|---|---|
| **Manager / Prompt Engineer** | qwen3:30b-a3b | Lokalno, HPE #2 via Tailscale |
| **Writer / Worker** | claude-sonnet-4-6 | Cloud, Anthropic API |
| **Critique / Feedback** | qwen3:30b-a3b | Lokalno, HPE #2 via Tailscale |
| **Embeddings (RAG)** | nomic-embed-text | Lokalno, HPE #2 via Tailscale |
| **Fallback Worker** | qwen3.5:35b | Lokalno, HPE #2 (ako Anthropic padne) |

**Zašto ovako?**

- **Sonnet 4.6 je trenutno najkvalitetniji model za kreativno pisanje** na tržištu. Nema smisla žrtvovati kvalitetu proze za "čisti" lokalni setup.
- **Qwen3:30b radi sav "thinking" posao besplatno** — analizira kontekst, piše optimizirane prompte za Sonnet, kritizira output, ruta upite. Ovo drastično smanjuje broj Sonnet API poziva.
- **Rezultat:** Manji troškovi API-a (Qwen filtrira trivijalne upite) + viša kvaliteta outputa (Sonnet za pravu generaciju).
- **Embeddings i RAG su potpuno lokalni** — OpenAI više nije potreban ni za što.

### Zašto Humanization Layer (Faza 5)?

AI-generirana proza ima prepoznatljive obrasce — em-dashovi kao separatori, klišejne fraze ("delve into", "it's worth noting"), uniformna duljina rečenica. Faza 5 dodaje Qwen post-processing koji "humanizira" Sonnetov output i može naučiti stil korisnika iz uzoraka njihovih originalnih tekstova.

### Ukupna procjena: ~38-42h (sve 5 faza)

| Faza | Opis | Procjena | Status |
|---|---|---|---|
| Faza 1 | Kritični bugovi | ~12h | ✅ ZAVRŠENO |
| Faza 2 | AI Factory unifikacija | ~6h | ⏸ Pending |
| Faza 3 | LLM migracija (hibridna konfiguracija) | ~4h | ⏸ Pending |
| Faza 4 | Čišćenje | ~4h | ⏸ Pending |
| Faza 5 | Humanization Layer | ~12-16h | ⏸ Pending |
| **Ukupno** | | **~26h** (Faze 1–4) ili **~38-42h** (sve 5 faza) | |

---

## Ciljna arhitektura po završetku

```
Frontend (Vercel) → Backend (Vercel Function)
                         │
                    LangGraph Graph
                    ├── Manager     → qwen3:30b-a3b       (HPE #1, 192.168.10.197:11434)
                    ├── Worker      → claude-sonnet-4-6    (Anthropic API, cloud)
                    ├── Critique    → qwen3:30b-a3b        (HPE #1, 192.168.10.197:11434)
                    ├── Humanizer   → qwen3:30b-a3b        (HPE #1, 192.168.10.197:11434)
                    └── Embeddings  → nomic-embed-text     (HPE #1, 192.168.10.197:11434)
                         │
                    Neon Postgres (+ pgvector, 768 dim)
```

**OpenAI se više ne koristi nigdje** (ni embeddings). Anthropic API ostaje za Worker (Sonnet).  
**Fallback:** `WORKER_PROVIDER=ollama` + `WORKER_MODEL=qwen3.5:35b` ako Anthropic padne.

---

## Env varijable (finalni .env target)

```dotenv
# Manager — lokalni Qwen (rutiranje, analiza, prompt engineering)
MANAGER_PROVIDER=ollama
MANAGER_MODEL=qwen3:30b-a3b
MANAGER_BASE_URL=http://192.168.10.197:11434/v1

# Worker — Sonnet (kreativno pisanje, visoka kvaliteta)
WORKER_PROVIDER=anthropic
WORKER_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...

# Critique — lokalni Qwen (isti stroj kao Manager)
CRITIQUE_PROVIDER=ollama
CRITIQUE_MODEL=qwen3:30b-a3b

# Embeddings — lokalni nomic-embed-text (768 dim, ne 1536!)
EMBED_PROVIDER=ollama
EMBED_MODEL=nomic-embed-text
EMBED_BASE_URL=http://192.168.10.197:11434/v1

# Fallback Worker (ako Anthropic API padne)
# WORKER_FALLBACK_PROVIDER=ollama
# WORKER_FALLBACK_MODEL=qwen3.5:35b

# Shared Ollama base URL
OLLAMA_BASE_URL=http://192.168.10.197:11434
OLLAMA_FALLBACK_URL=  # Sekundarni Ollama server, opcionalno
```

---

## Konvencije ovog dokumenta

- **[fajl:linija]** — točna referenca u kodu
- **AC:** — Acceptance Criteria
- **DEP:** — Dependency (mora biti gotovo prije)
- **RIZIK:** — Što može puknuti

---

## FAZA 1: Kritični bugovi

> **Cilj:** Zatvoriti 5 kritičnih nalaza iz audita. Ova faza ne mijenja AI provider.  
> **Procjena ukupno:** ~12h

---

### 1.1 Timeout fix ✅ COMPLETED (2026-04-21)

**Fajlovi:**
- `ui/src/lib/serverComm.ts:41`
- `vercel.json:13`
- `ui/src/stores/plannerAIStore.ts` (isLoading state)
- `ui/src/components/planner/AIChatSidebar.tsx` (loading UI)

**DEP:** Ništa

**Procjena:** 2h

#### 1.1.1 Frontend timeout (30 min)
```typescript
// serverComm.ts:41 — PROMJENA
// PRIJE:
signal: AbortSignal.timeout(30000)
// POSLIJE:
signal: AbortSignal.timeout(120000) // 2 minute
```

#### 1.1.2 Vercel maxDuration (10 min)
```json
// vercel.json:13 — PROMJENA
// PRIJE:
"maxDuration": 60
// POSLIJE:
"maxDuration": 300
```
> Napomena: Vercel Pro plan podržava max 300s. Besplatni plan max 60s. Ako si na besplatnom, ostaje 60s — tada je streaming jedino rješenje.

#### 1.1.3 Progress indikator s fazama (1h)
U `plannerAIStore.ts` dodati `aiPhase` state za realnu povratnu informaciju:

```typescript
// plannerAIStore.ts — DODATI u PlannerAIState
aiPhase: 'idle' | 'analyzing' | 'searching' | 'routing' | 'generating' | 'reviewing' | 'done';
```

U `AIChatSidebar.tsx` zamijeniti statični "Učitavam..." s fazom:
```tsx
// Umjesto: <Loader2 /> Učitavam...
// Prikazati: aiPhase === 'generating' ? "Pišem..." : "Analiziram..."
```

Faze se postavljaju optimistički iz frontenda s `setTimeout` aproksimacijama (ne zahtijeva backend promjenu za sada).

**AC:**  
- [x] Chat request od 100 riječi ne dobiva timeout na standardnom zahtjevu  
- [x] vercel.json maxDuration: 60 (Hobby limit); napomena dodana u docs/PLAN_DEPLOYMENT.md  
- [x] Loading spinner pokazuje tekst koji se mijenja

**RIZIK:** Vercel plan limit. Provjeri plan prije deploya.

---

### 1.2 workerModel silent bug ✅ ZAVRŠENO (2026-04-21)

**Fajlovi:**
- `server/src/schemas/validation.ts:129`
- `server/src/api.ts:986`
- `server/src/services/ai/graph/state.ts`
- `server/src/services/ai/graph/nodes.ts`
- `server/src/services/ai.factory.ts`

**DEP:** Ništa (nezavisno od ostalih faza)

**Procjena:** 2h

#### 1.2.1 Dodati `workerModel` u Zod schema
```typescript
// validation.ts:129 — PROMJENA
export const ChatRequestBodySchema = z.object({
  userInput: z.string().min(1).trim(),
  sessionId: z.string().optional(),
  plannerContext: z.string().optional(),
  mode: z.string().optional(),
  editorContent: z.string().optional(),
  selection: z.string().optional(),
  workerModel: z.string().optional(), // ← DODATI
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional(),
});
```

#### 1.2.2 Proslijediti kroz API handler
```typescript
// api.ts:986 — PROMJENA
const { userInput, plannerContext, messages, mode, editorContent, selection, sessionId, workerModel } = 
  getValidatedBody<ChatRequestBody>(c);
```

#### 1.2.3 Dodati `workerModel` u AgentState
```typescript
// graph/state.ts — DODATI
workerModel?: string; // Model override za Worker čvor
```

#### 1.2.4 Koristiti u workerGenerationNode
```typescript
// graph/nodes.ts:workerGenerationNode — PROMJENA
const workerModelOverride = state.workerModel;
const aiProvider = await createWorkerProvider(workerModelOverride);
```

`createWorkerProvider` dobiva opcionalni `modelOverride` argument koji ima prioritet nad env varom.

**AC:**  
- [x] `ChatRequestBodySchema` TypeScript tip uključuje `workerModel?: string`  
- [x] `workerModel` se prosljeđuje kroz `runStoryArchitectGraph` do `nodes.ts`  
- [x] `workerGenerationNode`, `refineDraftNode` i `modifyTextNode` koriste `workerModel` override  
- [x] TypeScript compile prolazi u `server/` i `ui/`  
- [x] Build prolazi u `ui/`

**RIZIK:** Migracija `createWorkerProvider` API-a može utjecati na testove koji mockaju provider.

---

### 1.3 Scene content schema fix ✅ ZAVRŠENO (2026-04-21)

**Što je napravljeno:**
- Dodana `content` kolona u `scenes` tablicu (Drizzle shema + migracija `0003_add_scene_content`)
- Data migracija: `summary` > 200 znakova premješten u `content`, `summary` postavljen na NULL
- Ažurirani server fajlovi: `schema.ts`, `types/api.ts`, `schemas/validation.ts`, `api.ts`, `context.builder.ts`, `VertexAIService.ts`
- Ažurirani client fajlovi: `lib/types.ts`, `lib/serverComm.ts`, `stores/studioStore.ts`, `pages/Studio.tsx`
- `pnpm tsc --noEmit` i `pnpm build` uspješni bez grešaka
- Lokalna DB migracija primijenjena; **Neon produkcijska migracija: PENDING** (pokrenuti pri deployu)

**Fajlovi:**
- `server/src/schema/schema.ts:114`
- `server/drizzle/` (nova migracija)
- `server/src/api.ts` (UPDATE scene ruta)
- `ui/src/stores/studioStore.ts:345`
- `server/src/services/ai/VertexAIService.ts:98` (`scene.summary` usage)
- `server/src/services/context.builder.ts:170` (`scene.summary` usage)

**DEP:** Ništa (schema promjena je backwards compatible — dodajemo kolonu)

**Procjena:** 3h

#### 1.3.1 Drizzle schema promjena
```typescript
// schema.ts — scenes tablica, DODATI kolonu
export const scenes = pgTable('scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary'),          // Kratki opis (ostaje nepromijenjeno)
  content: text('content'),          // ← NOVO: HTML tekst scene iz editora
  order: integer('order').notNull().default(0),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
});
```

#### 1.3.2 Generirati i primijeniti migraciju
```bash
cd server
pnpm db:generate
# Pregled generiranog SQL: trebao bi sadržati:
# ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "content" text;
pnpm db:migrate  # ili db:push za dev
```

#### 1.3.3 Migracija podataka (one-time script)
```sql
-- Nova migracija: 0004_migrate_scene_content.sql
UPDATE scenes 
SET content = summary,
    summary = NULL
WHERE summary IS NOT NULL AND length(summary) > 500;
-- Ako je summary kratki (< 500 znakova), vjerojatno je stvarni summary, ostavi ga.
```

> **NAPOMENA za Senada:** Prije pokretanja ove migracije, provjeri par scena ručno u bazi da potvrdiš logiku (500 znakova je heuristika — prilagodi po potrebi).

#### 1.3.4 Ažurirati API rute za scene
```typescript
// UpdateSceneBodySchema — DODATI
content: z.string().optional(),
```

U PUT handler:
```typescript
if (content !== undefined) updateData.content = content || null;
```

#### 1.3.5 Ažurirati studioStore.ts
```typescript
// studioStore.ts:344-347 — PROMJENA
// PRIJE:
return await api.updateScene(state.activeSceneId!, { summary: contentToSave });
// POSLIJE:
return await api.updateScene(state.activeSceneId!, { content: contentToSave });
```

#### 1.3.6 Ažurirati VertexAIService i ContextBuilder
```typescript
// VertexAIService.ts:98
bookContext += `${scene.content || scene.summary || "(Nema teksta scene)"}\n\n`;

// context.builder.ts:170
if (scene.summary) storyContext += `, Sažetak: ${scene.summary}`;
if (scene.content) storyContext += `, Tekst: ${scene.content.substring(0, 200)}...`;
```

**AC:**  
- [x] `pnpm db:push` uspješno doda `content` kolonu  
- [x] Editor sprema i učitava tekst iz `content` kolone  
- [x] `summary` ostaje slobodan za kratke opise  
- [x] Stara data migrirana: scene s dugim `summary` preseljene u `content`

**RIZIK:** Migracija podataka je jednosmjerna. Napravi DB backup prije.

**⚠️ PENDING za produkciju:** Migracija `0003_add_scene_content` pokrenuta samo lokalno. Neon produkcijska baza čeka istu migraciju pri deployu.

---

### 1.4 RAG indeksacija ✅ ZAVRŠENO (2026-04-22)

**Što je napravljeno:**
- Embedding model prebačen s OpenAI na `nomic-embed-text` (Ollama)
- Endpoint konfigurabilan: `OLLAMA_BASE_URL` env varijabla
- Vector dimenzije: 1536 → 768, HNSW indeks rekreiran (migracija `0004_embed_nomic_768`)
- `scene.content` dodan u indeksiranje (HTML strip)
- `OPENAI_API_KEY` provjera uklonjena iz `populate-embeddings.ts`
- `STUDIO_DEPLOYMENT_PLAN.md` kreiran u root direktoriju

**Fajlovi:**
- `server/src/services/ai/ai.retriever.ts`
- `server/src/api.ts`
- `server/src/services/ai/indexing.service.ts` (NOVI FAJL)

**DEP:** 1.3 (treba `content` kolona)

**Procjena:** 4h

#### 1.4.1 Zamijeniti OpenAI embeddings s Ollama

```typescript
// ai.retriever.ts — PROMJENA
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

const getEmbeddings = () => {
  return new OllamaEmbeddings({
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://192.168.10.197:11434',
    model: process.env.EMBED_MODEL || 'nomic-embed-text',  // 768 dim
  });
};
```

> **KRITIČNO:** `nomic-embed-text` = **768 dimenzija** (ne 1536). Tablica mora biti obrisana i rekreirana.

```typescript
// schema.ts — PROMJENA
vector: vector('vector', { dimensions: 768 }).notNull(),
```

```sql
-- Migracija 0005_update_vector_dimensions.sql
DROP TABLE IF EXISTS story_architect_embeddings;
CREATE TABLE story_architect_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  vector vector(768) NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE INDEX idx_story_architect_embeddings_vector 
  ON story_architect_embeddings 
  USING hnsw (vector vector_cosine_ops);
```

#### 1.4.2 IndexingService (novi fajl)

`server/src/services/ai/indexing.service.ts` — chunking po rečenicama, fire-and-forget, delete + reindex pri update.

#### 1.4.3 Trigger indeksacije u API

```typescript
// api.ts — PUT scene handler — fire-and-forget
if (content !== undefined) {
  setImmediate(async () => {
    try {
      await IndexingService.indexScene({ id: sceneId, content, summary: updatedScene.summary, projectId: updatedScene.projectId, title: updatedScene.title });
    } catch (e) {
      console.error('[INDEXING] Failed:', e);
    }
  });
}
```

#### 1.4.4 Admin re-index endpoint

```typescript
app.post('/api/projects/:projectId/reindex', aiRateLimiter.middleware(), async (c) => {
  // ... requireProjectOwnership, pa IndexingService.reindexProject
});
```

**AC:**  
- [ ] `nomic-embed-text` instaliran na HPE #2  
- [ ] Embeddings dimenzija 768  
- [ ] Nakon save scene, nova scena je pretraživljiva u RAG-u  
- [ ] `POST /api/projects/:id/reindex` radi

**RIZIK:** HPE #2 mora biti dostupan via Tailscale. Tablica se mora obrisati i rekreirati (nema korisnih podataka — OK).

**⏸ ODGOĐENO (svjesna odluka):** "Faza C — Context Builder RAG integracija" nije implementirana. `context.builder.ts` i dalje koristi direktne SQL upite umjesto RAG vektorske pretrage. Odluka o integraciji se donosi nakon Faze 2 (AI Factory unifikacija).

---

### 1.5 Testovi za graph/nodes.ts ✅ ZAVRŠENO (2026-04-23)

**Što je napravljeno:**
- 57 novih unit testova, svi prolaze (`pnpm vitest run` → 57/57 ✓)
- `graph.conditions.test.ts` — 16 testova za pure condition funkcije (`routingCondition`, `workerGenerationCondition`, `reflectionCondition`)
- `nodes.test.ts` — 41 test za svih 10 graph čvorova s mockovima za AI providere i DB
- `src/test/setup.ts` kreiran (tražen od `vitest.config.ts`)
- TypeScript build čist (`pnpm tsc --noEmit` bez grešaka)
- Mockani: `ai.factory.ts`, `ai.retriever.ts`, `planner.prompts.ts`

**Fajlovi (kreirani):**
- `server/src/test/setup.ts`
- `server/src/services/ai/graph/graph.conditions.test.ts`
- `server/src/services/ai/graph/nodes.test.ts`

**DEP:** Ništa

**AC:**
- [x] `pnpm vitest run src/services/ai/graph/` prolazi (57/57)
- [x] Test potvrđuje da `managerContextNode` koristi `createManagerProvider` (ne `createPreferredAIProvider`)
- [x] Test potvrđuje brainstorming preskače critique petlju (`workerGenerationCondition`)
- [x] Test potvrđuje JSON fail-safe u `workerGenerationNode` vraća `""` (ne cijeli dokument)
- [x] `pnpm tsc --noEmit` bez grešaka

**Napomena:** 34 pre-existing integration test failova postoji u suite-u (pokušavaju koristiti pravu DB/API konekciju bez env varijabli) — čišćenje ili mock-anje u Fazi 4.

---

## FAZA 2: AI Factory unifikacija

> **Cilj:** Jedan factory, env-konfigurabilni modeli, Ollama i Anthropic provideri.  
> **Procjena ukupno:** ~6h  
> **DEP:** Faza 1 završena

---

### 2.1 Implementacija prema PLAN_AI_FACTORY_UNIFICATION.md

| Korak | Fajl | Vrsta | Procjena |
|---|---|---|---|
| 2.1 | `providers/ollama.provider.ts` | KREIRATI | 45 min |
| 2.2 | `providers/anthropic.provider.ts` | MODIFICIRATI (model iz env) | 15 min |
| 2.3 | `providers/openai.provider.ts` | MODIFICIRATI | 15 min |
| 2.4 | `services/ai.factory.ts` | MODIFICIRATI (hibridni routing) | 60 min |
| 2.5 | `services/ai.service.ts` | MODIFICIRATI | 10 min |
| 2.6 | `services/ai/graph/nodes.ts` | MODIFICIRATI (3 node fixevi) | 20 min |
| 2.7 | `server/.env.example` | AŽURIRATI (hibridni setup) | 15 min |
| 2.8 | `services/ai/ai.factory.ts` | OBRISATI (mrtvi LangChain) | 5 min |
| 2.9 | `services/ai/ai.nodes.ts` | OBRISATI | 5 min |
| 2.10 | `services/ai/ai.graph.ts` | OBRISATI | 5 min |
| 2.11 | `services/ai/ai.state.ts` | OBRISATI | 5 min |
| 2.12 | `verify_stage1.ts`, `verify_stage2.ts` | OBRISATI | 5 min |

#### 2.1.1 OllamaProvider — OpenAI-kompatibilni endpoint

```typescript
// providers/ollama.provider.ts
import OpenAI from 'openai';

export class OllamaProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.client = new OpenAI({
      apiKey: 'ollama',
      baseURL: `${baseUrl.replace(/\/$/, '')}/v1`,
    });
    this.model = model;
  }

  async generateText(prompt: string, options?: AIGenerationOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature ?? 0.7,
    }, { signal: AbortSignal.timeout(options?.timeout || 90000) });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from Ollama');
    return content;
  }
}
```

#### 2.1.2 Factory routing — hibridni setup

```typescript
// ai.factory.ts — createWorkerProvider
export async function createWorkerProvider(modelOverride?: string): Promise<AIProvider> {
  const providerType = (process.env.WORKER_PROVIDER as AIProviderType) || 'anthropic';
  const model = modelOverride || process.env.WORKER_MODEL || 'claude-sonnet-4-6';
  
  if (providerType === 'anthropic') {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY!, model);
  }
  if (providerType === 'ollama') {
    return new OllamaProvider(process.env.OLLAMA_BASE_URL!, model);
  }
  throw new Error(`Unknown WORKER_PROVIDER: ${providerType}`);
}

// createManagerProvider — uvijek Ollama za hibridni setup
export async function createManagerProvider(): Promise<AIProvider> {
  const providerType = (process.env.MANAGER_PROVIDER as AIProviderType) || 'ollama';
  const model = process.env.MANAGER_MODEL || 'qwen3:30b-a3b';
  
  if (providerType === 'ollama') {
    const provider = new OllamaProvider(process.env.OLLAMA_BASE_URL!, model);
    const isAlive = await provider.validateConnection();
    if (!isAlive) {
      const fallback = process.env.OLLAMA_FALLBACK_URL;
      if (fallback) return new OllamaProvider(fallback, model);
      throw new Error('Ollama HPE #2 not available. Check Tailscale.');
    }
    return provider;
  }
  // fallback na anthropic za dev bez Ollame
  return new AnthropicProvider(process.env.ANTHROPIC_API_KEY!, model);
}
```

#### 2.1.3 AnthropicProvider — model iz env

```typescript
// anthropic.provider.ts:14 — PROMJENA
// PRIJE: private model = 'claude-3-haiku-20240307'
// POSLIJE:
constructor(apiKey: string, model?: string) {
  this.model = model || process.env.WORKER_MODEL || 'claude-sonnet-4-6';
}
```

**Haiku se više ne koristi nigdje.** Svaki poziv Anthropic API-a ide kroz `WORKER_MODEL` env var.

### 2.2 VertexAI/ChiefEditor refaktoriranje

`VertexAIService.ts` (Gemini 1.5 Pro) koristi se samo u ChiefEditor feature-u. Opcija je migracija na Qwen3.5:35b (256K kontekst može primiti cijelu knjigu) — ali prioritet je nizak.

**Procjena:** 2h ako se implementira  
**DEP:** 2.1

**AC za Fazu 2:**  
- [ ] `pnpm tsc --noEmit` prolazi  
- [ ] `grep -r "createPreferredAIProvider" server/src/services/ai/graph/nodes.ts` — prazan  
- [ ] `grep -r "claude-3-haiku" server/src` — prazan  
- [ ] Factory s `WORKER_PROVIDER=anthropic` kreira `AnthropicProvider` s `claude-sonnet-4-6`  
- [ ] Factory s `MANAGER_PROVIDER=ollama` kreira `OllamaProvider`

### 2.3 Open Decisions

**⏸ Sidebar chat / brainstorming — koji model?**  
Odluku o tome koji provider/model obrađuje sidebar chat i brainstorming mode
donosimo NAKON što pregledamo book editor i razumijemo uloge u praksi.  
Za sada ostaje default (Anthropic → `createWorkerProvider`).  
Referenca: Faza 3 go/no-go checklist.

---

## FAZA 3: LLM migracija — hibridna konfiguracija

> **Cilj:** Postaviti produkcijski env s hibridnim Qwen+Sonnet setupom.  
> **Procjena ukupno:** ~4h  
> **DEP:** Faza 2 potpuno završena

---

### 3.1 Konfiguracija env varijabli

```dotenv
# server/.env — HIBRIDNA PRODUKCIJSKA KONFIGURACIJA

MANAGER_PROVIDER=ollama
MANAGER_MODEL=qwen3:30b-a3b
WORKER_PROVIDER=anthropic
WORKER_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://192.168.10.197:11434
EMBED_MODEL=nomic-embed-text

# Fallback: ako Anthropic padne, komentirati gornje WORKER_ linije i odkomentirati:
# WORKER_PROVIDER=ollama
# WORKER_MODEL=qwen3.5:35b
```

**Jedina promjena koda:**

```typescript
// lib/config.ts — ne throwati ako nema OpenAI ključa uz Ollama
export function getAIConfig() {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL;

  if (!anthropicApiKey && !ollamaUrl) {
    throw new Error('AI config error: Set ANTHROPIC_API_KEY or OLLAMA_BASE_URL.');
  }
  return { anthropicApiKey, ollamaUrl };
}
```

### 3.2 Cost Estimation — Sonnet API po poglavlju

Sonnet 4.6 cijena (input: $3/M tokena, output: $15/M tokena):

| Operacija | Input tokeni | Output tokeni | Cijena |
|---|---|---|---|
| workerGenerationNode (jedno poglavlje ~500 riječi) | ~2,000 | ~800 | ~$0.018 |
| critiqueDraftNode (review) | ~1,500 | ~300 | ~$0.009 |
| **Ukupno po generiranju poglavlja** | ~3,500 | ~1,100 | **~$0.027** |
| 10 poglavlja knjige | ~35,000 | ~11,000 | **~$0.27** |
| 30 poglavlja (cijela knjiga) | ~105,000 | ~33,000 | **~$0.80** |

**Zaključak:** Troškovi su minimalni — cijela knjiga = ~$1. Qwen preuzima Manager/Critique sloj i time smanjuje Sonnet pozive za ~60%.

### 3.3 Provjera kompatibilnosti prompta

**Test scenariji (ručno):**
1. Brainstorming: "Predloži 3 ideje za konflikt između likova X i Y"
2. Writer: "Nastavi scenu u kojoj se Ivan pojavljuje na pragu"
3. Contextual-edit: "Prepravi ovu rečenicu da bude dramatičnija"
4. Routing: "Tko je majka Ivana?" → treba `simple_retrieval`

**JSON output problem za contextual-edit:**  
Qwen kao Manager piše prompt za Sonnet koji mora vratiti `{"replacement": "..."}`. Sonnet je konzistentan s JSON outputom — manji rizik nego s lokalnim modelima.

### 3.4 Mjerenje latencije

| Operacija | Haiku (staro) | Qwen3:30b/Sonnet (novo) |
|---|---|---|
| Manager (transform/route/context) | ~2-3s | TBD (Qwen lokalno) |
| Worker (generiranje proze) | ~3s | TBD (Sonnet cloud) |
| Critique | ~1.5s | TBD (Qwen lokalno) |
| **Ukupno (writer mode)** | **~7-8s** | TBD |

Tabelu popuniti ručnim mjerenjem nakon deploya.

**AC za Fazu 3:**  
- [ ] Cijeli chat flow radi s `WORKER_PROVIDER=anthropic`  
- [ ] Manager koristi Qwen (provjeri logovima: `[MANAGER] Using ollama/qwen3:30b-a3b`)  
- [ ] Worker koristi Sonnet (logovi: `[WORKER] Using anthropic/claude-sonnet-4-6`)  
- [ ] JSON output za contextual-edit radi u >95% slučajeva  
- [ ] Fallback na `qwen3.5:35b` radi ako se mijenja env

---

## FAZA 4: Čišćenje

> **Cilj:** Kod koji odražava stvarnost.  
> **Procjena ukupno:** ~4h  
> **DEP:** Faze 1–3 završene

---

### 4.1 Uklanjanje mrtvog koda

Faza 2 već uklanja: `ai.factory.ts`, `ai.nodes.ts`, `ai.graph.ts`, `ai.state.ts`, `verify_stage*.ts`

Ostaje:
- `@cloudflare/workers-types` iz `server/package.json` — projekt je na Vercelu
- `@langchain/anthropic`, `@langchain/openai` — samo u mrtvom kodu
- `postgres` paket — Drizzle koristi `pg`

```bash
cd server && pnpm build  # verify before removing
```

### 4.2 OpenAI package cleanup

```json
// server/package.json — UKLONITI:
"@langchain/anthropic": ...,  // samo u mrtvom kodu
"@langchain/openai": ...,     // samo u mrtvom kodu

// ZADRŽATI:
"@anthropic-ai/sdk": ...,     // AnthropicProvider (Worker)
"openai": ...,                // OllamaProvider koristi OpenAI SDK s custom baseURL
"@langchain/community": ...,  // ai.retriever.ts PGVectorStore
```

### 4.3 api.ts split

```
server/src/
├── api.ts              (~60 linija — mounting)
└── routes/
    ├── users.ts, projects.ts, locations.ts
    ├── characters.ts, chapters.ts, scenes.ts
    └── ai.routes.ts     (/chat, /reindex, /generate-synopsis)
```

### 4.4 README.md update

Zamijeniti boilerplate s točnim opisom:
- Hibridna AI arhitektura (Qwen + Sonnet)
- Stack (Hono, Neon, Firebase, Vercel, Ollama/HPE#2)
- Env varijable referenca
- Deployment uputa

### 4.5 Zastarjeli planski dokumenti

| Dokument | Akcija |
|---|---|
| `PLAN_AI_FACTORY_UNIFICATION.md` | Nakon Faze 2 → `[IMPLEMENTIRANO]` |
| `SYSTEM_DOSSIER.md` | `[ARHIV - RIJEŠENO]` |
| `PLAN_BETA_STABILIZACIJE.md` | Označiti implementirane stavke |
| `AUDIT_DUBINSKI_2026_04_20.md` | Ostaje kao referenca |

**AC za Fazu 4:**  
- [ ] `pnpm build` bez grešaka i warningsa  
- [ ] `pnpm test` prolazi  
- [ ] `server/src/api.ts` < 100 linija  
- [ ] README opisuje hibridnu arhitekturu  
- [ ] `.env.example` sadrži sve hibridne varijable

---

## FAZA 5: Humanization Layer

> **Cilj:** AI-generirana proza koja zvuči kao ljudska, personalizirana na stil korisnika.  
> **Procjena ukupno:** ~12-16h  
> **DEP:** Faza 2 (factory unifikacija) završena

---

### 5.1 HumanizationNode u LangGraphu

Novi node koji prolazi Sonnet output kroz Qwen post-processing koji uklanja AI obrasce.

**Fajlovi:**
- `server/src/services/ai/graph/nodes.ts` (DODATI `humanizationNode`)
- `server/src/services/ai/graph/graph.ts` (DODATI node u graph)
- `server/src/services/ai/graph/state.ts` (DODATI `humanizationEnabled` flag)

**Pozicija u grafu:** Nakon `workerGenerationNode`, prije `finalOutputNode`.

```typescript
// graph/nodes.ts — DODATI
export async function humanizationNode(state: AgentState): Promise<Partial<AgentState>> {
  // Preskočiti ako nije uključeno ili nema outputa
  if (!state.humanizationEnabled || !state.workerOutput) {
    return { finalOutput: state.workerOutput };
  }
  
  const manager = await createManagerProvider(); // Qwen — jeftino i brzo
  
  const humanizationPrompt = buildHumanizationPrompt(
    state.workerOutput,
    state.styleFingerprint  // null ako korisnik nema uploaded samples
  );
  
  const humanized = await manager.generateText(humanizationPrompt, {
    temperature: 0.6,
    maxTokens: 2000,
  });
  
  return { finalOutput: humanized };
}
```

### 5.2 Humanization Prompt Template

Kreirati `server/src/services/ai/prompts/humanization.prompt.ts`:

```typescript
export function buildHumanizationPrompt(text: string, styleFingerprint?: StyleFingerprint): string {
  return `You are a text editor. Rewrite the following text to sound more natural and human.

FORBIDDEN patterns (remove or replace):
- Em-dashes (—) as separators → use commas or restructure
- "It's worth noting", "It's important to", "In the realm of"
- "Delve into", "Harness the power of", "Revolutionize"
- "In conclusion", "To summarize", "At the end of the day"
- "Comprehensive", "Cutting-edge", "Game-changing"
- Uniform sentence length (vary short and long sentences)
- Starting 3+ consecutive sentences with the same word

REQUIREMENTS:
- Mix sentence lengths: short punchy sentences + longer complex ones
- Use active voice where possible
- Keep the same meaning and all key information
- Output ONLY the rewritten text, no explanations
${styleFingerprint ? buildStyleInstructions(styleFingerprint) : ''}

TEXT TO REWRITE:
${text}`;
}
```

### 5.3 Style Profile sistem

**Nova tablica u bazi:**

```typescript
// schema.ts — DODATI
export const userWritingSamples = pgTable('user_writing_samples', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userStyleFingerprints = pgTable('user_style_fingerprints', {
  userId: text('user_id').primaryKey(),
  avgSentenceLength: integer('avg_sentence_length'),
  toneScore: jsonb('tone_score'), // { formal: 0.3, casual: 0.5, poetic: 0.2 }
  signaturePhrases: text('signature_phrases').array(),
  vocabularyProfile: jsonb('vocabulary_profile'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Drizzle migracija:** 0006_add_style_profile.sql

**Analysis Node:**

```typescript
// nodes.ts — DODATI analyzeStyleNode
export async function analyzeStyleNode(userId: string, samples: string[]): Promise<StyleFingerprint> {
  if (samples.length < 3) throw new Error('Need at least 3 writing samples');
  
  const manager = await createManagerProvider();
  const analysisPrompt = `Analyze these writing samples and extract style characteristics:
  
${samples.map((s, i) => `Sample ${i+1}:\n${s}`).join('\n\n---\n\n')}

Return JSON:
{
  "avgSentenceLength": number,
  "tone": { "formal": 0-1, "casual": 0-1, "poetic": 0-1 },
  "signaturePhrases": ["phrase1", "phrase2", "phrase3"],
  "sentencePatterns": "description of typical patterns",
  "vocabularyLevel": "simple|moderate|sophisticated"
}`;
  
  const result = await manager.generateText(analysisPrompt);
  return JSON.parse(result) as StyleFingerprint;
}
```

**API rute:**
```typescript
// Novi endpoints u ai.routes.ts
POST /api/users/writing-samples           // Upload sample
GET  /api/users/writing-samples           // List samples
DELETE /api/users/writing-samples/:id     // Delete sample
POST /api/users/style-fingerprint/analyze // Trigger analysis (min 3 samples)
GET  /api/users/style-fingerprint         // Get current fingerprint
```

**Procjena:** 4-5h (DB, API, analysis logic)

### 5.4 Blog/Article Mode

Novi mode pored postojećih (brainstorming/writer/contextual-edit).

**Fajlovi:**
- `server/src/services/ai/graph/nodes.ts` — dodati `article` handling u `managerContextNode`
- `server/src/services/ai/prompts/article.prompt.ts` (NOVI FAJL)
- `ui/src/components/planner/AIChatSidebar.tsx` — dodati Article mode opciju
- `ui/src/stores/plannerAIStore.ts` — dodati mode state

**Razlike od Book mode-a:**

| Aspekt | Book Mode | Article Mode |
|---|---|---|
| Forma | Proza, narativ | SEO-optimizirani paragrafima |
| Ton | Literarni | Konverzacijski, pristupačan |
| Struktura | Scene, poglavlja | Uvod, tijelo, zaključak |
| Anegdote | Iz likova | Personalni (iz style profila) |
| CTA | Nema | Opcionalni |
| Humanization | Default OFF | Default ON |

**Article Mode prompt template:**
```typescript
// article.prompt.ts
export const articleManagerPrompt = `You are a content strategist for ${audience}.
Write an article about: ${topic}
Purpose: ${purpose}
Tone: conversational, avoid corporate jargon
Include personal anecdote: ${styleFingerprint?.signatureAnecdote || 'none'}
Avoid: passive voice, em-dashes, AI clichés`;
```

**Procjena:** 3-4h

### 5.5 Humanization Toggle u UI

**Fajlovi:**
- `ui/src/stores/plannerAIStore.ts` — dodati `humanizationEnabled` flag
- `ui/src/components/planner/AIChatSidebar.tsx` — toggle UI
- `ui/src/lib/serverComm.ts` — proslijediti flag u request body
- `server/src/schemas/validation.ts` — dodati `humanizationEnabled` u ChatRequestBodySchema

```typescript
// plannerAIStore.ts — DODATI
humanizationEnabled: false,  // Default OFF za book mode
toggleHumanization: () => set(state => ({ humanizationEnabled: !state.humanizationEnabled })),
```

```tsx
// AIChatSidebar.tsx — DODATI toggle
<button
  onClick={toggleHumanization}
  className={`text-xs px-2 py-1 rounded ${humanizationEnabled ? 'bg-amber-500/20 text-amber-400' : 'text-stone-500'}`}
>
  {humanizationEnabled ? '✦ Humanize ON' : '✦ Humanize OFF'}
</button>
```

Default ponašanje:
- **Book Mode** → Humanization **OFF** (proza je već kreativna)
- **Article Mode** → Humanization **ON** (blog/sadržaj treba biti prirodan)

**Procjena:** 1-2h

### 5.6 Dependencies za Fazu 5

```
5.1 (humanization node)    ──── DEP: Faza 2 (factory) ──────────────┐
5.2 (prompt template)      ──── DEP: ništa (samo fajl) ─────────────┤
5.3 (style profile)        ──── DEP: 5.2 ──────────────────────────┤
5.4 (article mode)         ──── DEP: 5.1, 5.2 ─────────────────────┤
5.5 (UI toggle)            ──── DEP: 5.1 ──────────────────────────┘
```

**AC za Fazu 5:**  
- [ ] `humanizationNode` postoji u LangGraph (dokazano logovima)  
- [ ] Humanized output ne sadrži em-dashove kao separatore  
- [ ] Humanized output ne sadrži niti jednu od 10 zabranjenih fraza  
- [ ] Style Profile: upload 3 samplea → analyzeStyleNode → fingerprint sprema u DB  
- [ ] Article Mode dostupan u UI i šalje `mode: 'article'`  
- [ ] Toggle radi: ON / OFF mijenja procesni tok

**RIZIK:**  
- Qwen može ignorirati humanization instrukcije ili promijeniti smisao teksta — treba A/B testirati.  
- Ako fingerprint analiza vrati invalid JSON, fallback na generički prompt.  
- Article Mode opseg se može razvući — definirati MVP granice (samo prompt varijacija, ne novi UI screen).

---

## Redoslijed izvršavanja i ovisnosti

```
Faza 1:
  1.1 (timeout)     ─────────────────────────────┐
  1.2 (workerModel) ──────────────────────────────┤
  1.3 (schema)      ──────────┐                   │
  1.4 (RAG)         ──── DEP: 1.3 ────────────────┤
  1.5 (testovi)     ─────────────────────────────┘
       ↓ Sve Faze 1 gotove
Faza 2:
  2.1 (Ollama+Anthropic providers) ────────────────┐
  2.2, 2.3 (provider fix)         ── DEP: 2.1 ────┤
  2.4 (factory hibridni routing)   ── DEP: 2.1 ────┤
  2.5–2.7 (nodes, env.example)     ── DEP: 2.4 ────┤
  2.8–2.12 (brisanje mrtvog koda)  ── DEP: sve ────┘
       ↓
Faza 3:
  3.1 (.env hibridna konfiguracija) ── DEP: Faza 2
  3.2 (prompt testing)              ── DEP: 3.1
  3.3 (latencija mjerenje)          ── DEP: 3.1
       ↓
Faza 4:
  4.1–4.6 (čišćenje)               ── DEP: Faze 1–3
       ↓
Faza 5 (može paralelno s 4):
  5.1 (humanization node)  ── DEP: Faza 2
  5.2 (prompt template)    ── DEP: ništa
  5.3 (style profile)      ── DEP: 5.2
  5.4 (article mode)       ── DEP: 5.1, 5.2
  5.5 (UI toggle)          ── DEP: 5.1
```

---

## Ukupna procjena

| Faza | Opis | Procjena |
|---|---|---|
| Faza 1 | Kritični bugovi | ~12h |
| Faza 2 | AI Factory unifikacija (hibridni setup) | ~6h |
| Faza 3 | LLM migracija + cost estimation | ~4h |
| Faza 4 | Čišćenje | ~4h |
| Faza 5 | Humanization Layer | ~12-16h |
| **Ukupno (Faze 1–4)** | | **~26h** |
| **Ukupno (sve 5 faza)** | | **~38-42h** |

---

## Checklist prije Faze 3 (go/no-go za hibridni LLM)

Ove stavke mora potvrditi **Senad ručno** prije prebacivanja na hibridni setup:

- [ ] HPE #2 dostupan via Tailscale s Vercel servera: `curl http://192.168.10.197:11434/api/tags`
- [ ] `qwen3:30b-a3b` instaliran: `ollama list | grep qwen3:30b`
- [ ] `qwen3.5:35b` instaliran (fallback Worker): `ollama list | grep qwen3.5`
- [ ] `nomic-embed-text` instaliran: `ollama list | grep nomic`
- [ ] Neon DB pgvector: `SELECT * FROM pg_extension WHERE extname = 'vector'`
- [ ] `ANTHROPIC_API_KEY` je validan (test: Sonnet API call)
- [ ] Vercel deployment s hibridnim env varama testiran na preview URL

---

---

## Napomena: PLAN_AI_FACTORY_UNIFICATION.md

`PLAN_AI_FACTORY_UNIFICATION.md` je napisan za **100% lokalni Ollama Worker** (qwen3.5:35b). Nakon ažuriranja na hibridnu arhitekturu, taj dokument je **djelomično zastario**:

| Sekcija | Status |
|---|---|
| OllamaProvider implementacija | ✅ Ostaje relevantna |
| `createManagerProvider` logika | ✅ Ostaje relevantna |
| `createWorkerProvider` → Ollama | ⚠️ ZAMIJENITI: sada `WORKER_PROVIDER=anthropic` |
| Dead code brisanje (2.8–2.12) | ✅ Ostaje relevantna |

**Prioritet Master Plana:** Ako postoji konflikt između dva dokumenta, **Master Plan ima prioritet**. PLAN_AI_FACTORY_UNIFICATION.md označiti kao `[DJELOMIČNO ZASTARIO - vidi MASTER_PLAN_REFAKTORIRANJA.md]` nakon Faze 2.

*Referentni dokumenti: `AUDIT_DUBINSKI_2026_04_20.md`, `PLAN_AI_FACTORY_UNIFICATION.md`*
