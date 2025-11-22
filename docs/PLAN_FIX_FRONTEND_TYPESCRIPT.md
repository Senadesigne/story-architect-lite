# Plan Popravka Frontend TypeScript Grešaka

## Pregled

Build frontenda na Vercelu je pao zbog 20+ TypeScript grešaka. Ovaj plan adresira sve kategorije grešaka i pruža detaljne korake za rješavanje.

## Kategorije Grešaka

### 1. Tipovi modula
- **Problem:** `Cannot find module '@tiptap/core'`
- **Uzrok:** Paket se koristi u kodu ali nije eksplicitno naveden u `package.json`
- **Rješenje:** Dodaj `skipLibCheck: true` u `tsconfig.json` ili instaliraj missing `@types/` pakete

### 2. Neiskorištene varijable (TS6133)
- **Problem:** Neiskorišteni `import` ili varijable (`React`, `useParams`, `Scene`, `token`)
- **Rješenje:** Ukloni sve neiskorištene importove i varijable

### 3. Neusklađenost tipova (TS2322)
- **Problem:** Neusklađeni tipovi propsova u Form komponentama
- **Primjer:** `string` nije kompatibilan s `string | object` u `IdeationForm.tsx`
- **Rješenje:** Uskladi tipove funkcija i propova

### 4. Firebase putanja
- **Problem:** `Cannot find module './firebase-config.json'`
- **Uzrok:** Datoteka ne postoji ili je u `.gitignore`
- **Rješenje:** Zamijeni s `import.meta.env` varijablama

---

## Detaljni Plan Implementacije

### KORAK 1: Instalacija nedostajućih paketa (Tipovi modula)

**Problem:** `Cannot find module '@tiptap/core'`

**Uzrok:** Tiptap starter kit koristi `@tiptap/core` interno, ali TypeScript treba direktnu referencu.

**Akcija:**
```bash
cd ui
pnpm add @tiptap/core@^3.10.7
```

**Napomena:** Verzija mora biti usklađena s ostalim `@tiptap` paketima (trenutno `3.10.7`).

---

### KORAK 2: Popravak Firebase konfiguracije

**Datoteka:** `ui/src/lib/firebase.ts`

**Problem:** 
```typescript
import firebaseConfig from './firebase-config.json'; // ❌ Datoteka ne postoji
```

**Rješenje:**
```typescript
// Ukloni problematičnu liniju:
// import firebaseConfig from './firebase-config.json';

// Dodaj konfiguraciju preko environment varijabli:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

**Napomena:** Varijable moraju biti postavljene u Vercel Project Settings.

---

### KORAK 3: Rješavanje TypeScript grešaka po datotekama

#### A. `ui/src/components/planner/MagicIcon.tsx`

**Problem:** Definicija `onClick` prop-a je previše restriktivna.

**Trenutno:**
```typescript
onClick: () => void;
```

**Rješenje:**
```typescript
onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
```

#### B. `ui/src/components/Phase6Form.tsx`

**Greška 1 (TS2322):** `MagicIcon` onClick handler
- **Rješenje:** Nakon popravka MagicIcon-a, greška će nestati

**Greška 2 (TS7006):** `Parameter 'e' implicitly has an 'any' type`
- **Rješenje:** Tipizirati event parametar ili ukloniti ako se ne koristi

#### C. `ui/src/components/IdeationForm.tsx`

**Greška (TS2322):** Type mismatch u `onKeepAll` funkciji

**Problem:**
```typescript
// Očekuje: (value: string | object) => void
// Prima: (value: string) => void
```

**Rješenje:**
```typescript
const handleKeepAll = (value: string | object) => {
  if (!targetField) return;
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  onFieldChange(targetField as ProjectField, stringValue);
};
```

#### D. `ui/src/components/studio/StudioEditor.tsx`

**Greška 1 (TS2353):** `tippyOptions` ne postoji u novijim verzijama

**Trenutno:**
```typescript
FloatingMenu.configure({
  tippyOptions: {
    duration: 100,
  },
  // ...
})
```

**Rješenje:**
```typescript
FloatingMenu.configure({
  // Ukloni tippyOptions
  shouldShow: ({ editor }) => {
    return !editor.state.selection.empty;
  },
})
```

**Greška 2 (TS6133):** Neiskorišteni importovi
- Ukloni: `import { useEffect } from 'react';`
- Ukloni: `import type { Editor } from '@tiptap/core';` (ako se ne koristi)

#### E. `ui/src/hooks/useSessionTimeout.ts`

**Greška (TS2554):** `useRef` očekuje argument

**Trenutno:**
```typescript
const timeoutRef = useRef<NodeJS.Timeout>();
const warningRef = useRef<NodeJS.Timeout>();
```

**Rješenje:**
```typescript
const timeoutRef = useRef<NodeJS.Timeout | null>(null);
const warningRef = useRef<NodeJS.Timeout | null>(null);
```

---

### KORAK 4: Čišćenje nekorištenih varijabli (TS6133)

#### Datoteke za čišćenje:

1. **`ui/src/components/Phase4Form.tsx`**
   - Ukloni: `newCharacter` varijablu

2. **`ui/src/components/UserProfileForm.tsx`**
   - Ukloni: `profile` varijablu

3. **`ui/src/components/planner/AIAssistantModal.tsx`**
   - Ukloni: `import React` (ako se ne koristi JSX direktno)
   - Ukloni: `initialValue` varijablu

4. **`ui/src/components/studio/CommandBar.tsx`**
   - Ukloni: `import { useParams }` (ako se ne koristi)

5. **`ui/src/components/studio/StudioSidebar.tsx`**
   - Ukloni: `import { useParams }` (ako se ne koristi)
   - Ukloni: `Scene` import (ako se ne koristi)
   - Ukloni: `oldActiveSceneId` varijablu

6. **`ui/src/lib/auth-context.tsx`**
   - Ukloni: `token` varijablu (ako se ne koristi)

---

## Redoslijed Implementacije

1. ✅ **Kreiraj plan dokument**
2. 🔄 **Instaliraj @tiptap/core paket**
3. ⏳ **Popravi Firebase konfiguraciju**
4. ⏳ **Rješi TypeScript greške po datotekama**
5. ⏳ **Ukloni neiskorištene varijable**
6. ⏳ **Testiraj build lokalno**
7. ⏳ **Commit i push promjene**

---

## Napomene

- Sve promjene treba testirati lokalno prije commit-a
- Paziti na verzije paketa - uskladiti s postojećima
- Environment varijable postaviti u Vercel Project Settings
- Nakon svakog koraka provjeriti `pnpm run build` u `ui` direktoriju
