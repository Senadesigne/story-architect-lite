# Tehnički Plan V2: Manager-Worker AI Arhitektura

Ovaj dokument definira novu arhitekturu za AI backend, prelazeći s jednostavnog "Chat" pristupa na **"Manager-Worker" (Agentic)** model.

## 1. Arhitektura: Manager-Worker

Cilj je optimizirati troškove i kvalitetu, te pripremiti sustav za lokalni LLM.

### Uloge

| Uloga | Model (Trenutno) | Model (Cilj) | Zadaci |
| :--- | :--- | :--- | :--- |
| **Manager** | Claude 3 Haiku | Local LLM (RTX 8000) | 1. Analiza konteksta (Faze 1-6)<br>2. Izrada prompta za Workera<br>3. Konceptualna memorija (Brainstorming)<br>4. Kritika i provjera |
| **Worker** | Claude 3.5 Sonnet / GPT-4o | Claude 3.5 Sonnet / GPT-4o | 1. Generiranje teksta isključivo na temelju uputa Managera |

### Konfiguracija
*   Dodati podršku za `MANAGER_AI_PROVIDER` i `WORKER_AI_PROVIDER` u `.env`.
*   U `ai.factory.ts` omogućiti kreiranje providera specifično za ulogu.

---

## 2. Tokovi (Flows)

### 2.1. Writer Mode (Manager -> Worker -> Manager)

**Cilj:** Worker ne mora čitati cijelu knjigu (štednja tokena), već dobiva sažeti kontekst i precizne upute.

**Novi Graph Flow:**
1.  **`manager_context_node` (Novi čvor):**
    *   **Input:** `userInput`, `storyContext`, `editorContent`.
    *   **Action:** Manager analizira sve ulaze.
    *   **Output:** `workerPrompt` (detaljne instrukcije za Workera, sažeti kontekst).
2.  **`worker_generation_node` (Modificirani `generate_draft`):**
    *   **Input:** `workerPrompt`.
    *   **Action:** Worker generira tekst.
    *   **Output:** `draft`.
3.  **`manager_critique_node` (Postojeći `critique_draft`):**
    *   **Input:** `draft`, `storyContext`.
    *   **Action:** Manager analizira usklađenost s kontekstom.
    *   **Output:** `critique` (JSON).

### 2.2. Brainstorming Mode (Manager -> Worker)

**Cilj:** Manager drži "nit" razgovora i rješava problem amnezije.

**Novi Graph Flow:**
1.  **`manager_brainstorm_context_node` (Novi čvor):**
    *   **Input:** `userInput`, `messages` (povijest).
    *   **Action:** Manager čita povijest, sažima bitno ("Konceptualna Memorija") i formulira upit za Workera.
    *   **Output:** `workerPrompt`.
2.  **`worker_brainstorm_node` (Modificirani `generate_draft`):**
    *   **Input:** `workerPrompt`.
    *   **Action:** Worker generira ideju/odgovor.
    *   **Output:** `finalOutput`.

---

## 3. Plan Implementacije

### 3.1. Backend (`server/src/services/ai/`)

#### A. `ai.factory.ts` & `ai.service.ts`
*   [ ] Dodati `createManagerProvider()` i `createWorkerProvider()` funkcije.
*   [ ] Implementirati logiku za odabir modela iz konfiguracije.

#### B. `graph/state.ts`
*   [ ] Dodati `workerPrompt` u `AgentState` (string).
*   [ ] Dodati `managerAnalysis` u `AgentState` (opcionalno, za debug).

#### C. `graph/nodes.ts`
*   [ ] **Refaktorirati `generateDraftNode`:** Preimenovati u `workerGenerationNode` i pojednostaviti (samo prima prompt i generira).
*   [ ] **Kreirati `managerContextNode`:**
    *   Implementirati logiku za Writer mode (analiza konteksta -> prompt).
    *   Implementirati logiku za Brainstorming mode (analiza povijesti -> prompt).
*   [ ] **Ažurirati `critiqueDraftNode`:** Osigurati da koristi `createManagerProvider()`.

#### D. `graph/graph.ts`
*   [ ] Rekonstruirati graf da uključuje nove čvorove:
    *   `START` -> `transform_query` -> `retrieve_context` -> `route_task`
    *   `route_task` -> `manager_context_node` (umjesto direktno na generation)
    *   `manager_context_node` -> `worker_generation_node`
    *   `worker_generation_node` -> `critique_draft` (za Writer) ILI `final_output` (za Brainstorming)

---

## 4. UI i Ostalo (Zadržano iz V1)

*   **Separacija Brainstorming Poruka:** Implementirati `plannerBrainstormingMessages` i `studioBrainstormingMessages` u `plannerAIStore.ts`.
*   **UI Konzistentnost:** Fiksirati poziciju gumba u `AIChatSidebar.tsx`.

## 5. Buduća Nadogradnja (Local LLM)

*   Ova arhitektura omogućuje da u `.env` samo promijenimo `MANAGER_PROVIDER_URL` na `http://localhost:11434` (Ollama) i sustav nastavlja raditi bez promjene koda.
