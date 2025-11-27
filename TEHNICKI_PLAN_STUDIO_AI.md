# Tehnički Plan: Nadogradnja AI Funkcionalnosti u Studio Modu

Ovaj dokument opisuje tehnički plan za implementaciju dualnog AI načina rada (Brainstorming i AI Writer) unutar Studio Moda aplikacije Story Architect Lite.

## 1. Frontend: Proširenje `usePlannerAIStore`

Potrebno je nadograditi globalni store kako bi podržavao nove funkcionalnosti i upravljanje stanjem za Studio mod.

### 1.1. Ažuriranje Interface-a
Datoteka: `ui/src/stores/plannerAIStore.ts`

*   **Proširiti `PlannerAIState` interface:**
    *   Ažurirati `mode` tip: `'planner' | 'brainstorming' | 'writer'`.
    *   Dodati `editorContent` (string | null) za čuvanje trenutnog teksta iz editora.
    *   Dodati `pendingGhostText` (string | null) za tekst koji se prikazuje u editoru ali nije potvrđen.

### 1.2. Ažuriranje Akcija
*   **`sendMessage` funkcija:**
    *   Ažurirati potpis funkcije da prihvaća opcionalni `currentEditorContent` argument.
    *   Uključiti `currentEditorContent` u API poziv (`api.chat`).
*   **Nove akcije:**
    *   `setEditorContent(content: string)`: Za sinkronizaciju stanja editora s AI store-om (opcionalno, ili prosljeđivanje pri slanju).
    *   `acceptGhostText()`: Prebacuje `pendingGhostText` u trajni sadržaj (poziva callback u editoru).
    *   `rejectGhostText()`: Čisti `pendingGhostText`.

## 2. Frontend: UI Promjene (`AIChatSidebar.tsx`)

### 2.1. Mode Selector
Datoteka: `ui/src/components/planner/AIChatSidebar.tsx`

*   Ukloniti uvjet `!isStudioMode` koji skriva selektor.
*   Implementirati logiku prikaza opcija ovisno o ruti:
    *   **Planner Mod**: Prikazuje "Planner" i "Brainstorming".
    *   **Studio Mod**: Prikazuje "Brainstorming" i "AI Writer".
*   Dodati vizualni indikator za "AI Writer" mod (npr. ikona olovke).

### 2.2. Prikaz Rezultata
*   Kada je mod "AI Writer", odgovor AI-a se prikazuje u chatu, ali se također aktivira "Pending Application" UI (slično kao u Planneru).
*   Dodati gumbove "Keep All", "Reject" i "Edit" u podnožju odgovora ili u posebnom panelu "Pending Changes".

## 3. Frontend: Integracija s Editorom (`StudioEditor.tsx`)

### 3.1. Prikaz Ghost Teksta
Datoteka: `ui/src/components/studio/StudioEditor.tsx`

*   Pretplatiti se na `pendingApplication` (ili `pendingGhostText`) iz `usePlannerAIStore`.
*   **Implementacija vizualizacije:**
    *   Koristiti Tiptap `Decoration` ili privremeni čvor za prikaz teksta koji čeka potvrdu.
    *   Stil: Sivi tekst (opacity 0.6) ili drugačija pozadina kako bi se razlikovao od trajnog teksta.
    *   Ovaj tekst ne smije biti dio `editor.getHTML()` izlaza dok se ne potvrdi.

### 3.2. Sinkronizacija
*   Kada korisnik klikne "Keep All" u Sidebaru:
    *   Pozvati funkciju u editoru koja pretvara ghost tekst u pravi tekst na trenutnoj poziciji kursora.
    *   Očistiti `pendingApplication` u store-u.

## 4. Backend: API Promjene (`api.ts`)

### 4.1. Proširenje `/chat` Rute
Datoteka: `server/src/api.ts` (ruta `/api/projects/:projectId/chat`)

*   Ažurirati validacijsku shemu (`ChatRequestBodySchema`) da prihvaća:
    *   `mode`: `'planner' | 'brainstorming' | 'writer'`
    *   `editorContent`: string (HTML ili tekst trenutne scene)
*   Proslijediti `editorContent` u `runStoryArchitectGraph`.

## 5. Backend: LangGraph Nadogradnja (`graph.ts`)

### 5.1. Proširenje Stanja (`AgentState`)
Datoteka: `server/src/services/ai/graph/state.ts`

*   Dodati `editorContent` u `AgentState`.
*   Dodati `writingStyle` (opcionalno) za analizu stila pisanja.

### 5.2. Nova Grana za Writer Mod
Datoteka: `server/src/services/ai/graph/graph.ts` & `nodes.ts`

*   **Ažurirati `routeTaskNode`:**
    *   Ako je `mode === 'writer'`, automatski usmjeriti na novu granu ili prilagođeni `generate_draft` čvor.
*   **Novi/Prilagođeni Čvorovi:**
    *   `analyze_editor_context`: Analizira prethodni tekst (stil, ton, zadnja rečenica) kako bi nastavak bio fluidan.
    *   `generate_story_continuation`: Specijalizirani prompt za pisanje proze (za razliku od planiranja).
        *   Prompt mora uzeti u obzir: Likove u sceni, trenutnu radnju i stil pisanja.

### 5.3. Workflow za Writer Mod
1.  **Input**: Korisnički zahtjev ("Opiši ulazak Ivana u sobu") + Editor Kontekst (prethodni paragrafi).
2.  **Analysis**: Analiza stila i konteksta.
3.  **Drafting**: Generiranje nastavka teksta.
4.  **Critique (Opcionalno)**: Provjera konzistentnosti s prethodnim tekstom.
5.  **Output**: Vraćanje generiranog teksta.

## Sažetak Toka Podataka

1.  **Korisnik** (Studio) -> Odabire "AI Writer" -> Upisuje "Napiši dijalog..."
2.  **Frontend** -> Šalje zahtjev na API s `prompt`, `mode='writer'`, `editorContent`.
3.  **Backend (API)** -> Pokreće LangGraph s novim kontekstom.
4.  **LangGraph** -> Detektira 'writer' mod -> Analizira tekst -> Generira nastavak.
5.  **Backend** -> Vraća generirani tekst.
6.  **Frontend (Store)** -> Sprema tekst u `pendingApplication`.
7.  **Frontend (Editor)** -> Prikazuje "Ghost Text" na kraju dokumenta.
8.  **Korisnik** -> Klikne "Keep All".
9.  **Frontend** -> Tekst postaje trajan.
