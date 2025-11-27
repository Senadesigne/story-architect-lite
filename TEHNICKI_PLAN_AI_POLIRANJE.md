# Tehnički Plan: AI Poliranje i UX Poboljšanja

Ovaj dokument definira plan za rješavanje problema konteksta, separacije modova i UI konzistentnosti u Story Architect Lite aplikaciji.

## 1. Totalna Separacija Brainstorming Moda

### Problem
Trenutno se `brainstormingMessages` niz dijeli između Planner i Studio moda. Korisnik vidi iste brainstorming poruke u oba konteksta, što narušava organizaciju ideja.

### Rješenje
Razdvojiti stanje brainstorminga na dva zasebna niza unutar `PlannerAIState`.

### Plan Izmjena

#### 1.1. `ui/src/stores/plannerAIStore.ts`
*   **State Interface (`PlannerAIState`):**
    *   Ukloniti `brainstormingMessages: ChatMessage[]`.
    *   Dodati `plannerBrainstormingMessages: ChatMessage[]`.
    *   Dodati `studioBrainstormingMessages: ChatMessage[]`.
*   **Actions (`sendMessage`, `clearMessages`):**
    *   Ažurirati logiku odabira niza poruka.
    *   Umjesto jednostavnog `if (mode === 'brainstorming')`, potrebno je provjeriti i kontekst (ili dodati novi parametar `contextType` u store, ili izvesti zaključak iz postojećeg `context` stringa).
    *   **Prijedlog:** Dodati `isStudio: boolean` u `PlannerAIState` koji se postavlja prilikom `openModal` ili inicijalizacije.

#### 1.2. `ui/src/components/planner/AIChatSidebar.tsx`
*   **Selekcija Poruka:**
    *   Ažurirati logiku `const messages = ...`.
    *   Ako je mod `brainstorming`:
        *   Ako je `isStudioMode` (već postoji u komponenti via `useLocation`), koristi `studioBrainstormingMessages`.
        *   Inače koristi `plannerBrainstormingMessages`.
*   **Slanje Poruka:**
    *   Osigurati da `sendMessage` zna u kojem smo kontekstu (ovo je već riješeno ako store ima `isStudio` ili ako se logika prebaci u store).

---

## 2. Implementacija "Konceptualne Memorije" (Context Window)

### Problem
Brainstorming mod je "One-shot" i ne pamti prethodne poruke, što onemogućuje konverzacijski tok.

### Rješenje
Slanje povijesti razgovora (zadnjih N poruka) backendu i uključivanje istih u prompt za OpenAI.

### Plan Izmjena

#### 2.1. `server/src/services/ai/graph/nodes.ts`
*   **Funkcija `generateDraftNode`:**
    *   Locirati dio koda za `state.mode === 'brainstorming'`.
    *   Dohvatiti `state.messages` (LangGraph već prati povijest ako je konfiguriran).
    *   **Filtriranje:** Uzeti zadnjih 10 poruka (kako bi se izbjeglo prekoračenje token limita).
    *   **Formatiranje:** Serializirati poruke u string format (npr. "User: ...\nAssistant: ...").
    *   **Prompt Injection:** Ubaciti formatiranu povijest u `systemPrompt` ili na početak korisničkog upita.
    *   *Primjer logike:*
        ```typescript
        const history = state.messages.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
        systemPrompt = `You are a helpful assistant.\n\nPREVIOUS CONVERSATION:\n${history}\n\nCURRENT REQUEST:\n${state.userInput}`;
        ```

---

## 3. LangChain Analiza vs. Product Brief

### Analiza
Usporedba trenutne implementacije (`graph.ts`, `nodes.ts`) s arhitekturom opisanom u `TEHNICKI_PLAN_AI_FAZA_B_v2.md` (koji detaljizira "Planner Mentor" flow).

### Nalazi
1.  **Struktura Grafa:** Trenutni graf (`graph.ts`) vjerno prati specifikaciju. Čvorovi (`transform_query`, `retrieve_context`, `route_task`, `generate_draft`, `critique_draft`, `refine_draft`) i rubovi (uključujući `reflection` petlju) su ispravno implementirani.
2.  **Uloge Agenata (Provideri):**
    *   **Specifikacija:** Predviđa korištenje **Lokalnog LLM-a (Ollama)** za uloge "Mentora" (Transformacija, Routing, Kritika) radi uštede troškova i "guardrailinga".
    *   **Implementacija:** Trenutno koristi **Cloud LLM (Anthropic)** za *sve* čvorove.
    *   **Zaključak:** Logički slijed ("Planner Mentor" proces) je ispravan i prati brief. Odstupanje je isključivo u *izboru providera*, što je dokumentirano kao privremena mjera ("Zadatak 4.4") dok lokalni LLM ne bude spreman.
3.  **Brainstorming:** Brainstorming mod je naknadno dodan kao "bypass" standardnog toka (preskače kritiku), što je validno proširenje za taj specifičan use-case.

---

## 4. UI Konzistentnost (Button Placement)

### Problem
Gumb "Brainstorming" mijenja poziciju ovisno o modu (Planner vs Studio), što zbunjuje korisnika.

### Rješenje
Fiksirati poziciju gumba za konzistentno iskustvo.

### Plan Izmjena

#### 4.1. `ui/src/components/planner/AIChatSidebar.tsx`
*   **Raspored Gumba:**
    *   Definirati fiksni poredak:
        1.  **Primarni Mod** (Planner ili Writer - ovisno o lokaciji)
        2.  **Brainstorming** (Uvijek desno/drugo mjesto)
*   **Implementacija:**
    *   Promijeniti JSX strukturu:
        ```tsx
        <div className="...">
            {/* Slot 1: Context Specific */}
            {!isStudioMode ? (
                <PlannerButton />
            ) : (
                <WriterButton />
            )}

            {/* Slot 2: Universal */}
            <BrainstormingButton />
        </div>
        ```
    *   Ovo osigurava da je "Brainstorming" uvijek na istoj relativnoj poziciji (drugi gumb), dok se prvi gumb mijenja ovisno o kontekstu.
