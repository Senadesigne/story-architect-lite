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
*   [x] Dodati `createManagerProvider()` i `createWorkerProvider()` funkcije.
*   [x] Implementirati logiku za odabir modela iz konfiguracije.

#### B. `graph/state.ts`
*   [x] Dodati `workerPrompt` u `AgentState` (string).
*   [x] Dodati `managerAnalysis` u `AgentState` (opcionalno, za debug).

#### C. `graph/nodes.ts`
*   [x] **Refaktorirati `generateDraftNode`:** Preimenovati u `workerGenerationNode` i pojednostaviti (samo prima prompt i generira).
*   [x] **Kreirati `managerContextNode`:**
    *   Implementirati logiku za Writer mode (analiza konteksta -> prompt).
    *   Implementirati logiku za Brainstorming mode (analiza povijesti -> prompt).
*   [x] **Ažurirati `critiqueDraftNode`:** Osigurati da koristi `createManagerProvider()`.

#### D. `graph/graph.ts`
*   [x] Rekonstruirati graf da uključuje nove čvorove:
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

---

## 6. Faza 3: Advanced Editor Integration & Session Management

Ova faza fokusira se na dublju integraciju između Chata i "Papira" (Text Editora) te poboljšanje UX-a.

### 6.1. Dualni Output (Chat + Editor)
**Cilj:** Smanjiti potrebu za copy-pasteanjem. Tekst koji Worker generira u "Writer Mode-u" treba biti odmah dostupan u editoru.

*   **Implementacija:**
    *   Kada Worker generira tekst, on se prikazuje u Chat prozoru (kao i do sada).
    *   Istovremeno, tekst se šalje u Editor.
    *   **Strategija umetanja:**
        *   Ako je kursor u editoru: `insertAtCursor`.
        *   Ako nema kursora: `append` na kraj dokumenta.

### 6.2. Contextual Editing & Live Ghost Text Interaction
**Cilj:** Precizna AI intervencija na označenom dijelu teksta (bilo da je "pravi" tekst ili Ghost Text) uz mogućnost brzog generiranja novih verzija.

#### A. Live Ghost Text Interaction (NOVO)
**Problem:** Korisnik trenutno mora kliknuti "Keep All" da bi tekst postao "pravi" i da bi ga mogao označiti/mijenjati.
**Rješenje:**
1.  **Interaktivni Ghost Text:** Omogućiti da se Ghost Text ponaša kao "pravi" tekst za potrebe selekcije, *prije* nego što se prihvati.
2.  **Immediate Edit:** Kada korisnik označi dio Ghost Texta, odmah se pojavljuje `FloatingMenu` s opcijom "Edit" (i dropdownom: Skrati, Proširi, Promijeni ton...).
3.  **Paralelne Opcije:**
    *   **`Keep All` (Zadrži sve):** I dalje postoji i služi za prihvaćanje cijelog teksta (ako je korisnik zadovoljan).
    *   **`Edit Selection` (Uredi dio):** Nova opcija koja se pojavljuje na selekciju *unutar* Ghost Texta.

#### B. Backend Logika za "Edit Selection" unutar Ghost Texta
*   Backend mora primiti informaciju da se editira `pendingGhostText`.
*   **Input:** `fullGhostText` (kao kontekst), `selection` (dio koji se mijenja).
*   **Output:** Nova verzija `pendingGhostText` s promijenjenim dijelom.
*   **Rezultat:** Ghost Text se u editoru ažurira s novom verzijom, a korisnik i dalje ima opciju "Keep All" za tu *novu* verziju.

#### C. Contextual Edit Flow (Infinite Retry Loop)
**UX Flow:**
1.  **Trigger:** Korisnik označi dio teksta (Original ili Ghost) i klikne **"AI Akcije" -> "Prepravi"**.
2.  **Backend:** Manager-Worker generira zamjenu.
3.  **UI Rezultat:** Prikazuje se predložena izmjena.
4.  **KORISNIČKE OPCIJE:**
    *   **`Keep All`**: Trajno zamjenjuje tekst.
    *   **`Ponovo promjeni` (Retry)**: Generira novu verziju.
    *   **`Odbaci`**: Vraća na prethodno stanje.

### 6.3. Upravljanje Sesijama (Chat History)
**Cilj:** Bolja organizacija rada i mogućnost "resetiranja" mozga AI-a.

*   **Novi Chat (+):**
    *   **UI:** Gumb "**+**" u gornjem desnom kutu (pored "History" ikone).
    *   **Akcija:** Resetira `messages` array za trenutni mod i starta čisti kontekst.
    *   **Svrha:** Omogućuje korisniku da započne novu temu ili "tabula rasa" razgovor bez prtljage prethodnog konteksta.
*   **History Sidebar:**
    *   Lista prethodnih razgovora (dohvaćena iz lokalne Postgres baze).
    *   Automatsko imenovanje sesija (npr. "Brainstorming o liku Jojo", "Scena 3 draft").
    *   Mogućnost učitavanja stare sesije.

### 6.4. Token Economy & Local Storage
**Cilj:** Minimizirati troškove slanja povijesti vanjskom LLM-u.

*   **Pohrana:** Sva povijest chata (`messages`) sprema se **lokalno** u Postgres bazu.
*   **Manager (Lokalni LLM/Jeftini Model):**
    *   Jedini ima pristup punoj povijesti razgovora iz baze.
    *   Analizira povijest i izvlači samo bitne informacije ("Konceptualna Memorija").
*   **Worker (Skupi Model):**
    *   Ne prima cijelu povijest.
    *   Prima samo **sažeti prompt** od Managera.
    *   **Rezultat:** Drastična ušteda tokena jer se "teški" kontekst ne šalje na API svaki put.

### 6.4. Relokacija Selektora Modela
**Cilj:** Poboljšati ergonomiju.

*   **Promjena:**
    *   Ukloniti Dropdown za odabir "Workera" iz gornjeg dijela Sidebara.
    *   Premjestiti ga u **Input Area (Command Bar)**, pored gumba za slanje ili unutar input polja.
    *   Ovo čini odabir modela (npr. prebacivanje na "Haiku" za brza pitanja ili "Opus/GPT-4" za pisanje) bržim i intuitivnijim.
