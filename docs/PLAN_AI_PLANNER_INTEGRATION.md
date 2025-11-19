# Tehnički Plan: AI Assistant Modal za Planner Mod

## Pregled

Ovaj dokument opisuje tehnički plan za integraciju Context-Aware AI Modal funkcionalnosti u Planner mod aplikacije Story Architect Lite. Plan se temelji na odabranoj strategiji "Context-Aware Floating Card" gdje korisnik klika na Magic Icon (✨) pored specifičnog polja za otvaranje lebdećeg AI chat prozora.

## 1. Analiza Postojećeg Stanja

### 1.1 Backend AI Arhitektura

#### LangGraph Implementacija (`server/src/services/ai/graph/`)
- **graph.ts**: Definira StateGraph s čvorovima za različite zadatke
- **nodes.ts**: Implementira čvorove za RAG, routing, generiranje i modificiranje teksta
- **state.ts**: Definira AgentState strukturu

#### Ključne Komponente:
1. **routeTaskNode**: Već podržava klasifikaciju zadataka u kategorije:
   - `simple_retrieval`: Dohvaćanje informacija iz konteksta
   - `creative_generation`: Kreiranje novog sadržaja
   - `text_modification`: Modificiranje postojećeg teksta
   - `cannot_answer`: Kada ne može odgovoriti

2. **ContextBuilder**: Gradi kontekst priče iz baze podataka
   - `buildProjectContext`: Dohvaća sve podatke projekta
   - `formatProjectContextToString`: Formatira kontekst za AI

3. **Chat API Endpoint**: `/api/projects/:projectId/chat`
   - Prima `userInput`
   - Koristi `runStoryArchitectGraph`
   - Vraća `finalState` s `finalOutput`

### 1.2 Frontend Integracija

#### Studio Mod Komponente:
- **CommandBar**: Chat input na dnu ekrana
- **FloatingMenuUI**: Dropdown menu za AI akcije na selektiranom tekstu
- Oba koriste `api.chat()` za komunikaciju s backendom

#### Planner Mod Komponente:
- **Phase Forms**: Svaka faza ima svoju formu (Phase2Form, Phase3Form, itd.)
- Forme koriste `onFieldChange` callback za autosave
- Trenutno nema AI integracije

## 2. Backend Plan

### 2.1 Proširenje Postojećeg Grafa

**STRATEGIJA: Reuse postojećih čvorova s kontekst-aware promptovima**

Postojeći `StoryArchitectGraph` može se iskoristiti bez modifikacija. Ključ je u pametnom korištenju `userInput` parametra koji će sadržavati:
1. Kontekst polja (npr. "planner_logline", "planner_character_motivation")
2. Trenutnu vrijednost polja
3. Korisničku instrukciju

### 2.2 Novi Prompt Templates

Kreirati novi servis `server/src/services/planner.prompt.service.ts`:

```typescript
export class PlannerPromptService {
  static buildContextAwarePrompt(
    fieldContext: string,
    currentValue: string,
    userInstruction: string,
    projectContext: ProjectContext
  ): string {
    // Generiraj prompt specifičan za kontekst
    // Primjer za "logline":
    // "Ti si ekspert za pisanje loglinea. Trenutni logline: [currentValue]. 
    //  Korisnik traži: [userInstruction]. Kontekst priče: [projectContext]"
  }
  
  static getFieldPromptTemplate(fieldType: string): string {
    // Vraća template za specifično polje
  }
}
```

### 2.3 Modificiranje Route Task Node

Dodati prepoznavanje planner konteksta u `routeTaskNode`:

```typescript
// U systemskom promptu dodati:
KORAK 0.5: PROVJERA PLANNER KONTEKSTA
- Ako userInput počinje s "planner_" prefixom, to je zahtjev iz Planner moda
- Ekstraktiraj tip polja (npr. "planner_logline" → logline)
- Za generiranje ili modificiranje postojećeg sadržaja → "creative_generation"
- Za pitanja o postojećem sadržaju → "simple_retrieval"
```

### 2.4 API Endpoint Modifikacije

Postojeći `/api/projects/:projectId/chat` endpoint može ostati isti, ali treba podržati chat history.

**Opcija 1: Proširenje postojećeg endpointa (Preporučeno)**
```typescript
// Request body
{
  userInput: string; // Trenutna korisnička poruka
  context: {
    fieldType: string; // 'logline' | 'character_motivation' etc.
    currentValue: string; // Trenutna vrijednost polja
  };
  messages?: Array<{role: 'user' | 'assistant', content: string}>; // Chat history (opcionalno)
}

// Response
{
  finalOutput: string; // AI odgovor
  // ... ostali AgentState podaci
}
```

**Opcija 2: Koristiti postojeći format s chat history u userInput**
```typescript
{
  userInput: `planner_${fieldType}|${currentValue}|${JSON.stringify(messages)}|${userInstruction}`
}
```

**Backend Modifikacije:**
- `runStoryArchitectGraph` treba primati i chat history
- Ako postoji chat history, dodati ga u `storyContext` ili koristiti za kontekstualni prompt
- LangGraph čvorovi moraju imati pristup prethodnim porukama za bolji kontekst

## 3. Frontend Plan

### 3.1 Nova Modal Komponenta - Split View Layout s Chat History

Kreirati `ui/src/components/planner/AIAssistantModal.tsx`:

```typescript
interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldContext: {
    type: string; // 'logline' | 'character_name' | 'location_description' etc.
    label: string; // Prikazano ime polja
    currentValue: string;
  };
  onApply: (newValue: string, mode: 'replace' | 'append') => void;
  projectId: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

**Layout Struktura (Poboljšani Split View):**

Modal je podijeljen u dva glavna dijela:

1. **Gornji dio (Chat History & Output sekcija):**
   - Scrollable container za prikaz razgovora
   - Prikazuje sve poruke u razgovoru (korisnikove i AI odgovore)
   - Korisnikove poruke: prikazane s "user" stilom (npr. desno, plava pozadina)
   - AI poruke: prikazane s "assistant" stilom (npr. lijevo, siva pozadina)
   - **Zadnja AI poruka** je ona koja se razmatra za Apply/Append akcije
   - Loading indikator se prikazuje dok AI generira odgovor
   - Error poruke se prikazuju kao assistant poruke s error stilom

2. **Donji dio (Input & Actions sekcija):**
   - Input polje za pisanje nove poruke
   - Placeholder tekst: "Napiši poruku..." ili specifičan za kontekst
   - Submit gumb (Send ikona) za slanje poruke
   - **Akcije uz Input:**
     - "Apply" (Zamijeni) gumb - zamjenjuje trenutnu vrijednost polja tekstom iz **posljednje assistant poruke**
     - "Append" (Dodaj) gumb - dodaje tekst iz **posljednje assistant poruke** na kraj postojećeg
   - Oba gumba su vidljiva samo kada postoji barem jedna assistant poruka u chatu
   - Gumbi su disabled tijekom loading stanja

**Funkcionalnosti:**
- **Chat History**: Korisnik može voditi razgovor s AI-em (dati povratnu informaciju, tražiti izmjene)
- **Kontekstualni Razgovor**: AI ima pristup svim prethodnim porukama u sesiji
- **Apply/Append na Zadnju Poruku**: Akcije se uvijek odnose na posljednju assistant poruku u chatu
- Prikazuje kontekst trenutnog polja u headeru modala (npr. "AI Asistent za: Logline")
- Loading stanje tijekom AI generiranja (disablirani input i submit gumb)
- Error handling s prikazom poruke greške kao assistant poruke
- Reset funkcionalnost za novi zahtjev (clear chat history)

**Vizualni Layout:**
```
┌─────────────────────────────────────┐
│  AI Asistent za: [Field Label]  [X] │
├─────────────────────────────────────┤
│  [Chat History - Scrollable]        │
│                                     │
│  User: "Daj mi ideju za logline"   │
│  AI:   "Evo nekoliko ideja..."      │
│  User: "Nije dobro, napravi mračnije"│
│  AI:   "Evo mračnije verzije..."    │ ← Ova poruka se koristi za Apply/Append
│                                     │
├─────────────────────────────────────┤
│  [Input polje]                      │
│  "Napiši poruku..."                 │
│  [Send] [Loading...]                │
│                                     │
│  [Apply] [Append]                   │
└─────────────────────────────────────┘
```

### 3.2 Magic Icon Komponenta

Kreirati `ui/src/components/planner/MagicIcon.tsx`:

```typescript
interface MagicIconProps {
  fieldType: string;
  fieldLabel: string;
  currentValue: string;
  onApply: (value: string) => void;
}
```

Funkcionalnosti:
- Renderira ✨ ikonu pored input polja
- Otvara AIAssistantModal na klik
- Proslijeđuje kontekst modalu

### 3.3 Integracija u Phase Forme

Modificirati postojeće Phase forme da uključe MagicIcon:

```typescript
// Primjer za Phase2Form
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label htmlFor="brainstorming">Brainstorming</Label>
    <MagicIcon
      fieldType="brainstorming"
      fieldLabel="Brainstorming"
      currentValue={formData.brainstorming}
      onApply={(value) => onFieldChange('brainstorming', value)}
    />
  </div>
  <Textarea ... />
</div>
```

### 3.4 Zustand Store za AI Modal State

Kreirati `ui/src/stores/aiModalStore.ts`:

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface AIModalState {
  isOpen: boolean;
  fieldContext: {
    type: string;
    label: string;
    currentValue: string;
  } | null;
  
  // Chat History - niz svih poruka u razgovoru
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  openModal: (context: FieldContext) => void;
  closeModal: () => void;
  addMessage: (message: ChatMessage) => void;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Helper za dobivanje posljednje assistant poruke (za Apply/Append)
  getLastAssistantMessage: () => ChatMessage | null;
  reset: () => void;
}
```

**Ključne Funkcionalnosti Store-a:**

1. **Chat History Management:**
   - `messages` array čuva sve poruke u razgovoru (korisnikove i AI odgovore)
   - `addUserMessage()` - dodaje korisničku poruku i automatski šalje zahtjev backendu
   - `addAssistantMessage()` - dodaje AI odgovor nakon što backend vrati rezultat

2. **Apply/Append Logika:**
   - `getLastAssistantMessage()` - vraća posljednju assistant poruku iz `messages` arraya
   - Apply/Append akcije koriste `content` iz posljednje assistant poruke
   - Ako nema assistant poruka, Apply/Append gumbovi su disabled

3. **State Management:**
   - `openModal()` - otvara modal i postavlja field context, resetira chat history
   - `closeModal()` - zatvara modal, ali zadržava chat history (za slučaj ponovnog otvaranja)
   - `reset()` - potpuno resetira stanje (koristi se za novi zahtjev ili zatvaranje modala)

**Napomena:** Store mora pamtiti kompletan niz poruka kako bi AI backend mogao koristiti kontekst prethodnih poruka u razgovoru. Ovo omogućava korisniku da daje povratnu informaciju i traži izmjene u iterativnom procesu.

**Primjer Korištenja:**
```typescript
// Korisnik šalje prvu poruku
store.addUserMessage("Daj mi ideju za logline");
// Backend vraća odgovor
store.addAssistantMessage("Evo nekoliko ideja...");

// Korisnik daje povratnu informaciju
store.addUserMessage("Nije dobro, napravi to mračnije");
// Backend vraća poboljšanu verziju
store.addAssistantMessage("Evo mračnije verzije...");

// Korisnik klikne "Apply" - uzima se posljednja assistant poruka
const lastMessage = store.getLastAssistantMessage();
onApply(lastMessage.content, 'replace');
```

## 4. Implementacijski Zadaci

### Faza 1: Backend Priprema (1 dan)
- [ ] **Zadatak 1.1**: Kreirati `planner.prompt.service.ts` s prompt template sustavom
- [ ] **Zadatak 1.2**: Dodati planner kontekst prepoznavanje u `routeTaskNode`
- [ ] **Zadatak 1.3**: Kreirati unit testove za nove prompt servise

### Faza 2: Frontend Modal Infrastruktura (2 dana)
- [ ] **Zadatak 2.1**: Implementirati `AIAssistantModal` komponentu s Split View layoutom (Chat History gore, Input & Actions dolje)
- [ ] **Zadatak 2.2**: Kreirati `MagicIcon` komponentu (Trigger)
- [ ] **Zadatak 2.3**: Postaviti `aiModalStore` za state management s chat history podrškom (messages array)
- [ ] **Zadatak 2.4**: Dodati stiliziranje (Tailwind + ShadCN) - Split View dizajn s chat history sekcijom
- [ ] **Zadatak 2.5**: Implementirati logiku Apply/Append koja koristi posljednju assistant poruku iz messages arraya

### Faza 3: Integracija u Planner Forme (2 dana)
- [ ] **Zadatak 3.1**: Integrirati MagicIcon u `Phase1Form` (Ideation)
- [ ] **Zadatak 3.2**: Integrirati u `Phase2Form` (Planning)
- [ ] **Zadatak 3.3**: Integrirati u `Phase3Form` (Worldbuilding)
- [ ] **Zadatak 3.4**: Integrirati u `Phase4Form` (Characters)
- [ ] **Zadatak 3.5**: Integrirati u `Phase5Form` (Structure)
- [ ] **Zadatak 3.6**: Integrirati u `Phase6Form` (Finalization)

### Faza 4: Testiranje i Optimizacija (1 dan)
- [ ] **Zadatak 4.1**: E2E testiranje cijelog AI flow-a
- [ ] **Zadatak 4.2**: Optimizacija prompt template-a
- [ ] **Zadatak 4.3**: Error handling i retry logika
- [ ] **Zadatak 4.4**: Performance optimizacija

## 5. Ključne Prednosti Ovog Pristupa

1. **Minimalne Backend Promjene**: Koristi postojeću LangGraph arhitekturu
2. **Kontekst-Aware**: AI zna točno o kojem polju se radi
3. **Fleksibilnost**: Korisnik može birati između "Replace" i "Append"
4. **Skalabilnost**: Lako se dodaju nova polja
5. **Konzistentnost**: Isti AI engine kao u Studio modu

## 6. Potencijalni Izazovi

1. **Prompt Engineering**: Kreiranje kvalitetnih promptova za svako polje
2. **UI/UX**: Balansiranje između jednostavnosti i funkcionalnosti
3. **Performance**: Modal ne smije usporiti autosave funkcionalnost
4. **Context Limits**: Veliki projekti mogu premašiti token limite

## 7. Budući Razvoj

Nakon uspješne implementacije, moguća proširenja:
- Batch AI operacije (npr. generiraj sve opise likova)
- Template sustav za česte zahtjeve
- AI sugestije u realnom vremenu (kao GitHub Copilot)
- Integracija s vanjskim knowledge bazama

## Zaključak

Ovaj plan omogućava elegantnu integraciju AI funkcionalnosti u Planner mod s minimalnim promjenama postojeće arhitekture. Fokus je na reusability i user experience, omogućavajući korisnicima da dobiju AI pomoć točno kada im je potrebna, bez napuštanja trenutnog konteksta rada.
