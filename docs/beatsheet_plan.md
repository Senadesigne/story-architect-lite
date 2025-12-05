# Implementation Plan - Planner & Studio Integration

## 1. Analiza podataka (Data Analysis)

### Database Schema Changes
We need to introduce a hierarchy that doesn't currently exist in the database.
*   **New Table: `chapters`**
    *   `id`: UUID (PK)
    *   `projectId`: UUID (FK to `projects`)
    *   `title`: String (User defined name)
    *   `phase`: String (Enum/Const: 'setup', 'inciting_incident', 'midpoint', 'climax', 'falling_action')
    *   `order`: Integer
*   **Update Table: `scenes`**
    *   Add `chapterId`: UUID (FK to `chapters`, nullable but intended to be populated)

### Frontend Store (`studioStore.ts`)
*   Add `chapters: Chapter[]` to the state.
*   Add actions: `fetchChapters`, `createChapter`, `updateChapter`, `deleteChapter`.
*   Selectors/Getters: `getChaptersByPhase(phase)`, `getScenesByChapter(chapterId)`.

## 2. Refactoring Sidebara (Sidebar Refactoring)

### Component: `StudioSidebar.tsx`
We will transform the flat list into a nested tree structure.

*   **Level 1: Phases (Static)**
    *   We will iterate through a constant array of 5 Phases:
        1.  Setup
        2.  Inciting Incident
        3.  Midpoint
        4.  Climax
        5.  Falling Action
    *   **UI**: Render as Collapsible Folders (always open or toggleable).
    *   **Action**: Right-click -> "Dodaj Poglavlje" (Add Chapter).

*   **Level 2: Chapters (Dynamic from DB)**
    *   Render chapters filtered by `chapter.phase === currentPhase`.
    *   **UI**: Indented Folder items.
    *   **Action**: Right-click -> "Dodaj Scenu" (Add Scene), "Preimenuj", "Obriši".

*   **Level 3: Scenes (Dynamic from DB)**
    *   Render scenes filtered by `scene.chapterId === currentChapter.id`.
    *   **UI**: Indented File items (Draggable in future).
    *   **Action**: Click to Open, Right-click -> "Preimenuj", "Obriši".

## 3. Logika Sinkronizacije (Synchronization Logic)

*   **Implicit Sync**:
    *   The "Sync" is structural. The Studio Sidebar *enforces* the Planner structure by hardcoding the 5 Root Phases.
    *   We do not need to "pull" data periodically. The structure is the skeleton.
*   **Data Loading**:
    *   When `Studio` loads:
        *   `api.getChapters(projectId)`
        *   `api.getScenes(projectId)`
    *   The UI combines these to build the tree.

## 4. Cleanup Strategy (CRITICAL)

*   **Objective**: Remove old "Scena 1, Scena 2..." that are not part of the new structure.
*   **Mechanism**: "Fresh Start" Migration.
*   **Implementation**:
    *   We will create a utility function `initializeStudioStructure(projectId)` in the backend (or frontend calling API).
    *   **Step 1**: `DELETE FROM scenes WHERE project_id = X`. (Wipe all old scenes).
    *   **Step 2**: (Optional) Create default empty chapters if needed, but better to let user create them.
    *   **Trigger**: Since this is a dev/lite environment, we can trigger this manually or add a "Reset Studio" button in the UI for this transition.
    *   **Recommendation**: For this task, I will add a **"Reset & Initialize"** button in the Studio Sidebar header (temporary or permanent) that wipes old scenes to start fresh as requested.

## 5. Hodogram Implementacije (Step-by-Step Action Plan)

### Faza 1: Backend & Baza Podataka
1.  **Modify Schema**: U `server/src/schema/schema.ts` dodati definiciju za tablicu `chapters` i dodati `chapterId` u tablicu `scenes`.
2.  **Generate Migration**: Pokrenuti Drizzle komandu za generiranje SQL migracije.
3.  **Apply Migration**: Primijeniti migraciju na bazu podataka.
4.  **Update API**: U `server/src/api.ts` dodati rute za CRUD operacije nad `chapters` i ažurirati `scenes` rute.

### Faza 2: Frontend Data Layer
5.  **Update Types**: U `ui/src/lib/types.ts` dodati `Chapter` interface i ažurirati `Scene` interface.
6.  **Update API Client**: U `ui/src/lib/serverComm.ts` dodati metode za pozivanje novih API ruta.
7.  **Update Store**: U `ui/src/stores/studioStore.ts` dodati state za `chapters` i akcije za upravljanje poglavljima.

### Faza 3: UI Refactoring (Sidebar)
8.  **Create Components**: Kreirati nove komponente za prikaz stabla (ako je potrebno) ili refaktorirati `StudioSidebar.tsx`.
9.  **Implement Phase Rendering**: Implementirati renderiranje 5 fiksnih faza.
10. **Implement Chapter Rendering**: Implementirati prikaz poglavlja unutar faza.
11. **Implement Scene Rendering**: Implementirati prikaz scena unutar poglavlja.
12. **Add Context Menus**: Dodati desni klik izbornike za dodavanje poglavlja i scena.

### Faza 4: Cleanup & Verification
13. **Implement Cleanup**: Dodati funkciju/gumb za brisanje svih starih scena (kako bi se krenulo od nule).
14. **Manual Test**: Verificirati da se mogu dodavati poglavlja u faze i scene u poglavlja, te da se struktura ispravno sprema i učitava.
