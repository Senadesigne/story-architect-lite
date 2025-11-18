# TEHNIČKA DIJAGNOZA I PLAN IMPLEMENTACIJE

## DEBUGGING MISIJA: KIRURŠKA DIJAGNOZA NEUSPJEŠNE SINKRONIZACIJE

### **KRITIČNA DIJAGNOZA PROBLEMA:**

1. **Editor je blokiran:** Korisnik ne može unijeti novi tekst. Ako unese tekst, on se odmah poništi.

2. **Auto-Save petlja:** Server logovi pokazuju konstantne `PUT /api/scenes/:sceneId` pozive (Auto-Save), ali oni šalju STARI, zaglavljeni sadržaj, potvrđujući da je petlja između TipTap-a i Zustand Store-a još uvijek aktivna.

3. **CILJ:** Pronaći korijen problema u arhitekturi i predložiti TRAJNO rješenje u 3 točke.

---

## **FAZA 1: ANALIZA BESKONAČNE PETLJE I SADRŽAJA**

### **1. Problematična arhitektura sinkronizacije**

**Korijen problema:**
- **Dvosmjerna sinkronizacija bez koordinacije**: TipTap editor i Zustand store pokušavaju sinkronizirati sadržaj istovremeno, što dovodi do beskonačne petlje
- **Race condition**: `isUpdatingFromExternal` flag se resetira prerano (samo nakon 0ms), što omogućava da novi update započne prije nego što je prethodni potpuno završen
- **Nepotrebna memoizacija**: `useMemo` u Studio.tsx za `editorContent` ne donosi nikakvu korist jer `editorContent` već dolazi iz Zustand store-a

### **2. Problemi u studioStore.ts**
- **updateSceneInStore**: Kada se ažurira scena, automatski mijenja `editorContent` što pokreće novi ciklus sinkronizacije
- **setActiveScene**: Direktno postavlja `editorContent` iz scene.summary, što može pokrenuti kaskadu promjena
- **deleteSceneFromStore/restoreSceneToStore**: Mijenjaju i `activeSceneId` i `editorContent` istovremeno, što može dovesti do multiple re-renderiranja

### **3. Auto-save problem**
- Auto-save šalje stari sadržaj jer je editor blokiran u beskonačnoj petlji
- Debounce od 3 sekunde je predugačak za korisničko iskustvo

---

## **FAZA 2: ANALIZA CONTEXT MENU-a**

**Problem:** DropdownMenu komponenta ne podržava programsko otvaranje bez klikanja na trigger
**Razlog:** ShadCN DropdownMenu koristi Radix UI koji zahtijeva kontrolirano stanje za programsko otvaranje

---

## **FAZA 3: TRAJNI PLAN IMPLEMENTACIJE**

### **1. FIKS PETLJE I AUTO-SAVEA**

**Korak 1.1: Dodavanje key prop remountinga u Studio.tsx**
- Dodati `key={activeSceneId}` na `StudioEditor` komponentu
- Ovo će forsirati potpuno novo mountanje komponente pri promjeni scene
- Eliminira potrebu za kompleksnom sinkronizacijom između instanci

**Korak 1.2: Pojednostavljivanje StudioEditor.tsx**
- Ukloniti `useEffect` koji sinkronizira content
- Ukloniti `isUpdatingFromExternal` flag i sve povezane logike
- Editor će primiti početni content kroz constructor i dalje samo emitirati promjene

**Korak 1.3: Refaktoriranje studioStore.ts**
- Dodati `isUpdatingFromStore` flag u store
- Modificirati `updateSceneInStore` da ne mijenja `editorContent` ako je promjena došla iz editora
- Dodati `updateContentFromEditor` metodu koja postavlja samo `editorContent` bez mijenjanja scene objekta

**Korak 1.4: Optimizacija auto-savea**
- Smanjiti debounce na 1000ms
- Dodati vizualnu indikaciju kada se sprema
- Implementirati optimistic UI pattern s rollback mehanizmom

### **2. FIKS CONTEXT MENUA**

**Korak 2.1: Implementacija kontroliranog DropdownMenu stanja**
- Dodati `const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)` u StudioSidebar
- Za svaki DropdownMenu dodati `open={openDropdownId === scene.id}`
- Dodati `onOpenChange={(open) => setOpenDropdownId(open ? scene.id : null)}`

**Korak 2.2: Implementacija desnog klika**
- Na scene button dodati:
  ```
  onContextMenu={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdownId(scene.id);
  }}
  ```

**Korak 2.3: Zatvaranje menija**
- U DropdownMenuItem onClick handlere dodati `setOpenDropdownId(null)` nakon akcije

### **3. OPTIONALNA ARHITEKTURA**

**Korak 3.1: Implementacija jednosmjernog toka podataka**
- Editor → Store → API (nikad obrnuto)
- Scene promjene iz API-ja ne smiju direktno mijenjati editor content
- Samo aktivna scena može mijenjati content

**Korak 3.2: Dodavanje transaction-based pristupa**
- Sve promjene stanja grupirane u transakcije
- Jedna promjena = jedna transakcija = jedan re-render

**Korak 3.3: Implementacija command pattern-a**
- Sve akcije (rename, delete, create) kao komande
- Omogućava undo/redo funkcionalnost
- Lakše testiranje i debugging

---

## **PRIORITET IMPLEMENTACIJE**

1. **KRITIČNO**: Fiks petlje (koraci 1.1-1.4) - ovo mora biti riješeno odmah
2. **VAŽNO**: Fiks context menua (koraci 2.1-2.3) - poboljšava UX
3. **DUGOROČNO**: Arhitekturalne promjene (koraci 3.1-3.3) - prevencija budućih problema

---

## **ATOMIČNI KORACI IMPLEMENTACIJE**

### **ATOMIČNI KORAK 1: FIKS PETLJE KROZ REMOUNTING**

1. **Studio.tsx**: Dodaj `key={activeSceneId}` na `StudioEditor` komponentu
2. **StudioEditor.tsx**: Ukloni sav kod za sinkronizaciju i pojednostavi komponentu
3. **Studio.tsx**: Promijeni debounce interval sa 3000 na 1000 ms

### **ATOMIČNI KORAK 2: FIKS CONTEXT MENUA**

1. **StudioSidebar.tsx**: Implementiraj kontrolirano stanje za DropdownMenu
2. **StudioSidebar.tsx**: Dodaj desni klik handler
3. **StudioSidebar.tsx**: Implementiraj zatvaranje menija

### **ATOMIČNI KORAK 3: ARHITEKTURALNE PROMJENE**

1. **studioStore.ts**: Refaktoriraj store logiku
2. **Studio.tsx**: Implementiraj optimistic UI
3. **Sve komponente**: Implementiraj jednosmjerni tok podataka
