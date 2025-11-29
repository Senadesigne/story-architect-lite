# Tehnički Plan: Contextual Editing (Manager-Worker Flow)

Ovaj dokument definira tehničku implementaciju za **Contextual Editing** (Točka 6.2), gdje Manager (Local LLM) orkestrira izmjene specifičnih dijelova teksta koje izvršava Worker (Remote LLM).

## 1. Pregled Flow-a

1.  **Frontend:** Korisnik selektira tekst -> Floating Menu -> "Promijeni" -> API Request.
2.  **Backend (Manager):** Prima puni tekst + selekciju. Kreira prompt za Workera.
3.  **Backend (Worker):** Generira zamjenski tekst.
4.  **Frontend:** Prikazuje "Diff" ili opciju "Keep/Discard".

---

## 2. Frontend Implementacija (`client`)

### 2.1. Proširenje API Poziva
Potrebno je nadograditi `api.chat` i `FloatingMenuUI` da šalju selekciju i puni kontekst.

*   **Datoteka:** `ui/src/lib/serverComm.ts`
*   **Promjena:** Dodati `selection` polje u `chat` funkciju.
    ```typescript
    export async function chat(projectId: string, data: {
      // ... postojeća polja
      selection?: string; // NOVO: Selektirani tekst
    })
    ```

### 2.2. Floating Menu Logika
*   **Datoteka:** `ui/src/components/studio/FloatingMenuUI.tsx`
*   **Promjena:**
    *   Dohvatiti puni tekst editora (`editor.getHTML()` ili `editor.getText()`).
    *   Poslati zahtjev s `mode: 'contextual-edit'`.
    *   **UI za Review:**
        *   Prikazati rezultat (AI Output) u privremenom stanju (npr. Ghost Text ili Popover).
        *   **Gumbi:**
            *   `Keep All`: Trajno primjenjuje promjenu (`insertContent`).
            *   `Ponovo promjeni` (Retry): Ponovno šalje ISTI zahtjev (s istom selekcijom) API-ju.
            *   (Implicitno): Klik izvan ili Esc poništava sve.

---

## 3. Backend Implementacija (`server`)

### 3.1. Schema & Validation
*   **Datoteka:** `server/src/schemas/validation.ts`
*   **Zadatak:** Dodati `selection` (string, optional) u `ChatRequestBodySchema`.

### 3.2. Agent State
*   **Datoteka:** `server/src/services/ai/graph/state.ts`
*   **Zadatak:**
    *   Dodati `selection?: string` u `AgentState`.
    *   Ažurirati `createInitialState` da prihvaća `selection`.

### 3.3. Graph Logic (Manager Node)
Ne trebamo nužno novi *fizički* čvor ako `managerContextNode` može podnijeti logiku, ali radi čistoće možemo ga logički odvojiti unutar istog čvora ili kreirati `manager_edit_node`.
**Preporuka:** Proširiti `managerContextNode` jer mu je uloga "Analiza i priprema prompta".

*   **Datoteka:** `server/src/services/ai/graph/nodes.ts`
*   **Logika (`managerContextNode`):**
    *   Ako je `state.mode === 'contextual-edit'`:
        *   **Input:** `state.editorContent` (Puni tekst), `state.selection` (Dio za izmjenu), `state.userInput` (Instrukcija).
        *   **Manager Prompt (Local LLM):**
            > "Ti si Urednik. Korisnik želi promijeniti dio teksta.
            > **Kontekst (Cijela priča):** ...
            > **Selektirani dio:** [SELECTION]
            > **Instrukcija:** [USER_INPUT]
            > **Zadatak:** Napiši prompt za Pisca (Workera) da napiše zamjenu za selektirani dio.
            > **Ključno:** Nova verzija se mora gramatički i stilski uklopiti u ostatak teksta (prije i poslije selekcije)."

### 3.4. Graph Logic (Worker Node)
*   **Datoteka:** `server/src/services/ai/graph/nodes.ts`
*   **Logika (`workerGenerationNode`):**
    *   Ostaje isti. Prima `workerPrompt` i generira tekst.
    *   U ovom slučaju, generirat će *samo* zamjenski segment.

---

## 4. Prompt Engineering (Detalji)

### Manager Prompt (Template)
```text
Ti si Glavni Urednik. Tvoj cilj je usmjeriti Pisca (Workera) da napravi preciznu izmjenu u tekstu.

1. ANALIZA:
   - Pročitaj PUNI TEKST da shvatiš ton, stil i radnju.
   - Fokusiraj se na SELEKTIRANI DIO koji treba mijenjati.

2. KONTEKST:
   - Puni tekst: """${state.editorContent}"""
   - Selektirani dio: """${state.selection}"""

3. KORISNIČKI ZAHTJEV:
   "${state.userInput}"

4. TVOJ ZADATAK:
   Napiši instrukciju (Prompt) za Pisca.
   - Reci Piscu točno što da napiše.
   - Upozori ga da pazi na "šavove" (kako se tekst spaja s onim prije i poslije).
   - Neka generira SAMO novi tekst zamjene, bez komentara.

OUTPUT (Samo prompt za pisca):
```

### Worker Prompt (Generiran od Managera)
Očekujemo da Manager generira nešto poput:
> "Napiši zamjenu za odlomak gdje Marko ulazi u sobu. Umjesto da bude ljut, neka bude tužan. Pazi da se tekst nastavlja na rečenicu 'Vrata su zaškripala...' i završava prije 'Sjeo je na stolac'. Tekst mora biti u noir stilu."

---

## 5. Sažetak Pitanja

*   **Kako ćemo proslijediti selekciju i puni tekst?**
    *   Putem `POST /chat` body-ja: `{ userInput, editorContent, selection, mode: 'contextual-edit' }`.
*   **Trebamo li novi čvor?**
    *   **Ne nužno.** Možemo proširiti `managerContextNode` s novim `if (mode === 'contextual-edit')` blokom. To je elegantnije jer Manager i dalje radi istu stvar: *priprema kontekst*.
*   **Kako će izgledati Managerov prompt?**
    *   Fokusiran na "Contextual Awareness". Mora vidjeti *gdje* se selekcija nalazi u *punom tekstu* (iako mu šaljemo samo stringove, LLM je dobar u pattern matchingu).
    *   *Napredna opcija:* Ako je tekst predug, frontend može poslati "surrounding context" (npr. 500 znakova prije i poslije) umjesto cijelog teksta, radi uštede tokena. Za početak, šaljemo sve (ili limitirano na X znakova).
