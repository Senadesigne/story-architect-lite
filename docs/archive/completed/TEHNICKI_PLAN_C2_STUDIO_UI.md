# Tehnički Plan - Faza C.2: Studio (Canvas za pisanje)

## 1. Pregled

Ovaj dokument predstavlja detaljan tehnički plan za implementaciju "Studio" sučelja - naprednog canvas prostora za pisanje s integriranim AI asistentom. Studio će omogućiti korisnicima fluidno pisanje priča s real-time AI podrškom.

## 2. Arhitektura Rješenja

### 2.1 Navigacijska Arhitektura

**Postojeća struktura:**
- `Home.tsx` - Lista svih korisnikovih projekata ("Moji Projekti")
- `/project/:projectId/*` - Projekt stranice s fazama (Planer)
- `ProjectLayout` + `ProjectSidebar` - Navigacija između faza

**Nova struktura:**
Unutar svakog projekta, korisnik će moći birati između dva glavna moda rada:
1. **"Planer"** - Postojećih 6 faza (Ideja, Planiranje, Svijet, Likovi, Struktura, Završetak)
2. **"Studio"** - Novi canvas za pisanje s AI asistentom

### 2.2 Modifikacije Rutiranja

#### Nova komponenta: `ProjectNav.tsx`
```typescript
// ui/src/components/ProjectNav.tsx
interface ProjectNavProps {
  projectId: string;
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const location = useLocation();
  const isStudio = location.pathname.includes('/studio');
  
  return (
    <div className="border-b">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link 
          to={`/project/${projectId}/ideation`}
          className={cn(
            "px-4 py-2 rounded-md transition-colors",
            !isStudio && "bg-accent"
          )}
        >
          Planer
        </Link>
        <Link 
          to={`/project/${projectId}/studio`}
          className={cn(
            "px-4 py-2 rounded-md transition-colors",
            isStudio && "bg-accent"
          )}
        >
          Studio
        </Link>
      </div>
    </div>
  );
}
```

#### Modificirana `ProjectLayout.tsx`:
```typescript
// ui/src/components/layout/ProjectLayout.tsx
export function ProjectLayout({ children }: ProjectLayoutProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const isStudio = location.pathname.includes('/studio');
  
  return (
    <div className="flex flex-col w-full min-h-screen">
      <ProjectNav projectId={projectId!} />
      <div className="flex flex-1">
        {!isStudio && <ProjectSidebar />}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
```

#### Ažurirane rute u `ProjectPage.tsx`:
```typescript
// ui/src/pages/ProjectPage.tsx
<Routes>
  <Route index element={<Navigate to="ideation" replace />} />
  
  {/* Postojeće Planer rute */}
  <Route path="ideation" element={<IdeationForm ... />} />
  <Route path="planning" element={<Phase2Form ... />} />
  <Route path="worldbuilding" element={<Phase3Form ... />} />
  <Route path="characters" element={<Phase4Form />} />
  <Route path="structure" element={<Phase5Form ... />} />
  <Route path="finalization" element={<Phase6Form ... />} />
  
  {/* Nova Studio ruta */}
  <Route path="studio" element={<Studio />} />
</Routes>
```

#### Navigacijski flow:
1. Korisnik na `Home` stranici vidi listu projekata
2. Klik na projekt vodi na `/project/:projectId/ideation` (default)
3. Novi `ProjectNav` omogućuje prebacivanje između:
   - **Planer**: `/project/:projectId/ideation` (ili druge faze)
   - **Studio**: `/project/:projectId/studio`
4. Kada je u Planer modu, vidi se `ProjectSidebar` s fazama
5. Kada je u Studio modu, sidebar se skriva i prikazuje se full Studio UI

### 2.3 Layout Struktura

#### `ui/src/components/layout/StudioLayout.tsx`:
```typescript
interface StudioLayoutProps {
  children: React.ReactNode;
}

export function StudioLayout({ children }: StudioLayoutProps) {
  return (
    <div className="flex w-full h-screen overflow-hidden">
      {children}
    </div>
  );
}
```

### 2.4 Komponente

#### Struktura komponenti:
```
ui/src/
├── pages/
│   └── Studio.tsx                 # Glavna Studio stranica
├── components/
│   ├── ProjectNav.tsx            # Nova navigacija Planer/Studio
│   └── studio/
│       ├── StudioSidebar.tsx      # Lijevi sidebar sa scenama
│       ├── StudioEditor.tsx       # Rich Text Editor wrapper
│       ├── CommandBar.tsx         # AI naredbena traka
│       └── FloatingMenu.tsx       # Plutajući kontekstni izbornik
```

#### Glavna Studio komponenta:
```typescript
// ui/src/pages/Studio.tsx
export function Studio() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isSidebarOpen } = useStudioStore();
  
  return (
    <div className="flex h-[calc(100vh-3.5rem)]"> {/* Visina minus ProjectNav */}
      {isSidebarOpen && <StudioSidebar projectId={projectId!} />}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <StudioEditor projectId={projectId!} />
        </div>
        <CommandBar projectId={projectId!} />
      </div>
    </div>
  );
}
```

## 3. Rich Text Editor - Izbor i Integracija

### 3.1 Preporučeni Editor: TipTap

**Razlozi za izbor TipTap-a:**
- Modularna arhitektura (samo što trebamo)
- Odličan TypeScript support
- Baziran na ProseMirror-u (robusna osnova)
- Lako proširiv s custom ekstenzijama
- Dobra React integracija
- Aktivna zajednica i redovito održavanje

### 3.2 Instalacija:
```bash
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-floating-menu
```

### 3.3 Editor Konfiguracija:
```typescript
// ui/src/components/studio/StudioEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const extensions = [
  StarterKit,
  Placeholder.configure({
    placeholder: 'Započnite pisati svoju priču...',
  }),
];

export function StudioEditor({ 
  content, 
  onContentChange,
  onSelectionChange 
}: StudioEditorProps) {
  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      onSelectionChange({ from, to, empty, text: editor.state.doc.textBetween(from, to) });
    },
  });

  return <EditorContent editor={editor} className="prose prose-lg max-w-none" />;
}
```

## 4. State Management

### 4.1 Studio Store (Zustand)
```typescript
// ui/src/stores/studioStore.ts
interface StudioState {
  // Editor stanje
  activeSceneId: string | null;
  editorContent: string;
  cursorPosition: number;
  selectedText: string | null;
  
  // UI stanje
  isSidebarOpen: boolean;
  isCommandBarVisible: boolean;
  
  // Akcije
  setActiveScene: (sceneId: string) => void;
  updateContent: (content: string) => void;
  setCursorPosition: (position: number) => void;
  setSelectedText: (text: string | null) => void;
  toggleSidebar: () => void;
  insertTextAtCursor: (text: string) => void;
}
```

### 4.2 Scene Management
- Koristiti postojeći `scenes` endpoint (`/api/projects/:projectId/scenes`)
- Cachirati scene podatke u Zustand store-u
- Real-time sinkronizacija između editora i aktivne scene

## 5. AI Integracija

### 5.1 Command Bar Interakcija
```typescript
// ui/src/components/studio/CommandBar.tsx
export function CommandBar({ projectId }: CommandBarProps) {
  const { insertTextAtCursor } = useStudioStore();
  
  const handleSubmit = async (command: string) => {
    const response = await api.chat(projectId, {
      userInput: command,
    });
    
    // Umetni AI odgovor na poziciju kursora
    if (response.finalState?.finalOutput) {
      insertTextAtCursor(response.finalState.finalOutput);
    }
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <Input 
          placeholder="Unesite naredbu za AI asistenta..."
          className="w-full"
        />
      </form>
    </div>
  );
}
```

### 5.2 Floating Menu za Selekciju
```typescript
// ui/src/components/studio/FloatingMenu.tsx
const AI_ACTIONS = [
  { label: "Prepravi", prompt: "Prepravi sljedeći tekst: " },
  { label: "Skrati", prompt: "Skrati sljedeći tekst zadržavajući ključne informacije: " },
  { label: "Proširi", prompt: "Proširi i obogati sljedeći tekst: " },
  { label: "Promijeni ton", prompt: "Promijeni ton sljedećeg teksta na formalniji: " },
];

export function FloatingMenu({ selectedText, projectId, onReplace }: FloatingMenuProps) {
  const handleAction = async (action: AIAction) => {
    const response = await api.chat(projectId, {
      userInput: `${action.prompt}"${selectedText}"`,
    });
    
    if (response.finalState?.finalOutput) {
      onReplace(response.finalState.finalOutput);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary">
          AI Akcije
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {AI_ACTIONS.map(action => (
          <DropdownMenuItem key={action.label} onClick={() => handleAction(action)}>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 6. UI/UX Detalji

### 6.1 Layout Specifikacije
- **Sidebar**: 256px širine (kao postojeći ProjectSidebar), collapsible
- **Editor**: Flex-1, maksimalna širina 1024px, centrirano
- **Command Bar**: Fiksna visina 80px, sticky bottom

### 6.2 Vizualni Elementi (ShadCN)
```typescript
// Postojeće komponente za korištenje:
- Card, CardHeader, CardContent (za sidebar scene)
- Button (za akcije)
- Input (za command bar)
- Sheet (za mobilni sidebar)
- DropdownMenu (za floating menu)
- ScrollArea (za sidebar i editor)
- Separator (vizualno odvajanje)
```

### 6.3 Responsive Design
- Desktop: Puni layout sa svim elementima
- Tablet: Sidebar kao Sheet (drawer)
- Mobile: Pojednostavljeni UI, command bar kao modal

## 7. Data Flow

### 7.1 Scene Loading
```
1. Studio komponenta učitava project i scenes
2. Prva scena se automatski aktivira
3. Editor učitava sadržaj aktivne scene
4. Sidebar prikazuje sve scene s highlightom na aktivnoj
```

### 7.2 Content Persistence
```
1. Editor onChange → debounced update (3s)
2. Update scene preko PUT /api/scenes/:sceneId
3. Optimistic update u UI
4. Error handling s retry logikom
```

### 7.3 AI Integration Flow
```
1. User input (command bar ili selection)
2. API poziv na /api/projects/:projectId/chat
3. Response processing
4. Content insertion/replacement
5. Auto-save triggered
```

## 8. Implementacijski Prioriteti

### Faza 1 (MVP):
1. Basic Studio layout
2. TipTap editor integracija
3. Scene sidebar (read-only)
4. Command bar s osnovnom AI integracijom

### Faza 2:
1. Scene management (CRUD)
2. Floating menu za selekciju
3. Auto-save funkcionalnost
4. Keyboard shortcuts

### Faza 3:
1. Advanced AI akcije
2. Collaborative features priprema
3. Export opcije
4. Performance optimizacije

## 9. Tehnički Izazovi i Rješenja

### 9.1 Editor Performance
- **Problem**: Veliki dokumenti mogu usporiti editor
- **Rješenje**: Virtualizacija i lazy loading scena

### 9.2 AI Response Latency
- **Problem**: AI odgovori mogu trajati nekoliko sekundi
- **Rješenje**: Loading indikatori, optimistic UI updates

### 9.3 Concurrent Edits
- **Problem**: Konflikt između user edits i AI insertions
- **Rješenje**: Transaction-based updates, operation queueing

## 10. Testing Strategy

### Unit Tests:
- Store akcije i reduceri
- AI prompt building
- Content transformation funkcije

### Integration Tests:
- Editor → API → Database flow
- AI response handling
- Scene switching i persistence

### E2E Tests:
- Kompletan user journey
- AI interakcije
- Error scenarios

## 11. Migracija i Backwards Compatibility

- Studio je dodatak postojećem sistemu
- Nema breaking changes
- Postojeći Planner (Faze 1-6) ostaje netaknut
- Scene podatci se mogu editirati u oba sučelja

## 12. Sigurnosni Aspekti

- Sanitizacija HTML sadržaja iz editora
- Rate limiting za AI pozive (već implementiran)
- Validacija scene ownership prije editiranja
- XSS prevencija u editor renderiranju
