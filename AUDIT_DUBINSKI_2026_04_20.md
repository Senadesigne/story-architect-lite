# Dubinski Arhitekturalni Audit — Story Architect Lite
**Datum:** 2026-04-20  
**Verzija koda:** main grana, commit bb63411  
**Napomena:** Samo analiza i dokumentacija. Nema promjena koda.

---

## Legenda ocjena
- ✅ **OK** — Nema akcije potrebne
- ⚠️ **TREBA POBOLJŠATI** — Tehički dug, planirati
- 🔴 **KRITIČNO** — Blokira napredak ili uzrokuje skrivene bugove

---

## 1. CORE ARHITEKTURA

### 1.1. Je li LangGraph Manager-Worker pattern potreban?

**Nalaz:**  
LangGraph se koristi kao state machine za orkestraciju sekvencijalnih AI poziva. Trenutni "happy path" za brainstorming i writer mod:
```
START → transform_query → retrieve_context → route_task → manager_context_node 
      → worker_generation_node → (brainstorming: final_output | writer: critique_draft)
      → [refine_draft ↔ critique_draft × 3] → final_output → END
```
Za brainstorming poruku od 10 riječi, sustav prolazi kroz **5–7 AI poziva** (transform + retrieve + route + manager + worker) plus potencijalno 3 critique/refine iteracije = **do 10 API poziva**.

**Dokaz:**  
- `graph/graph.ts:98–173` — definicija grafa
- `graph/nodes.ts:49–147` — transform i route su zasebni AI pozivi
- Brainstorming i writer mod direktno idu na `creative_generation` (zaobilaze route klasifikaciju), ali NE zaobilaze transform i retrieve

**Procjena za use-case:**  
Za kreativno pisanje (single-user, interaktivno), ovaj pattern je **over-engineered u trenutnoj implementaciji**:
- `transformQueryNode` transformira upit za RAG, ali RAG vektorska baza nije napunjena sadržajem (vidi sekciju 4)
- `routeTaskNode` radi AI klasifikaciju, ali brainstorming/writer/contextual-edit mod zaobilazi klasifikaciju direktnim routingom
- Critique petlja dodaje 30–60+ sekundi latencije bez vidljivog poboljšanja za brainstorming

LangGraph **bi bio opravdan** ako se koristi:
- S lokalnim LLM-om (Manager jeftin → latencija manja)
- Kada RAG baza bude napunjena sadržajem knjige

**Ocjena:** ⚠️ TREBA POBOLJŠATI  
**Preporuka:** Za produkciju s cloud API-em, razmotriti "fast path" koji preskače transform+retrieve za writer i brainstorming modove. LangGraph arhitekturu zadržati kao okvir za budući lokalni LLM.

---

### 1.2. Ima li nodes.ts previše odgovornosti?

**Nalaz:**  
`server/src/services/ai/graph/nodes.ts` (544 linije) sadrži 10 eksportiranih funkcija:

| Funkcija | Odgovornost |
|---|---|
| `retrieveContextNode` | RAG retrieval |
| `transformQueryNode` | Query transformation |
| `routeTaskNode` | AI routing classifier |
| `handleSimpleRetrievalNode` | Simple QA |
| `managerContextNode` | Prompt orchestration (3 moda) |
| `workerGenerationNode` | Text generation + JSON parsing |
| `critiqueDraftNode` | AI critique |
| `refineDraftNode` | AI refinement |
| `modifyTextNode` | Text modification |
| `finalOutputNode` | Output packaging |

`managerContextNode` (linije 191–346) sama sadrži 3 potpuno različite logike za brainstorming, writer i contextual-edit — uvjetovano `if/else if` blokom.

**Dokaz:**  
- `nodes.ts:191–346` — managerContextNode s 3 moda u jednoj funkciji (155 linija)
- `nodes.ts:351–397` — workerGenerationNode uključuje JSON parsing logiku koja ne pripada generiranju

**Ocjena:** ⚠️ TREBA POBOLJŠATI  
**Preporuka:** Podijeliti u `rag.nodes.ts`, `manager.nodes.ts`, `worker.nodes.ts`. Izvući JSON parsing iz worker noda u helper.

---

### 1.3. Je li podjela `services/ai/` vs `services/` logična?

**Nalaz:**  
Postoje 4 odvojena AI "sloja":

```
server/src/services/
├── ai.factory.ts          ← Stari factory (AIProvider interfejs) — AKTIVAN
├── ai.service.ts          ← Re-exports starog factoryja
├── ai.errors.ts           ← Error klase
├── providers/
│   ├── anthropic.provider.ts  ← Implementacija za AIProvider
│   └── openai.provider.ts     ← Implementacija za AIProvider
└── ai/
    ├── ai.factory.ts          ← Novi LangChain factory — MRTAV
    ├── ai.nodes.ts            ← Stari LangChain nodes — MRTAV
    ├── ai.graph.ts            ← Stari LangChain graph — MRTAV
    ├── ai.retriever.ts        ← PGVector retrieval — AKTIVAN
    ├── ai.state.ts            ← State definicija — ??
    ├── VertexAIService.ts     ← Gemini/Vertex — AKTIVAN (ali odvojen)
    ├── planner.prompts.ts     ← Prompt templates — AKTIVAN
    └── graph/
        ├── graph.ts           ← LangGraph graf — AKTIVAN
        ├── nodes.ts           ← Čvorovi — AKTIVAN
        └── state.ts           ← AgentState — AKTIVAN
```

`ai/ai.state.ts` definira `AgentState` za stari LangChain sustav. Postoji paralelna `graph/state.ts` koja definira novi `AgentState`. Nije jasno koristi li se `ai/ai.state.ts` negdje.

**Dokaz:**  
- `ai/ai.state.ts` — posebna datoteka s `AgentState` interfejsom
- `graph/state.ts` — drugi `AgentState` interfejs  
- `grep "ai.state" server/src` — samo `ai.nodes.ts` (mrtvi kod) importa `ai.state.ts`

**Ocjena:** ⚠️ TREBA POBOLJŠATI

---

## 2. DUPLIKACIJA I MRTVI KOD

### 2.1. Duplikati

| Duplikat | Lokacija 1 | Lokacija 2 | Problem |
|---|---|---|---|
| AI Factory | `services/ai.factory.ts` | `services/ai/ai.factory.ts` | Različiti interfejsi, obje eksportiraju `createManagerProvider` |
| AgentState | `services/ai/ai.state.ts` | `services/ai/graph/state.ts` | Dva odvojena tipa s istim imenom |
| `retryWithBackoff` | `server/src/utils/retry.ts` | `ui/src/stores/studioStore.ts:7–38` | Ista logika copy-pasteana u frontend |
| AI pozivanje | `api.ts:105` + `api.ts:953` | `graph/nodes.ts:*` | Dva odvojena načina pozivanja AI (direktni `createDefaultAIProvider` + LangGraph) |

### 2.2. Mrtvi kod

| Fajl | Dokaz da nije u upotrebi |
|---|---|
| `services/ai/ai.factory.ts` | Importan samo iz `ai.nodes.ts` i `ai.graph.ts` (koji su i sami mrtvi) |
| `services/ai/ai.nodes.ts` | Importan samo iz `ai.graph.ts` |
| `services/ai/ai.graph.ts` | Nema importa u produkcijskom kodu (samo README.md referenca) |
| `services/ai/ai.state.ts` | Importan samo iz `ai.nodes.ts` (mrtav) |
| `server/src/verify_stage1.ts` | Verificacijska skripta, nije importana nigdje |
| `server/src/verify_stage2.ts` | Verificacijska skripta, nije importana nigdje |

**Ukupno mrtvih fajlova: 6**  
**Ukupno linija mrtvog koda: ~730** (ai.factory 41 + ai.nodes 273 + ai.graph 238 + ai.state 90 + verify × 2)

### 2.3. Nekorištene dependencije

**Dokaz (server/package.json):**

| Paket | Razlog | Status |
|---|---|---|
| `@langchain/anthropic` | Jedini import u `ai/ai.factory.ts` (mrtav) | ❌ Nekorišten u produkciji |
| `@langchain/openai` | Jedini import u `ai/ai.factory.ts` (mrtav) + `ai.retriever.ts` (embeddings) | ⚠️ Djelomično (samo za embeddings) |
| `@google-cloud/vertexai` | Koristi se u `VertexAIService.ts` | ✅ Korišten |
| `postgres` | Drizzle koristi `pg`, ne `postgres` | ❌ Vjerojatno nekorišten |
| `langchain` (core) | `@langchain/core` je zasebna dependencija | ⚠️ Provjeriti |
| `@cloudflare/workers-types` | devDep, ali projekt je na Vercelu | ❌ Nekorišten |

**Ocjena:** ⚠️ TREBA POBOLJŠATI  
**Procijenjeno uklanjanje:** ~3 paketa, redukcija bundle-a za ~30 MB

---

## 3. FRONTEND ↔ BACKEND KOMUNIKACIJA

### 3.1. Kako frontend poziva AI?

**Nalaz:**  
Čisti **request/response** pattern bez streaminga.

```typescript
// serverComm.ts:287–308
export async function chat(projectId, data) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/chat`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json(); // ← Čeka cijeli odgovor
}
```

Timeout na frontendu je **30 sekundi** (`AbortSignal.timeout(30000)` u `serverComm.ts:41`).  
Timeout na Vercelu je **60 sekundi** (`vercel.json:13: "maxDuration": 60`).

**Problem:** LangGraph s critique petljom može trajati 45–90 sekundi. Frontend timeout od 30s će prekinuti zahtjev przed odgovor stigne.

**Dokaz:**  
- `ui/src/lib/serverComm.ts:41` — `AbortSignal.timeout(30000)`
- `vercel.json:13` — `"maxDuration": 60`
- `graph/nodes.ts:197` — managerContextNode timeout `30000`
- `graph/nodes.ts:358` — workerGenerationNode timeout `45000`

30 + 45 = 75 sekundi samo za manager+worker. Frontend ubija konekciju na 30s.

### 3.2. Postoji li streaming?

**Nalaz:** **NE.** Nema SSE, nema WebSocket, nema `text/event-stream` headera nigdje u kodu.

**Ocjena:** 🔴 KRITIČNO  
**Razlog:** Frontend timeout (30s) < Mogući backend execution time (75s+). Korisnik vidi timeout error za dugačke generacije, ali backend možda još radi.

**Preporuka:**  
1. Kratkoročno: Povećati frontend timeout na 90s, ili
2. Dugoročno: Implementirati SSE streaming (Hono ima `streamText` helper)

### 3.3. `workerModel` frontend šalje, backend ignorira

**Nalaz:**  
Frontend šalje `workerModel: freshState.workerModel` (`plannerAIStore.ts:349`), ali `ChatRequestBodySchema` (`validation.ts:129–142`) **nema `workerModel` polje**. Zod ga šuti odbacuje. Backend nikad ne koristi odabir modela od korisnika.

**Dokaz:**  
- `validation.ts:129–142` — nema `workerModel` u shemi
- `plannerAIStore.ts:92` — `workerModel: 'claude-3-5-sonnet-20240620'` je default u storeu
- `api.ts:986` — destructuring nema `workerModel`

**Ocjena:** 🔴 KRITIČNO (silent bug)

---

## 4. CONTEXT I RAG

### 4.1. Kako RAG trenutno radi?

**Nalaz:**  
RAG koristi **pgvector** ekstenziju u Neon Postgres bazi s **OpenAI `text-embedding-3-small` modelom** (1536 dimenzija).

```
ai.retriever.ts → PGVectorStore (LangChain) → pg Pool → Neon DB
```

**Kritičan problem:** Vektorska baza vjerojatno **nije napunjena sadržajem**. Postoji `db:populate` skripta (`scripts/populate-embeddings.ts`) ali:
- Nema koda koji automatski upisuje novu scenu/lik/lokaciju u embeddings tablicu
- `addDocumentsToVectorStore` postoji ali nema callera u produkcijskom kodu
- `retrieveContextNode` gracefully degradira ("Nema pronađenog relevantnog konteksta") bez da upozori korisnika

**Dokaz:**  
- `ai.retriever.ts:151–160` — `addDocumentsToVectorStore` nije pozivana nigdje u produkcijskom kodu
- `api.ts` — nema poziva `addDocumentsToVectorStore` pri `POST /scenes` ili `PUT /scenes`

### 4.2. OpenAI Embeddings uvjet

**Nalaz:**  
RAG **uvijek zahtijeva `OPENAI_API_KEY`** čak i ako se koristi `ANTHROPIC` ili `ollama` za generiranje:

```typescript
// ai.retriever.ts:63–68
const getEmbeddings = (): OpenAIEmbeddings => {
  return new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-3-small"
  });
};
```

Za lokalni LLM scenarij (Ollama bez cloud API-a), RAG će failati.

**Ocjena:** 🔴 KRITIČNO za lokalni LLM plan

**Preporuka:** Dodati Ollama embeddings provider (Ollama podržava lokalne embedding modele).

### 4.3. Chunk strategija

**Nalaz:**  
Nema implementirane chunk strategije. Tablica `story_architect_embeddings` prima `content: text` i `metadata: jsonb`. Chunking logika mora biti u `populate-embeddings.ts` skripti (nije pregledana u ovom auditu), ali **nema automatskog re-chunkinga** kada se sadržaj ažurira.

Za kontekst duge knjige (256K token window Qwena): pgvector s HNSW indeksom može pohraniti tisuće vektora, ali bez pipeline za ažuriranje embeddinga pri svakom saves scene-a, RAG baza je statična.

**Ocjena:** ⚠️ TREBA POBOLJŠATI

---

## 5. LLM INTEGRACIJA — ŠIRA SLIKA

### 5.1. Anthropic-specifične pretpostavke u kodu

**Nalaz:**

**Bug 1 — System prompt se šalje kao user message:**  
```typescript
// anthropic.provider.ts:87–93
await this.client.messages.create({
  model: this.model,
  messages: [{ role: 'user', content: prompt }], // ← SVE kao user
  max_tokens: ...,
});
```
`generateText(systemPrompt, options)` prima cijeli prompt (koji je zapravo system prompt) kao **user message**. Anthropic-ova API dokumentacija razlikuje `system` od `messages`. Ovo radi, ali je suboptimalno jer model ne dobiva sistemski kontekst na ispravan način.

**Dokaz:**  
- `anthropic.provider.ts:87–93`
- Isto vrijedi za `openai.provider.ts:81–87` — sve kao `role: 'user'`

**Bug 2 — Model je zastarjeli Haiku:**  
`claude-3-haiku-20240307` je stariji model. Trenutna ekvivalentna verzija je `claude-3-haiku-20241022` ili `claude-3-5-haiku-20241022`.

**Dokaz:**  
- `anthropic.provider.ts:14`

### 5.2. Kompatibilnost prompta s Qwen modelima

**Nalaz:**  
Dobra vijest — svi promptovi u `nodes.ts` i `planner.prompts.ts` koriste **plain tekst bez XML tagova, bez `<thinking>`, bez Anthropic-specifičnih formata**. Primjeri:
```
"Ti si AI Mentor, ekspert za RAG pretraživanje..."
"Ti si Manager Brainstorming sesije..."
"Ti si Urednik (Manager) knjige..."
```

Promptovi su na **hrvatskom jeziku**. Qwen3 modeli imaju odličnu podršku za višejezične promptove, ali treba testirati kvalitetu odgovora na hrvatskom.

**JSON output constraint** (`nodes.ts:269–314`) je "agresivan" — traži striktni JSON `{"replacement": "..."}`. Lokalni modeli (Llama, Qwen) su manje pouzdani za striktni JSON output bez tool-callinga.

**Dokaz:**  
- `nodes.ts:295–300` — JSON output constraint prompt
- `nodes.ts:368–384` — JSON fallback vraća prazan string ako parse faili

**Ocjena:** ⚠️ TREBA POBOLJŠATI  
**Preporuka:** Za contextual-edit JSON output, razmotriti structured output ili stricter regex extraction umjesto catch-all fallback.

### 5.3. Streaming

Nema streaminga nigdje. Vidi sekciju 3.2.

---

## 6. TESTOVI I KVALITETA

### 6.1. Pregled test fajlova

| Fajl | Tip | Što testira |
|---|---|---|
| `__tests__/api.integration.test.ts` | Integration | HTTP rute (CRUD), 450 linija |
| `__tests__/ai.integration.test.ts` | Integration | AI rute s mock providerom, 348 linija |
| `__tests__/rag.integration.test.ts` | Integration | RAG endpoint s mock retrieverom |
| `services/__tests__/ai.service.test.ts` | Unit | `AnthropicProvider` klasa |
| `services/__tests__/ai.errors.test.ts` | Unit | Error mapping logika |
| `services/__tests__/context.builder.test.ts` | Unit | `ContextBuilder` |
| `services/__tests__/prompt.service.test.ts` | Unit | `PromptService` |
| `middleware/__tests__/validation.test.ts` | Unit | Zod validation schemas |
| `middleware/__tests__/errorHandler.test.ts` | Unit | Error handler middleware |

### 6.2. Što NIJE pokriveno testovima

- **`graph/nodes.ts`** — NULA testova. 10 funkcija, 544 linije, 0% coverage.
- **`graph/graph.ts`** — NULA testova. LangGraph workflow.
- **`ai.retriever.ts`** — Samo mock test, ne testira stvarni pgvector.
- **`plannerAIStore.ts`** — Nema frontend testova.
- Session management logic

### 6.3. Kvaliteta testova

AI integration testovi (`ai.integration.test.ts`) mockiraju cijeli `ai.service` modul:
```typescript
vi.mock('../services/ai.service', () => ({ AnthropicProvider: ... }))
```
Ovo testira da HTTP ruta postoji, ali NE testira LangGraph workflow. Testovi prolaze čak i ako je graph kompletno broken.

**Ocjena:** 🔴 KRITIČNO  
**Razlog:** Kritična AI logika (Manager-Worker flow, routing, critique petlja) nema ni jednog testa.

---

## 7. DEPLOYMENT I ENV

### 7.1. Env organizacija

**Stvarne varijable u `server/.env` (zamaskirane):**
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
OPENAI_API_KEY
DATABASE_URL
ANTHROPIC_API_KEY
GOOGLE_SERVICE_ACCOUNT_JSON  ← NIJE u .env.example!
```

**Varijable u `server/.env.example` koje nisu u `.env`:**
```
PORT=8787
NODE_ENV=development
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
AI_PROVIDER=anthropic          ← Koristi se u config.ts?
AI_DEFAULT_TIMEOUT=30000        ← Koristi se
AI_MAX_RETRIES=3                ← Koristi se
MANAGER_AI_PROVIDER             ← Nova, nije u .env
WORKER_AI_PROVIDER              ← Nova, nije u .env
```

### 7.2. `AI_PROVIDER` varijabla nije u upotrebi

`server/.env.example` definira `AI_PROVIDER=anthropic`, ali `server/src/lib/config.ts` NE čita tu varijablu — direktno čita `ANTHROPIC_API_KEY` i `OPENAI_API_KEY`. `AI_PROVIDER` je slijepa varijabla.

**Dokaz:**  
- `config.ts:1–17` — samo `ANTHROPIC_API_KEY` i `OPENAI_API_KEY`
- `.env.example:17` — `AI_PROVIDER=anthropic`

### 7.3. `GOOGLE_SERVICE_ACCOUNT_JSON` nije dokumentiran

Postoji u `.env` ali ne u `.env.example`. VertexAIService ga koristi ali nema fail-fast provjere.

**Ocjena:** ⚠️ TREBA POBOLJŠATI

### 7.4. Vercel konfiguracija

**Nalaz:**  
`vercel.json` koristi custom bridge handler (`api/bridge.ts`) koji ručno prevodi Node.js IncomingMessage u Web Request (jer Hono ne radi s Vercel's Node 22 runtime direktno).

`maxDuration: 60` sekundi za funkciju. AI workflow može trajati dulje (vidi sekciju 3.1).

```json
"functions": {
  "api/bridge.ts": {
    "maxDuration": 60
  }
}
```

**Dokaz:** `vercel.json:12–14`

**Ocjena:** ⚠️ TREBA POBOLJŠATI  
**Preporuka:** Povećati `maxDuration` na 300s (Vercel Pro plan to dopušta) ili implementirati streaming.

---

## 8. DATABASE SCHEMA

### 8.1. Konzistentnost sheme s kodom

**KRITIČAN NALAZ — Scene tekst se sprema u `summary` polje:**

```typescript
// studioStore.ts:344–347
return await api.updateScene(state.activeSceneId!, {
  summary: contentToSave  // ← CIJELI HTML tekst scene ide u 'summary'!
});
```

`scenes` tablica nema `content` kolonu:
```typescript
// schema.ts:114–131
export const scenes = pgTable('scenes', {
  id, title, summary, order, projectId, locationId, chapterId
  // Nema 'content' kolone!
});
```

Semantički je neispravno koristiti `summary` (kratki opis) za punu HTML sadržaj scene. Može uzrokovati probleme ako `summary` bude korišten za prave summary-e.

**Dokaz:**  
- `schema.ts:114–131` — nema `content` kolone
- `studioStore.ts:345` — `summary: contentToSave`

**Ocjena:** 🔴 KRITIČNO  

### 8.2. `editorAnalyses` tablica ima hardkodirani `gemini-1.5-pro`

```typescript
// schema.ts:245
model: text('model').default('gemini-1.5-pro'),
```

**Dokaz:** `schema.ts:245`

### 8.3. Migracije

| Fajl | U journalu | Status |
|---|---|---|
| `0000_moaning_sphinx.sql` | ✅ idx:0 | Primijenjena |
| `0001_sync_schema.sql` | ✅ idx:1 | Primijenjena |
| `0002_lying_dreadnoughts.sql` | ✅ idx:2 | Primijenjena (samo `DROP COLUMN logline`) |
| `0003_add_extensions.sql` | ❌ NIJE u journalu | **Nikad primijenjena!** |

`0003_add_extensions.sql` sadrži:
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

Neon Postgres vjerojatno ima `vector` ekstenziju preinstaliranu, ali `pgcrypto` možda nije. `ai.retriever.ts` koristi `CREATE EXTENSION IF NOT EXISTS vector` u runtime-u (self-healing), pa ovo nije kritično.

**Ocjena:** ⚠️ TREBA POBOLJŠATI

### 8.4. `chatSessions` i `chatMessages` tablice

Tablice su u shemi i API postoji (`routes/sessions.ts`), ali:
- `plannerAIStore.ts` kreira i učitava sesije
- Uvjetno sprema poruke samo **ako postoji `sessionId`** (`api.ts:1010–1018`)
- `loadSession` u store-u ne ucitava messages iz baze ispravno — pretpostavlja `{ session, messages }` ali API vjerojatno ne vraća tako strukturiran odgovor (nije verificirano)

**Ocjena:** ⚠️ TREBA POBOLJŠATI

---

## 9. VELIČINA I ORGANIZACIJA FAJLOVA

### 9.1. Najveći fajlovi (potencijalni kandidati za split)

| Fajl | Linije | Problem |
|---|---|---|
| `server/src/api.ts` | **1062** | SVE rute u jednom fajlu. CRUD za users/projects/locations/characters/chapters/scenes + AI endpoints |
| `server/src/services/ai/graph/nodes.ts` | **544** | 10 funkcija + 3 AI moda unutar managerContextNode |
| `ui/src/stores/plannerAIStore.ts` | **491** | Store + Session management + Message routing |
| `server/src/services/ai/planner.prompts.ts` | **475** | 475 linija templateova promptova |
| `server/src/services/ai/graph/graph.ts` | **320** | Graf definicija — prihvatljivo |

### 9.2. `api.ts` — Preporuka za split

```
server/src/api.ts (1062 linija) → split na:
├── routes/users.ts         (~50 linija)
├── routes/projects.ts      (~150 linija)
├── routes/locations.ts     (~80 linija)
├── routes/characters.ts    (~100 linija)
├── routes/chapters.ts      (~80 linija)
├── routes/scenes.ts        (~120 linija)
├── routes/ai.ts            (~200 linija — AI endpoints)
└── api.ts                  (~50 linija — samo router mounting)
```

### 9.3. Dubina direktorija

```
server/src/services/ai/graph/nodes.ts  ← 4 razine dubine
```

Relativno duboko. Uzrokuje da `nodes.ts` mora importati iz `../../ai.factory.js` (2 razine gore) što je fragile.

**Ocjena:** ⚠️ TREBA POBOLJŠATI

---

## 10. DOKUMENTACIJA vs STVARNOST

### 10.1. Planovi koji su djelomično ili potpuno implementirani

| Dokument | Status | Napomena |
|---|---|---|
| `TEHNICKI_PLAN_AI_POLIRANJE_V2.md` | ⚠️ Djelomično | Manager-Worker implementiran, ali session history/token economy nije |
| `TEHNICKI_PLAN_STUDIO_AI.md` | ⚠️ Djelomično | Ghost Text postoji, AI Writer mode postoji, ali Faza 6.3 (history sidebar UI) nije |
| `TEHNICKI_PLAN_AI_POLIRANJE.md` | ✅ Implementirano | Separacija brainstorming poruka je u `plannerAIStore.ts` |
| `PLAN_BETA_STABILIZACIJE.md` | ❌ Nije implementirano | A.2/A.3 firebase-admin fix nije napravljen |
| `TEHNICKI_PLAN_FEEDBACK_MODULE.md` | ❌ Nije implementirano | Nema `feedback` tablice u schemi |
| `IMPLEMENTATION_PLAN_CONTEXTUAL_EDIT.md` | ✅ Backend implementiran | `contextual-edit` mode postoji u nodes.ts |

### 10.2. Dokumentacija koja opisuje nešto što ne postoji

**`SYSTEM_DOSSIER.md`** (datiran 4. Siječanj 2026):
- Opisuje 500 Error na `POST /api/projects` — **riješen** (migracije su prošle)
- Opisuje stari `RETURNING *` problem — **riješen**
- Dokument je historijski incident report, ne odražava trenutno stanje

**`README.md`** (root):
- Opisuje "Cloudflare Workers + Pages deployment" — projekt je na **Vercelu**
- Opisuje `pnpm connect:database`, `pnpm connect:auth` skripte — **ne postoje** u `package.json`
- Ovo je originalni boilerplate README, nikad ažuriran za ovaj projekt

**Dokaz:**  
- `package.json` (root) — nema `connect:*` skripti
- `vercel.json` — Vercel, ne Cloudflare

### 10.3. VertexAI / ChiefEditor — Nespomenuto u planovima

`VertexAIService.ts` i `ChiefEditorModal` komponenta postoje ali nisu dokumentirani ni u jednom `TEHNICKI_PLAN_*` fajlu. Ovo je **paralelni AI sustav** koji koristi Gemini 1.5 Pro s Vertex AI Context Caching za analizu knjige. Aktiviran je iz `ProjectLayout.tsx` i dostupan kroz gumb u `ProjectNav.tsx`.

**Dokaz:**  
- `routes/editor.routes.ts:3` — `import { VertexAIService }`
- `ui/src/components/layout/ProjectLayout.tsx:35` — ChiefEditorModal je u layoutu
- `schema.ts:232–255` — `editorAnalyses` tablica za pohranu Gemini analiza

**Ocjena:** ⚠️ TREBA POBOLJŠATI — 3. AI provider bez dokumentacije i bez env varijabli u `.env.example`

---

## SAŽETAK NALAZA

### 🔴 KRITIČNO (5 nalaza)

1. **Frontend timeout (30s) < Backend execution time (75s+)** — Korisnik vidi timeout error za dugačke AI generacije (sekcija 3.2)
2. **`workerModel` se šalje s frontenda ali backend ga ignoriše** — Silent bug (sekcija 3.3)
3. **Scene tekst se sprema u `summary` kolonu** — Semantički neispravno, potencijalni budući bug (sekcija 8.1)
4. **RAG embeddings nikad se ne popunjavaju automatski** — RAG je dead feature u produkciji (sekcija 4.1)
5. **NULA testova za `graph/nodes.ts`** — Kritična AI logika je nekrivena (sekcija 6.2)

### ⚠️ TREBA POBOLJŠATI (10 nalaza)

6. **OpenAI API key obvezan za RAG** — Blokira lokalni LLM setup (sekcija 4.2)
7. **`api.ts` je 1062 linija** — Kandidat za split na rute (sekcija 9.1)
8. **6 mrtvih fajlova** (~730 linija mrtvog koda) (sekcija 2.2)
9. **`retryWithBackoff` dupliciran** na frontendu (sekcija 2.1)
10. **JSON output za contextual-edit nedouzdan** na lokalnim LLM-ovima (sekcija 5.2)
11. **Vercel `maxDuration: 60s`** premalo za dulje generacije (sekcija 7.4)
12. **`AI_PROVIDER` env var ignoriran** (sekcija 7.2)
13. **`GOOGLE_SERVICE_ACCOUNT_JSON` nije u `.env.example`** (sekcija 7.3)
14. **`0003_add_extensions.sql` nije u journalu** (sekcija 8.3)
15. **LangGraph over-engineered** za current use-case bez napunjene RAG baze (sekcija 1.1)

---

*Audit završen. Vidi `PLAN_AI_FACTORY_UNIFICATION.md` za plan refaktoriranja factory sustava.*
