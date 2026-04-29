# TEHNIČKI PLAN — FAZA 5: Humanization Layer
**Datum:** 2026-04-26  
**Osnova:** Analiza koda (graph/nodes.ts, graph.ts, state.ts, ai.factory.ts, AIChatSidebar.tsx, plannerAIStore.ts, schema.ts)  
**Status:** DRAFT — koristiti kao vodič za implementaciju  
**Procjena:** ~12-16h

---

## Referentni dokumenti

| Dokument | Uloga |
|---|---|
| `HUMANIZATION_LAYER_GUIDE.md` | Definicija 5 koraka humanizacije, mjere uspjeha, napomene o Qwen failoveru |
| `MASTER_PLAN_REFAKTORIRANJA.md` (Faza 5) | Projektni kontekst, DB shema skice, procjena vremena |

**Usklađenost s HUMANIZATION_LAYER_GUIDE.md:**
- Pipeline iz Guidea: `Worker (Sonnet) → Critique (Qwen) → Humanization (Qwen) → Output` — točno implementirano u ovom planu
- Korak 3 (Voice Profile): Guide kaže "2-3 uzorka pri onboardingu" — ovaj plan koristi **min 3** (konzervativniji, ali kompatibilan)
- Napomena o failoveru: Guide kaže "ako Qwen nije dostupan, preskače se" — implementirano kao `try/catch` u `humanizationNode` koji vraća `{}` (original ostaje)
- Voice samples: Guide kaže "lokalni, ne idu u cloud" — samples se čuvaju u Neon DB (server-side), ne šalju se na externe AI servise

---

## A) ARHITEKTURA

### Gdje točno ulazi Humanization node u grafu?

Postojeći flow za Writer/Planner/Contextual-edit mode:
```
transform_query → retrieve_context → route_task
  → [creative_generation] → manager_context_node → worker_generation_node
      → [brainstorming] → final_output → END
      → [writer/planner/contextual-edit] → critique_draft
          → [stop=true OR draftCount>=3] → final_output → END   ← OVDJE ULAZI
          → [continue] → refine_draft → critique_draft (petlja)
```

**Ciljna arhitektura:**
```
transform_query → retrieve_context → route_task
  → [creative_generation] → manager_context_node → worker_generation_node
      → [brainstorming]                  → final_output → END   ← NEMA humanizacije
      → [writer/planner/contextual-edit] → critique_draft
          → [stop=true OR max iter]      → humanization_node    ← NOVO
          → [continue]                   → refine_draft → critique_draft
  humanization_node → final_output → END
  → [simple_retrieval] → handle_simple_retrieval → END          ← NEMA humanizacije
  → [text_modification] → modify_text → END                     ← NEMA humanizacije
```

**Zašto OVDJE (između reflection petlje i final_output)?**

1. `finalOutputNode` (nodes.ts:542) radi `return { finalOutput: state.draft }` — čita iz `state.draft`
2. `humanizationNode` treba vratiti `{ draft: humanizedText }` (ne `finalOutput`), 
   jer `finalOutputNode` uvijek prepisuje `finalOutput` iz `draft`
3. Brainstorming, simple_retrieval i text_modification mode PRESKAČU humanizaciju —
   to su kratki odgovori ili ideje, ne polirana proza
4. Humanizacija ima smisla samo za Writer i Planner mode (generiranje proze/sadržaja)

### Koje vrste sadržaja dobivaju humanizaciju?

| Mode | Prolazi kroz humanizaciju? | Razlog |
|---|---|---|
| `writer` | ✅ Da (ako je toggle ON) | Proza za knjige |
| `planner` | ✅ Da (ako je toggle ON) | Sinopsisi, premise, opisi |
| `brainstorming` | ❌ Ne | Kratke ideje, bullet points |
| `contextual-edit` | ❌ Ne | Korisnik traži specifičnu izmjenu, ne humanizaciju |
| `simple_retrieval` | ❌ Ne | Odgovori na pitanja, ne proza |
| `text_modification` | ❌ Ne | Direktna manipulacija teksta |

### Je li humanization novi node ili odvojen servis?

**Novi node u `server/src/services/ai/graph/nodes.ts`** — ne odvojen servis.

Razlozi:
- Koristi isti `AIProvider` interface (OllamaProvider / Qwen)
- Pristupa istom `AgentState` (state.draft, state.styleFingerprint)
- Logički je dio Writer pipeline-a, ne vanjski servis
- Testabilnost: može se mockati kao i ostali nodovi

---

## B) HUMANIZATION AGENT — IMPLEMENTACIJA (5 koraka)

Koraci iz MASTER_PLAN Faze 5 mapiraju se na ove tehničke komponente:

### Korak 1: System prompt (lista zabranjenih AI obrazaca)

**Gdje se čuva:**  
`server/src/services/ai/prompts/humanization.prompt.ts` — novi fajl

**Kako se učitava:**  
Import u `nodes.ts`, poziv `buildHumanizationPrompt(state.draft, state.styleFingerprint, audienceHint)`

**Sadržaj — konkretni zabranjen obrasci:**
```typescript
// humanization.prompt.ts

export const FORBIDDEN_PHRASES = [
  "delve into", "it's worth noting", "it's important to",
  "in the realm of", "harness the power of", "revolutionize",
  "in conclusion", "to summarize", "at the end of the day",
  "comprehensive", "cutting-edge", "game-changing",
  "seamlessly", "transformative", "paradigm shift",
  "dive deep", "unpack", "nuanced",
] as const;

export const HUMANIZATION_RULES = `
ZABRANJENO (ukloni ili zamijeni):
- Em-dashovi (—) kao separatori → koristi zareze ili prestrukturiraj rečenicu
- Fraze: ${FORBIDDEN_PHRASES.join(", ")}
- Tri ili više uzastopnih rečenica koje počinju istom riječju
- Uniformna duljina rečenica (sve ~20 riječi)

OBAVEZNO:
- Miješaj kratke (5-8 riječi) i duge (15-25 riječi) rečenice
- Aktivni glas gdje god je moguće
- Sačuvaj SVE informacije i smisao originala
- Vrati SAMO prepisani tekst, bez objašnjenja ili komentara
` as const;

export interface StyleFingerprint {
  avgSentenceLength: number;
  tone: { formal: number; casual: number; poetic: number };
  signaturePhrases: string[];
  sentencePatterns: string;
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated';
}

export function buildHumanizationPrompt(
  text: string,
  styleFingerprint?: StyleFingerprint | null,
  audienceHint?: string | null
): string {
  const styleSection = styleFingerprint
    ? buildStyleSection(styleFingerprint)
    : '';
  const audienceSection = audienceHint
    ? `\nPUBLIKA: ${audienceHint} — prilagodi ton i vokabular.`
    : '';

  return `Ti si urednik koji prepisuje tekst da zvuči prirodno i ljudski.

${HUMANIZATION_RULES}
${audienceSection}
${styleSection}

TEKST ZA PREPIS:
${text}`;
}

function buildStyleSection(fp: StyleFingerprint): string {
  return `
STIL AUTORA (pokušaj oponašati):
- Prosječna duljina rečenice: ~${fp.avgSentenceLength} riječi
- Ton: formal=${(fp.tone.formal * 100).toFixed(0)}%, casual=${(fp.tone.casual * 100).toFixed(0)}%, poetski=${(fp.tone.poetic * 100).toFixed(0)}%
- Vokabular: ${fp.vocabularyLevel}
- Karakteristične fraze koje MOŽEŠ koristiti: ${fp.signaturePhrases.slice(0, 3).join(', ')}
- Uzorak rečenica: ${fp.sentencePatterns}`;
}
```

### Korak 2: Reference document (AI patterns) — format i lokacija

Ne postoji kao zaseban fajl u DB-u. **Implementirano kao konstante u kodu** (`FORBIDDEN_PHRASES`, `HUMANIZATION_RULES` u `humanization.prompt.ts`).

**Zašto ne DB?**
- Obrasci se ne mijenjaju per-user — isti su za sve
- Lakše verzionirati i testirati kao kod
- Nema potrebe za UI za uređivanje (nije use case)

**Ako u budućnosti treba per-project konfiguracija:** dodati `humanization_config` jsonb kolonu u `projects` tablicu.

### Korak 3: Voice Profile — DB shema, upload endpoint, prosljeđivanje agentu

**Nova DB shema** (migracija `0007_add_style_profile`):

```typescript
// schema.ts — DODATI

export const userWritingSamples = pgTable('user_writing_samples', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  wordCount: integer('word_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_writing_samples_user_id').on(table.userId),
}));

export const userStyleFingerprints = pgTable('user_style_fingerprints', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  avgSentenceLength: integer('avg_sentence_length'),
  tone: jsonb('tone').$type<{ formal: number; casual: number; poetic: number }>(),
  signaturePhrases: text('signature_phrases').array(),
  sentencePatterns: text('sentence_patterns'),
  vocabularyLevel: text('vocabulary_level').$type<'simple' | 'moderate' | 'sophisticated'>(),
  sampleCount: integer('sample_count').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Upload endpoint** (novi fajl `server/src/routes/style.routes.ts`):
```
POST /api/users/writing-samples        — upload jednog samplea (min 100, max 5000 znakova)
GET  /api/users/writing-samples        — lista samplea (id, wordCount, createdAt)
DELETE /api/users/writing-samples/:id  — brisanje samplea
POST /api/users/style-fingerprint/analyze  — pokreni analizu (min 3 samplea potrebno)
GET  /api/users/style-fingerprint      — dohvati fingerprint (ili null ako nema)
```

**Kako se prosljeđuje agentu:**

U `ai.routes.ts` (chat endpoint), prije poziva `runStoryArchitectGraph`, dohvati fingerprint:
```typescript
// ai.routes.ts — u /projects/:projectId/chat handleru
const styleFingerprint = await db.query.userStyleFingerprints.findFirst({
  where: eq(tables.userStyleFingerprints.userId, user.id)
});

return await runStoryArchitectGraph(
  userInput, storyContext, plannerContext, mode,
  editorContent, langChainMessages, selection, workerModel,
  humanizationEnabled,         // NOVO
  styleFingerprint ?? null,    // NOVO
  projectContext.project.audience ?? null  // iz projekta
);
```

`runStoryArchitectGraph` signature u `graph.ts` dobiva 3 nova parametra:
```typescript
export async function runStoryArchitectGraph(
  // ... postojeći params ...
  humanizationEnabled?: boolean,
  styleFingerprint?: StyleFingerprint | null,
  audienceHint?: string | null
): Promise<AgentState>
```

### Korak 4: Personalizacija (publika + osobni primjeri) — UI polja, dostava agentu

**Publika (audience):** Već postoji u `projects.audience` koloni (schema.ts:43). `ContextBuilder.buildProjectContext` već je dohvaća. Samo je treba proslijediti u state.

**Osobni primjeri:** Dolaze iz `StyleFingerprint.signaturePhrases` koji se analizira iz writing samplea.

**UI polja za upload samplea** (novi React component `ui/src/components/profile/WritingSamplesManager.tsx`):
- Textarea za paste teksta (min 100 znakova, counter)
- Gumb "Analiziraj stil" (disabled dok nema ≥ 3 samplea)
- Lista postojećih samplea s mogućnošću brisanja
- Status: "X samplea uploadano | Stil analiziran: [datum]"

**Gdje u UI:** Settings stranica (`ui/src/pages/Settings.tsx`) — nova sekcija "Writing Style".

### Korak 5: Varijacija rečenica — prompt engineering

**Nije post-processing kod** (regex/NLP), nego **prompt engineering** u `HUMANIZATION_RULES`.

Razlog: Qwen3:30b-a3b razumije instrukciju "miješaj kratke i duge rečenice" i primjenjuje je kontekstualno. Regex ne može procijeniti tečnost.

Konkretne instrukcije u promptu:
```
- Svaki paragraf mora imati minimalno jednu rečenicu kraću od 8 riječi
- Svaki paragraf mora imati minimalno jednu rečenicu dužu od 15 riječi
- Ne počinji više od 2 uzastopne rečenice istom riječju ili ista fraza
- Ako ima 3+ rečenica iste duljine (±3 riječi), varijatiraj ih
```

**Temperatura za humanizationNode:** `0.65` — viša nego za critique (0.2) ali niža nego worker (0.7).  
Viša temperatura = više kreativnih varijacija u rečeničnoj strukturi.

---

## C) NOVI FAJLOVI I PROMJENE

### Novi fajlovi (kreirati)

| Fajl | Vrsta | Opis |
|---|---|---|
| `server/src/services/ai/prompts/humanization.prompt.ts` | Servis | Prompt builder, FORBIDDEN_PHRASES, StyleFingerprint tip |
| `server/src/routes/style.routes.ts` | API | Voice profile CRUD endpoints |
| `ui/src/components/profile/WritingSamplesManager.tsx` | UI | Upload i pregled writing samplea |
| `server/drizzle/0007_add_style_profile.sql` | Migracija | user_writing_samples + user_style_fingerprints tablice |

### Modificirati postojeće fajlove

| Fajl | Promjena | Procjena |
|---|---|---|
| `server/src/services/ai/graph/state.ts` | Dodati `humanizationEnabled`, `styleFingerprint`, `audienceHint` u `AgentState` i `createInitialState` | 20 min |
| `server/src/services/ai/graph/nodes.ts` | Dodati `humanizationNode` funkciju | 45 min |
| `server/src/services/ai/graph/graph.ts` | Dodati `humanization_node`, promijeniti `reflectionCondition` routing, ažurirati `runStoryArchitectGraph` signature | 30 min |
| `server/src/schema/schema.ts` | Dodati `userWritingSamples` i `userStyleFingerprints` tablice s relacijama | 20 min |
| `server/src/schemas/validation.ts` | Dodati `humanizationEnabled?: z.boolean()` u `ChatRequestBodySchema` | 5 min |
| `server/src/routes/ai.routes.ts` | Dohvatiti `styleFingerprint` iz DB i proslijediti u `runStoryArchitectGraph` | 20 min |
| `server/src/app.ts` (ili gdje se mountaju rute) | Mountati `styleRouter` | 5 min |
| `ui/src/stores/plannerAIStore.ts` | Dodati `humanizationEnabled: boolean`, `toggleHumanization` | 15 min |
| `ui/src/components/planner/AIChatSidebar.tsx` | Dodati toggle UI za humanizaciju | 20 min |
| `ui/src/lib/serverComm.ts` | Proslijediti `humanizationEnabled` u chat request body | 10 min |
| `ui/src/pages/Settings.tsx` | Dodati sekciju "Writing Style" s `WritingSamplesManager` | 30 min |

### Novi DB tablice i kolone

```sql
-- 0007_add_style_profile.sql

CREATE TABLE user_writing_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  word_count integer,
  created_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX idx_writing_samples_user_id ON user_writing_samples(user_id);

CREATE TABLE user_style_fingerprints (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avg_sentence_length integer,
  tone jsonb,
  signature_phrases text[],
  sentence_patterns text,
  vocabulary_level text,
  sample_count integer NOT NULL DEFAULT 0,
  updated_at timestamp DEFAULT now() NOT NULL
);
```

### Novi API endpointi

```
POST   /api/users/writing-samples               — upload samplea
GET    /api/users/writing-samples               — lista samplea
DELETE /api/users/writing-samples/:id           — brisanje samplea
POST   /api/users/style-fingerprint/analyze     — pokretanje analize (async, 5-30s)
GET    /api/users/style-fingerprint             — dohvat fingerprinta
```

---

## D) OVISNOSTI

### Što mora raditi prije

| Preduvjet | Status |
|---|---|
| Faza 2: ai.factory.ts (`createManagerProvider`) | ✅ ZAVRŠENO (commit 3be2b66) |
| Faza 3: Ollama/Qwen konfiguracija | ✅ ZAVRŠENO (commit f658abb) |
| HPE #1 upaljen (192.168.10.197:11434) | Potrebno za SVAKI Qwen poziv |
| `qwen3:30b-a3b` pull na HPE #1 | ✅ Potvrđeno radnim testom |

### Novi paketi

**Nema novih npm paketa potrebnih.**

Sve se može implementirati s:
- Existing: `drizzle-orm`, `hono`, `zod`, `openai` (za OllamaProvider)
- Sve AI pozive radi `OllamaProvider` koji već postoji

### .env promjene

**Nema novih env varijabli.** Sve koristi postojeće:
- `OLLAMA_BASE_URL` — za humanizationNode (Manager provider)
- `MANAGER_MODEL` — qwen3:30b-a3b

Eventualno opcionalno:
```dotenv
# Opcionalno: override temperature za humanizaciju
HUMANIZATION_TEMPERATURE=0.65
# Opcionalno: timeout za humanizaciju (Qwen može biti spor za dulje tekstove)
HUMANIZATION_TIMEOUT=60000
```

---

## E) REDOSLIJED IMPLEMENTACIJE

### Korak 1: State i tip (30 min) — bez HPE #1
**Fajlovi:** `state.ts`, `humanization.prompt.ts` (novi)

Dodati u `AgentState` (state.ts):
```typescript
humanizationEnabled?: boolean;
styleFingerprint?: StyleFingerprint | null;
audienceHint?: string | null;
```

Ažurirati `createInitialState` da prima i prosljeđuje nova polja.

Kreirati `humanization.prompt.ts` s tipovima i prompt builderom (čisti TypeScript, nema AI poziva).

**Deliverable:** TypeScript kompajlira, novi tipovi dostupni.

---

### Korak 2: humanizationNode (45 min) — ZAHTIJEVA HPE #1
**Fajlovi:** `nodes.ts`

```typescript
// nodes.ts — DODATI na kraj

export async function humanizationNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[HUMANIZATION] Starting, enabled:", state.humanizationEnabled);

  if (!state.humanizationEnabled || !state.draft) {
    console.log("[HUMANIZATION] Skipping (disabled or no draft)");
    return {};  // state.draft ostaje nepromijenjen, finalOutputNode ga pokupi
  }

  try {
    const manager = await createManagerProvider();
    const prompt = buildHumanizationPrompt(
      state.draft,
      state.styleFingerprint,
      state.audienceHint
    );

    const humanized = await manager.generateText(prompt, {
      temperature: parseFloat(process.env.HUMANIZATION_TEMPERATURE || '0.65'),
      maxTokens: 3000,
      timeout: parseInt(process.env.HUMANIZATION_TIMEOUT || '60000'),
    });

    if (!humanized || humanized.length < 10) {
      console.warn("[HUMANIZATION] Empty/too-short output, keeping original draft");
      return {};
    }

    console.log(`[HUMANIZATION] Done: ${state.draft.length} → ${humanized.length} chars`);
    return { draft: humanized.trim() };

  } catch (error) {
    console.error("[HUMANIZATION] Error, keeping original draft:", error);
    return {};  // Fail-safe: ne blokiraj pipeline
  }
}
```

**Deliverable:** Node implementiran, unit test napisan (mock Manager provider).

---

### Korak 3: Graph izmjene (30 min) — ZAHTIJEVA HPE #1 za E2E test
**Fajlovi:** `graph.ts`

3a. Dodati import `humanizationNode` i node u graf:
```typescript
graph.addNode("humanization_node", humanizationNode);
```

3b. Promijeniti `reflectionCondition` return values:
```typescript
// PRIJE:
return "final_output";
// POSLIJE:
return "humanization_node";
```
(Obje `return "final_output"` linije u funkciji — i za max iterations i za `stop=true`)

3c. Dodati edge:
```typescript
graph.addEdge("humanization_node" as any, "final_output" as any);
```

3d. Ažurirati `runStoryArchitectGraph` signature i `createInitialState` poziv:
```typescript
export async function runStoryArchitectGraph(
  userInput: string,
  storyContext: string,
  plannerContext?: string,
  mode?: 'planner' | 'brainstorming' | 'writer' | 'contextual-edit',
  editorContent?: string,
  messages: BaseMessage[] = [],
  selection?: string,
  workerModel?: string,
  humanizationEnabled?: boolean,          // NOVO
  styleFingerprint?: StyleFingerprint | null,  // NOVO
  audienceHint?: string | null             // NOVO
): Promise<AgentState>
```

**Deliverable:** Graf kompajlira, test-graph endpoint radi.

---

### Korak 4: Validation i API route (20 min) — bez HPE #1
**Fajlovi:** `validation.ts`, `ai.routes.ts`

`validation.ts`:
```typescript
export const ChatRequestBodySchema = z.object({
  // ... postojeća polja ...
  humanizationEnabled: z.boolean().optional(),  // DODATI
});
```

`ai.routes.ts` (u chat handleru, prije `runStoryArchitectGraph`):
```typescript
const { 
  userInput, plannerContext, messages, mode,
  editorContent, selection, sessionId, workerModel,
  humanizationEnabled  // DODATI
} = getValidatedBody<ChatRequestBody>(c);

// Dohvati style fingerprint za ovog korisnika
const styleFingerprint = humanizationEnabled
  ? await db.query.userStyleFingerprints.findFirst({
      where: eq(tables.userStyleFingerprints.userId, user.id)
    }).then(r => r ?? null)
  : null;

// Audience iz projekta (već je u projectContext)
const audienceHint = projectContext.project.audience ?? null;

return await runStoryArchitectGraph(
  userInput, storyContext, plannerContext, mode,
  editorContent, langChainMessages, selection, workerModel,
  humanizationEnabled ?? false,
  styleFingerprint,
  audienceHint
);
```

**Deliverable:** Backend prima i prosljeđuje `humanizationEnabled` flag.

---

### Korak 5: Frontend toggle (30 min) — bez HPE #1
**Fajlovi:** `plannerAIStore.ts`, `AIChatSidebar.tsx`, `serverComm.ts`

`plannerAIStore.ts` — dodati u interface i state:
```typescript
// Interface
humanizationEnabled: boolean;
toggleHumanization: () => void;

// State init
humanizationEnabled: false,

// Action
toggleHumanization: () => set(state => ({ humanizationEnabled: !state.humanizationEnabled })),
```

`AIChatSidebar.tsx` — dodati toggle u Mode Selector sekciju (ispod Worker Model Selectora):
```tsx
// Dodati u destructuring iz usePlannerAIStore:
humanizationEnabled, toggleHumanization,

// Dodati UI (ispod model selectora, samo za writer/planner mode):
{(mode === 'writer' || mode === 'planner') && (
  <div className="flex items-center justify-between px-1">
    <span className="text-xs text-muted-foreground">Humanizacija</span>
    <button
      onClick={toggleHumanization}
      className={cn(
        "text-xs px-2 py-0.5 rounded transition-colors",
        humanizationEnabled
          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          : "text-stone-500 hover:text-stone-400"
      )}
    >
      {humanizationEnabled ? '✦ ON' : '○ OFF'}
    </button>
  </div>
)}
```

`serverComm.ts` — proslijediti flag u `chat` poziv. Naći `api.chat` definiciju i dodati `humanizationEnabled?: boolean` u request body tip.

**Deliverable:** Toggle vidljiv i funkcionalan u UI, flag se šalje na backend.

---

### Korak 6: DB migracija (20 min) — bez HPE #1
**Fajlovi:** `schema.ts`, nova migracija

```bash
cd server
pnpm db:generate  # generiraj 0007_add_style_profile.sql
pnpm db:migrate   # primijeni lokalno
```

Provjeri generirani SQL (mora sadržati CREATE TABLE user_writing_samples i user_style_fingerprints).

**Deliverable:** Tablice postoje u lokalnoj DB.

---

### Korak 7: Style Profile API i analiza (3-4h) — ZAHTIJEVA HPE #1 za analyze endpoint
**Fajlovi:** `style.routes.ts` (novi), app mounting

Implementirati CRUD za writing samples i analyze endpoint:

```typescript
// style.routes.ts

export const styleRouter = new Hono();

// Upload sample
styleRouter.post('/users/writing-samples', authMiddleware, async (c) => {
  const user = c.get('user');
  const { text } = await c.req.json();
  
  if (!text || text.length < 100) {
    return c.json({ error: 'Sample mora imati minimalno 100 znakova' }, 400);
  }
  if (text.length > 5000) {
    return c.json({ error: 'Sample može imati maksimalno 5000 znakova' }, 400);
  }
  
  const wordCount = text.split(/\s+/).length;
  const db = await getDatabase(getDatabaseUrl());
  const [sample] = await db.insert(tables.userWritingSamples)
    .values({ userId: user.id, text, wordCount })
    .returning();
  
  return c.json(sample, 201);
});

// Analyze — poziva Qwen, async, može trajati 10-30s
styleRouter.post('/users/style-fingerprint/analyze', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = await getDatabase(getDatabaseUrl());
  
  const samples = await db.query.userWritingSamples.findMany({
    where: eq(tables.userWritingSamples.userId, user.id),
    orderBy: [desc(tables.userWritingSamples.createdAt)],
    limit: 10  // Koristi max 10 samplea
  });
  
  if (samples.length < 3) {
    return c.json({ error: 'Potrebno minimalno 3 samplea za analizu' }, 400);
  }
  
  const manager = await createManagerProvider();
  const analysisPrompt = buildStyleAnalysisPrompt(samples.map(s => s.text));
  
  const rawResult = await manager.generateText(analysisPrompt, {
    temperature: 0.1,
    maxTokens: 500,
    timeout: 45000
  });
  
  let fingerprint: StyleFingerprint;
  try {
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    fingerprint = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[STYLE_ANALYSIS] JSON parse failed:', e, rawResult);
    return c.json({ error: 'Analiza nije uspjela — pokušaj ponovo' }, 500);
  }
  
  await db.insert(tables.userStyleFingerprints)
    .values({
      userId: user.id,
      avgSentenceLength: fingerprint.avgSentenceLength,
      tone: fingerprint.tone,
      signaturePhrases: fingerprint.signaturePhrases,
      sentencePatterns: fingerprint.sentencePatterns,
      vocabularyLevel: fingerprint.vocabularyLevel,
      sampleCount: samples.length,
    })
    .onConflictDoUpdate({
      target: tables.userStyleFingerprints.userId,
      set: {
        avgSentenceLength: fingerprint.avgSentenceLength,
        tone: fingerprint.tone,
        signaturePhrases: fingerprint.signaturePhrases,
        sentencePatterns: fingerprint.sentencePatterns,
        vocabularyLevel: fingerprint.vocabularyLevel,
        sampleCount: samples.length,
        updatedAt: new Date(),
      }
    });
  
  return c.json({ status: 'success', fingerprint });
});
```

`buildStyleAnalysisPrompt` implementira se u `humanization.prompt.ts`:
```typescript
export function buildStyleAnalysisPrompt(samples: string[]): string {
  return `Analiziraj sljedeće uzorke pisanja i ekstrahiraj karakteristike stila.

${samples.map((s, i) => `Uzorak ${i+1}:\n${s}`).join('\n\n---\n\n')}

Vrati SAMO JSON (bez teksta prije ili poslije):
{
  "avgSentenceLength": <prosječan broj riječi po rečenici>,
  "tone": { "formal": <0-1>, "casual": <0-1>, "poetic": <0-1> },
  "signaturePhrases": ["<fraza1>", "<fraza2>", "<fraza3>"],
  "sentencePatterns": "<kratki opis tipičnih obrazaca rečenica>",
  "vocabularyLevel": "<simple|moderate|sophisticated>"
}`;
}
```

**Deliverable:** Korisnik može uploadati 3 samplea, pokrenuti analizu, vidjeti fingerprint.

---

### Korak 8: Settings UI (1-2h) — bez HPE #1
**Fajlovi:** `WritingSamplesManager.tsx` (novi), `Settings.tsx`

Implementirati `WritingSamplesManager` komponentu koja:
1. Dohvaća listu samplea (GET /api/users/writing-samples)
2. Prikazuje textarea za upload
3. Prikazuje listu samplea s gumbom za brisanje
4. Prikazuje gumb "Analiziraj stil" (disabled dok nema ≥ 3 samplea)
5. Prikazuje status fingerprinta ("Stil analiziran: [datum]" ili "Nema analize")

Dodati sekciju u `Settings.tsx`:
```tsx
<section>
  <h2>Writing Style Profile</h2>
  <p className="text-muted-foreground text-sm">
    Dodaj uzorke svog pisanja da AI asistent nauči tvoj stil.
    Potrebno minimalno 3 uzorka.
  </p>
  <WritingSamplesManager />
</section>
```

**Deliverable:** Korisnik može uploadati uzorke kroz Settings stranicu.

---

### Korak 9 (Opcionalno): Article Mode (3-4h) — ZAHTIJEVA HPE #1
**Fajlovi:** `state.ts`, `nodes.ts`, `graph.ts`, `AIChatSidebar.tsx`

Ovo je proširenje koje nije blokirajuće za core humanizaciju. Implementirati tek nakon što su Koraci 1-8 stabilizirani.

**Minimalne promjene za MVP Article Mode:**
1. Dodati `'article'` u `mode` union u `AgentState` i `plannerAIStore.ts`
2. Dodati `article` case u `managerContextNode` s novim promptom iz `article.prompt.ts`
3. U `workerGenerationCondition`: `article` mode → idi na `humanization_node` direktno (preskači critique)
4. Dodati Article mode tab u `AIChatSidebar.tsx` (samo u Studio mode-u)
5. Default: `humanizationEnabled = true` za article mode

**Deliverable:** Article mode tab u sidebar, generira blog/article format s humanizacijom uključenom po defaultu.

---

### Vremenski redoslijed

| Korak | Procjena | HPE #1 potreban? | Može samostalno? |
|---|---|---|---|
| 1: State i tipovi | 30 min | ❌ Ne | ✅ Da |
| 2: humanizationNode | 45 min | ✅ Za ručni test | ✅ Piše se bez HPE |
| 3: Graph izmjene | 30 min | ✅ Za E2E test | ✅ Piše se bez HPE |
| 4: Validation + API route | 20 min | ❌ Ne | ✅ Da |
| 5: Frontend toggle | 30 min | ❌ Ne | ✅ Da |
| 6: DB migracija | 20 min | ❌ Ne | ✅ Da |
| 7: Style Profile API | 3-4h | ✅ Za analyze | ✅ Piše se bez HPE |
| 8: Settings UI | 1-2h | ❌ Ne | ✅ Da |
| 9: Article Mode (opt.) | 3-4h | ✅ Za test | ✅ Piše se bez HPE |
| **UKUPNO (1-8)** | **~8-9h** | | |
| **UKUPNO (1-9)** | **~12-14h** | | |

**Preporučeni redoslijed rada bez HPE #1:** 1 → 4 → 5 → 6 → 8  
**Redoslijed kad je HPE #1 upaljen:** 2 → 3 → 7 → E2E testiranje

---

## F) TESTIRANJE

### Kako testirati da humanizacija radi

**Test 1 — Unit test (bez HPE #1)**

Dodati u `nodes.test.ts`:
```typescript
describe('humanizationNode', () => {
  it('skips when humanizationEnabled is false', async () => {
    const state = createTestState({ humanizationEnabled: false, draft: 'Test text' });
    const result = await humanizationNode(state);
    expect(result).toEqual({});  // Nema promjene
  });

  it('skips when draft is empty', async () => {
    const state = createTestState({ humanizationEnabled: true, draft: '' });
    const result = await humanizationNode(state);
    expect(result).toEqual({});
  });

  it('calls manager provider when enabled', async () => {
    mockManagerProvider.generateText.mockResolvedValue('Humanized text');
    const state = createTestState({ humanizationEnabled: true, draft: 'Original text' });
    const result = await humanizationNode(state);
    expect(result.draft).toBe('Humanized text');
  });

  it('falls back to original on error', async () => {
    mockManagerProvider.generateText.mockRejectedValue(new Error('Ollama down'));
    const state = createTestState({ humanizationEnabled: true, draft: 'Original' });
    const result = await humanizationNode(state);
    expect(result).toEqual({});  // Fail-safe: prazan update (original ostaje)
  });
});
```

**Test 2 — Ručni E2E test (zahtijeva HPE #1)**

```bash
# Uz HPE #1 upaljen (Tailscale)
curl -X POST http://localhost:3000/api/projects/[ID]/chat \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "Napiši scenu gdje Ana ulazi u napuštenu kuću",
    "mode": "writer",
    "humanizationEnabled": true
  }'
```

Provjeri output:
- [ ] Nema em-dashova (—) kao separatora
- [ ] Nema zabranjenih fraza (`delve into`, `it's worth noting`, itd.)
- [ ] Rečenice variraju u duljini (kratke + duge)
- [ ] Nije veće od 2x dulje od inputa (guard: `humanized.length < state.draft.length * 1.5`)

**Test 3 — Toggle test (bez HPE #1, Visual)**

1. Otvori AI sidebar u Studio modu
2. Provjeri da se toggle vidi ispod model selectora (samo za writer/planner mode)
3. Klikni toggle — promijeni se iz "○ OFF" u "✦ ON"
4. Sljedeći chat request šalje `humanizationEnabled: true`
5. Provjeri u browser Network tab da request body ima `humanizationEnabled: true`

**Test 4 — Style Profile test (zahtijeva HPE #1)**

1. Upload 3 samplea (paste vlastiti tekst ≥ 100 znakova svaki)
2. Klikni "Analiziraj stil"
3. Provjeri response: JSON s `avgSentenceLength`, `tone`, `signaturePhrases`
4. Pokreni writer request s `humanizationEnabled: true`
5. Provjeri u logu da se style instructions vide u promptu

### Metrike uspjeha (AI detector)

Cilj: AI detector score < 10% (GPTZero, Originality.ai, ili Writer.com detector).

Postupak mjerenja:
1. Generiraj paragraf (5-7 rečenica) bez humanizacije → izmjeri score
2. Generiraj isti paragraf s humanizacijom → izmjeri score
3. Usporedi

**Prihvatljivo:** Pad od ≥50% u AI detection score.  
Primjer: 80% → <40% = uspjeh. 80% → 60% = neuspjeh, treba ojačati prompt.

### Manualni vs automatski testovi

| Test | Tip | Frekvencija |
|---|---|---|
| Unit testovi za humanizationNode | Automatski (vitest) | Svaki `pnpm test` |
| E2E chat s humanizacijom | Manualni | Jednom pri implementaciji |
| AI detector score mjerenje | Manualni | Jednom, na kraju |
| Style profile CRUD | Manualni | Jednom pri implementaciji |
| Toggle UI funkcionira | Manualni (vizualni) | Jednom pri implementaciji |

---

## Poznati rizici i mitigacije

| Rizik | Vjerojatnost | Mitigacija |
|---|---|---|
| Qwen ignorira humanization instrukcije i mijenja smisao | Srednja | Fail-safe u kodu: ako `humanized.length` < 50% ili > 150% od `draft.length`, vrati original |
| Qwen vraća prazan string ili garbage | Niska | Provjera `humanized.length > 10` u nodu, fallback na original |
| `analyzeStyleNode` vraća invalid JSON | Srednja | regex za `\{[\s\S]*\}`, fallback na error response (ne blokira chat) |
| Latencija Qwen za humanizaciju (+10-30s po requestu) | Visoka | Upozoriti korisnika u UI: "Humanizacija dodaje ~15s" |
| Article Mode opseg se razvlači | Visoka | MVP = samo prompt varijacija i defaultni toggle ON, bez novog UI screena |

---

## Veze s existing kodom koje treba znati

- `graph.ts:162` — `workerGenerationCondition` routes brainstorming na `final_output` direktno → NE mijenjati (brainstorming preskače humanizaciju ispravno)
- `graph.ts:287` — `reflectionCondition` ima 2 mjesta gdje vraća `"final_output"` → OBA treba promijeniti u `"humanization_node"`
- `nodes.ts:542` — `finalOutputNode` čita `state.draft` (ne `state.finalOutput`) → humanizationNode MORA ažurirati `draft`, ne `finalOutput`
- `ai.routes.ts:234` — `handleDatabaseOperation` wrapper oko `runStoryArchitectGraph` → fingerprint fetch treba biti UNUTAR tog wrappera (isti db context)
- `plannerAIStore.ts:355` — `api.chat` poziv → dodati `humanizationEnabled` u request body (provjeri tip u `serverComm.ts`)

---

*Plan kreiran: 2026-04-26*  
*Sljedeći korak: Implementirati Korak 1 (State i tipovi) — može odmah, bez HPE #1*
