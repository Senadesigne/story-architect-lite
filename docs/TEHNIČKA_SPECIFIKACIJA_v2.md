# TEHNIČKA SPECIFIKACIJA v2: Story Architect Lite - Post-MVP Faza

Ovaj dokument sadrži detaljne tehničke specifikacije i primjere koda za post-MVP fazu razvoja. Za praćenje zadataka i napretka, pogledajte `PROJEKTNI_PLAN_v2.md`.

## 1. Refaktoring i Tehnički Dug

### Zadatak 0.1: Ažurirati `product-brief.md`
**Tehnički detalji:**
Dodati u sekciju "Dugoročna Vizija":
```markdown
### AI Co-Writer Integracija
- **Faza 1:** Direktna integracija s vanjskim LLM API-jima (OpenAI/Claude)
- **Faza 2:** Hibridni orkestrator s lokalnim modelom (Llama 3) za optimizaciju promptova
- **Cilj:** AI asistent koji razumije kontekst cijele priče i pomaže u kreativnom procesu
```

### Zadatak 0.2: Ažurirati `.cursorrules`
**Tehnički detalji:**
Dodati na kraj datoteke:
```
- Sva interakcija s AI servisima mora ići kroz apstrakcijski sloj u `server/src/services/ai.service.ts`. Poštuj postojeći `AIProvider` pattern.
- Nikada ne hardkodiraj AI API ključeve u kodu. Uvijek ih čitaj iz `process.env` varijabli (npr. `process.env.AI_API_KEY`).
```

### Zadatak 0.3: Ažurirati `COMMAND_PROMPTS.md`
**Tehnički detalji:**
Dodati novi prompt:
```markdown
## Prompt 4: Planiranje AI Značajke
Razvijam novu AI značajku za Story Architect Lite. Molim te analiziraj:
1. **Backend:** Kako organizirati AI service sloj i API rute?
2. **Kontekst:** Koje podatke iz baze trebam prikupiti za kvalitetan AI odgovor?
3. **Prompt Engineering:** Kako strukturirati promptove za najbolje rezultate?
4. **Frontend:** Kako elegantno integrirati AI u postojeće forme?
5. **Error Handling:** Kako gracefully handlirati AI timeout/failure?
```

### Zadatak 1.1: Ukloniti neiskorištene `project` propove
**Tehnički detalji:**
```typescript
// ui/src/components/IdeationForm.tsx - ukloniti project iz interface
// ui/src/components/Phase2Form.tsx - ukloniti project iz interface
// ui/src/components/Phase6Form.tsx - ukloniti project iz interface
// ui/src/pages/ProjectPage.tsx - ažurirati pozive komponenti
```

### Zadatak 1.2: Ukloniti neiskorištenu `charactersToScenes` tablicu
**Tehnički detalji:**
1. Ukloniti iz `server/src/schema/schema.ts`:
   - `charactersToScenes` tablicu (linije 74-79)
   - `charactersToScenesRelations` (linije 111-114)
   - Reference u drugim relacijama
2. Pokrenuti migraciju: `pnpm db:generate && pnpm db:push`

### Zadatak 1.3: ESLint konfiguracija za backend
**Tehnički detalji:**
- Provjeriti postojanje `server/eslint.config.js`
- Dodati ako nedostaje (već postoje lint skripte u package.json)

### Zadatak 1.4: Centralizirani Error Handling
**Tehnički detalji:**
1. Kreirati `server/src/middleware/errorHandler.ts`:
```typescript
import { Context } from 'hono';

export const errorHandler = (err: Error, c: Context) => {
  console.error('API Error:', err);
  
  if (err.name === 'ValidationError') {
    return c.json({ error: err.message }, 400);
  }
  
  if (err.name === 'NotFoundError') {
    return c.json({ error: err.message }, 404);
  }
  
  return c.json({ error: 'Internal server error' }, 500);
};
```
2. Registrirati u `api.ts`: `app.onError(errorHandler)`
3. Kreirati custom error klase za bolju tipizaciju

### Zadatak 1.5: TypeScript Tipovi za Request Body
**Tehnički detalji:**
1. Kreirati `server/src/types/api.ts`:
```typescript
export interface UpdateProjectBody {
  logline?: string;
  premise?: string;
  theme?: string;
  genre?: string;
  audience?: string;
  brainstorming?: string;
  research?: string;
  rules_definition?: string;
  culture_and_history?: string;
  synopsis?: string;
  outline_notes?: string;
  point_of_view?: string;
}

export interface CreateLocationBody {
  name: string;
  description?: string;
}

export interface CreateCharacterBody {
  name: string;
  role?: string;
  motivation?: string;
  goal?: string;
  fear?: string;
  backstory?: string;
  arcStart?: string;
  arcEnd?: string;
}

export interface CreateSceneBody {
  title: string;
  summary?: string;
  order?: number;
  locationId?: string;
}
```
2. Implementirati tipove u svim rutama
3. Dodati validaciju pomoću Zod biblioteke (opcionalno)

## 2. UI/UX Poboljšanja

### Zadatak 2.1: Vizualni indikator trenutne faze
**Tehnički detalji:** TBD u budućoj fazi

### Zadatak 2.2: Tooltipovi i help tekstovi
**Tehnički detalji:** TBD u budućoj fazi

### Zadatak 2.3: Dark mode podrška
**Tehnički detalji:** TBD u budućoj fazi

### Zadatak 2.4: Mobilna optimizacija
**Tehnički detalji:** TBD u budućoj fazi

## 3. AI Integracija

### Cilj A: Direktna LLM API Integracija

#### Zadatak 3.1: Instalacija potrebnih biblioteka
**Tehnički detalji:**
```bash
# U server direktoriju
pnpm add openai @anthropic-ai/sdk axios
pnpm add -D @types/axios
```

#### Zadatak 3.2: Kreiranje AI service sloja
**Tehnički detalji:**
1. Kreirati `server/src/services/ai.service.ts`:
```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AIProvider {
  generateText(prompt: string, context?: Record<string, any>): Promise<string>;
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async generateText(prompt: string, context?: Record<string, any>): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Ti si kreativni asistent za pisanje priča.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    return completion.choices[0].message.content || '';
  }
}

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async generateText(prompt: string, context?: Record<string, any>): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    });
    
    return message.content[0].type === 'text' ? message.content[0].text : '';
  }
}

// Factory pattern za lako mijenjanje providera
export function createAIProvider(type: 'openai' | 'anthropic', apiKey: string): AIProvider {
  switch(type) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${type}`);
  }
}
```

#### Zadatak 3.3: Implementacija AI ruta u API-ju
**Tehnički detalji:**
1. Dodati u `server/src/api.ts`:
```typescript
import { createAIProvider } from './services/ai.service';
import { lt } from 'drizzle-orm';

// POST /api/projects/:projectId/ai/generate-scene-synopsis
app.post('/api/projects/:projectId/ai/generate-scene-synopsis', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const body = await c.req.json();
    const { sceneId, includeFullContext = true } = body;
    
    // Validacija
    if (!sceneId) {
      return c.json({ error: 'Scene ID is required' }, 400);
    }
    
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Provjera vlasništva
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Dohvati scenu
    const [scene] = await db
      .select()
      .from(scenes)
      .where(and(eq(scenes.id, sceneId), eq(scenes.projectId, projectId)));
    
    if (!scene) {
      return c.json({ error: 'Scene not found' }, 404);
    }
    
    // Pripremi kontekst
    let context = {
      sceneTitle: scene.title,
      sceneOrder: scene.order,
      currentSummary: scene.summary || ''
    };
    
    if (includeFullContext) {
      // Dohvati dodatni kontekst
      const [characters, locations, previousScenes] = await Promise.all([
        db.select().from(characters).where(eq(characters.projectId, projectId)),
        db.select().from(locations).where(eq(locations.projectId, projectId)),
        db.select().from(scenes)
          .where(and(eq(scenes.projectId, projectId), lt(scenes.order, scene.order)))
          .orderBy(scenes.order)
      ]);
      
      context = {
        ...context,
        project: {
          title: project.title,
          logline: project.logline,
          theme: project.theme,
          genre: project.genre,
          synopsis: project.synopsis
        },
        characters: characters.map(c => ({
          name: c.name,
          role: c.role,
          motivation: c.motivation
        })),
        locations: locations.map(l => ({
          name: l.name,
          description: l.description
        })),
        previousScenes: previousScenes.map(s => ({
          title: s.title,
          summary: s.summary
        }))
      };
    }
    
    // Generiraj prompt
    const prompt = buildSceneSynopsisPrompt(context);
    
    // Pozovi AI
    const aiProvider = createAIProvider(
      process.env.AI_PROVIDER as 'openai' | 'anthropic' || 'openai',
      process.env.AI_API_KEY!
    );
    
    const generatedSynopsis = await aiProvider.generateText(prompt, context);
    
    return c.json({
      sceneId,
      generatedSynopsis,
      prompt: process.env.NODE_ENV === 'development' ? prompt : undefined
    });
    
  } catch (error) {
    console.error('Error generating scene synopsis:', error);
    return c.json({ error: 'Failed to generate synopsis' }, 500);
  }
});

// Helper funkcija za kreiranje prompta
function buildSceneSynopsisPrompt(context: any): string {
  let prompt = `Napiši sažetak za scenu "${context.sceneTitle}" koja je ${context.sceneOrder}. po redu.`;
  
  if (context.project) {
    prompt += `\n\nKontekst priče:`;
    prompt += `\nNaslov: ${context.project.title}`;
    prompt += `\nLogline: ${context.project.logline || 'N/A'}`;
    prompt += `\nTema: ${context.project.theme || 'N/A'}`;
    prompt += `\nŽanr: ${context.project.genre || 'N/A'}`;
  }
  
  if (context.characters?.length > 0) {
    prompt += `\n\nLikovi u priči:`;
    context.characters.forEach((char: any) => {
      prompt += `\n- ${char.name} (${char.role || 'uloga nepoznata'})`;
    });
  }
  
  if (context.previousScenes?.length > 0) {
    prompt += `\n\nPrethodni događaji:`;
    context.previousScenes.forEach((scene: any) => {
      prompt += `\n- ${scene.title}: ${scene.summary || 'bez sažetka'}`;
    });
  }
  
  prompt += `\n\nMolim napiši kratak ali detaljan sažetak scene (100-200 riječi) koji opisuje što se događa, tko sudjeluje i kako scena doprinosi razvoju priče.`;
  
  return prompt;
}
```

#### Zadatak 3.4: Proof of Concept ruta
**Tehnički detalji:**
```typescript
// POST /api/ai/test - za testiranje AI integracije
app.post('/api/ai/test', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { prompt, provider = 'openai' } = body;
    
    if (!prompt) {
      return c.json({ error: 'Prompt is required' }, 400);
    }
    
    const aiProvider = createAIProvider(
      provider,
      process.env.AI_API_KEY!
    );
    
    const response = await aiProvider.generateText(prompt);
    
    return c.json({
      prompt,
      response,
      provider,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI test error:', error);
    return c.json({ error: 'AI test failed' }, 500);
  }
});
```

#### Zadatak 3.5: Frontend integracija
**Tehnički detalji:**
1. Dodati u `ui/src/lib/serverComm.ts`:
```typescript
export const api = {
  // ... postojeće metode ...
  
  generateSceneSynopsis: async (
    projectId: string, 
    sceneId: string, 
    includeFullContext: boolean = true
  ): Promise<{ sceneId: string; generatedSynopsis: string }> => {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/ai/generate-scene-synopsis`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ sceneId, includeFullContext })
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to generate synopsis');
    }
    
    return response.json();
  },
  
  testAI: async (prompt: string, provider: string = 'openai'): Promise<any> => {
    const response = await fetch(`${API_URL}/api/ai/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ prompt, provider })
    });
    
    if (!response.ok) {
      throw new Error('AI test failed');
    }
    
    return response.json();
  }
};
```

2. Implementirati UI gumb u `Phase5Form.tsx` za generiranje sažetka scene

### Cilj B: Hibridni Agent Orkestrator

#### Zadatak 3.6: Arhitektura za orkestrator
**Tehnički detalji:** Vidjeti sekciju ispod

#### Zadatak 3.7: LocalLLMProvider implementacija
**Tehnički detalji:**
```typescript
// server/src/services/ai.service.ts - dodati:
export class LocalLLMProvider implements AIProvider {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }
  
  async generateText(prompt: string, context?: Record<string, any>): Promise<string> {
    // Implementacija za Ollama API ili slično
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.response;
  }
}
```

#### Zadatak 3.8: OrchestratorService klasa
**Tehnički detalji:**
```typescript
export class OrchestratorService {
  private localLLM: AIProvider;
  private externalLLM: AIProvider;
  
  constructor(localLLM: AIProvider, externalLLM: AIProvider) {
    this.localLLM = localLLM;
    this.externalLLM = externalLLM;
  }
  
  async generateWithOrchestration(
    task: string, 
    fullContext: Record<string, any>
  ): Promise<string> {
    // Korak 1: Lokalni model generira optimalni prompt
    const orchestratorPrompt = `
      Ti si AI orkestrator. Tvoj zadatak je analizirati kontekst i kreirati 
      savršen prompt za vanjski AI model.
      
      Zadatak: ${task}
      Kontekst: ${JSON.stringify(fullContext, null, 2)}
      
      Generiraj detaljan, specifičan prompt koji će vanjski model koristiti.
    `;
    
    const optimizedPrompt = await this.localLLM.generateText(orchestratorPrompt);
    
    // Korak 2: Vanjski model generira finalni sadržaj
    const finalContent = await this.externalLLM.generateText(optimizedPrompt);
    
    return finalContent;
  }
}
```

#### Zadatak 3.9: API ruta za orkestrator
**Tehnički detalji:**
```typescript
// POST /api/projects/:projectId/ai/orchestrate
app.post('/api/projects/:projectId/ai/orchestrate', async (c) => {
  // Slična logika kao za generate-scene-synopsis
  // ali koristi OrchestratorService
});
```

## Environment Varijable

Dodati u `.env`:
```env
# AI Provider Configuration
AI_PROVIDER=openai # ili 'anthropic'
AI_API_KEY=your-api-key-here

# Local LLM Configuration (za buducnost)
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama3
```

## 4. Multi-User Podrška - IMPLEMENTIRANO ✅

### Zadatak 4.1: Proširenje users tablice ✅
**Implementirano:**
```typescript
// server/src/schema/schema.ts
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Zadatak 4.2-4.3: User API endpoint-i ✅
**Implementirano:**
- `PUT /api/user` - ažuriranje korisničkih podataka
- `DELETE /api/user` - brisanje korisničkog računa
- Dodano u `ui/src/lib/serverComm.ts` kao `updateUser()` i `deleteUser()`

### Zadatak 4.4: UserProfileForm komponenta ✅
**Implementirano:**
- Kompletan form za upravljanje korisničkim profilom
- Integracija s Zustand store-om
- Validacija i error handling
- Mogućnost brisanja računa s potvrdom

### Zadatak 4.5: ProtectedRoute komponenta ✅
**Implementirano:**
- Wrapper komponenta za zaštićene rute
- Automatsko preusmjeravanje na login
- Loading state handling

### Zadatak 4.6: Zustand store ✅
**Implementirano:**
- `ui/src/stores/userStore.ts`
- Persistent storage korisničkih podataka
- TypeScript tipovi za UserProfile

### Zadatak 4.7: Token caching ✅
**Implementirano:**
- 5-minutni cache Firebase tokena
- `clearTokenCache()` funkcija za cleanup
- Performance optimizacija API poziva

### Zadatak 4.8: RegisterForm komponenta ✅
**Implementirano:**
- Kompletan registracijski form
- Validacija lozinki i email adresa
- Integracija s Firebase Auth
- Prebacivanje između login/register forma

### Zadatak 4.9: Session timeout ✅
**Implementirano:**
- `ui/src/hooks/useSessionTimeout.ts`
- 30-minutni timeout s 5-minutnim upozorenjem
- Automatski logout pri isteku
- Activity tracking za reset timeout-a

### Zadatak 4.10: Integracija komponenti ✅
**Implementirano:**
- UserProfileForm integriran u Settings stranicu
- RegisterForm integriran u LoginForm
- Session timeout aktiviran u App.tsx
- Ažurirani postojeći UI elementi

## Best Practices

### Multi-User Arhitektura
- Svi API pozivi provjeravaju vlasništvo resursa
- Firebase Auth tokeni se cachiraju za performance
- Zustand store za client-side state management
- Session timeout za sigurnost
- Graceful error handling s korisnim porukama

### AI Integracija
- Svi AI pozivi trebaju imati timeout (30 sekundi)
- Implementirati retry logiku za AI pozive
- Dodati rate limiting za AI endpoint-e
- Cachirati AI odgovore gdje je to moguće
- Logirati sve AI pozive za analizu troškova
- Implementirati graceful degradation ako AI nije dostupan

### Error Handling
- Koristiti custom error klase
- Logirati sve greške s kontekstom
- Vratiti korisne error poruke klijentima
- Implementirati circuit breaker za vanjske servise

### Tipizacija
- Izbjegavati `any` tipove
- Koristiti strict TypeScript konfiguraciju
- Validirati sve externe inpute
- Dokumentirati sve public API-je
