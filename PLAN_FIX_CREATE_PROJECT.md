# TEHNIČKI PLAN ZA POPRAVAK "KREIRAJ NOVI PROJEKT" FUNKCIONALNOSTI

## 1. KREIRANJE NOVIH KOMPONENTI

**1.1 Kreirati novu ShadCN Dialog komponentu (ako već ne postoji)**
- **Datoteka:** `ui/src/components/ui/dialog.tsx` (već postoji)
- **Akcija:** Provjeri postojanje, ako ne postoji dodaj s `npx shadcn-ui add dialog`

**1.2 Kreirati komponentu CreateProjectDialog**
- **Datoteka:** `ui/src/components/CreateProjectDialog.tsx` (nova datoteka)
- **Funkcije za dodavanje:**
  - `CreateProjectDialog` komponenta s props interfaceom
  - State management za input polje (ime projekta)
  - Validation logiku za input
  - onSubmit handler koji poziva API
  - Loading state management
  - Error handling

## 2. MODIFICIRANJE POSTOJEĆIH DATOTEKA

**2.1 Modificirati serverComm.ts**
- **Datoteka:** `ui/src/lib/serverComm.ts`
- **Linija za modificiranje:** 82-90 (createProject funkcija)
- **Promjene:**
  - Dodati parametar `name: string` u funkciju
  - Dodati body s JSON.stringify({ name }) u fetch poziv
  - Ažurirati tip povrata funkcije

**2.2 Modificirati Home.tsx komponentu**
- **Datoteka:** `ui/src/pages/Home.tsx`
- **Linije za modificiranje:** 
  - 40-57 (handleCreateProject funkcija)
  - 70-76 (Button element)
- **Promjene:**
  - Ukloniti direktni poziv `api.createProject()`
  - Dodati state za modal (open/close)
  - Modificirati Button da otvara modal umjesto direktnog poziva
  - Dodati CreateProjectDialog komponentu u JSX
  - Implementirati callback funkciju za uspješno kreiranje

**2.3 Ažurirati API objekt u serverComm.ts**
- **Datoteka:** `ui/src/lib/serverComm.ts`
- **Linija za modificiranje:** 265-287 (api objekt)
- **Promjene:**
  - Ažurirati referencu na createProject funkciju

## 3. UPRAVLJANJE STANJEM (STATE MANAGEMENT)

**3.1 Dodati state varijable u Home.tsx**
- **Varijable za dodavanje:**
  - `isDialogOpen: boolean` - kontrolira otvaranje/zatvaranje modala
  - `projectName: string` - drži vrijednost input polja u modalu
  - `nameError: string` - drži poruke o grešci za validaciju

**3.2 Dodati state varijable u CreateProjectDialog.tsx**
- **Varijable za dodavanje:**
  - `name: string` - lokalno stanje input polja
  - `isSubmitting: boolean` - loading state tijekom API poziva
  - `error: string` - error state za prikaz grešaka

## 4. IMPLEMENTACIJA MODAL LOGIKE

**4.1 Dialog trigger logika**
- **Implementirati:** onClick handler na Button koji postavlja `isDialogOpen = true`
- **Lokacija:** Home.tsx, Button element

**4.2 Dialog submit logika**
- **Implementirati:** onSubmit handler u CreateProjectDialog
- **Funkcionalnost:**
  - Validacija input polja (min 1 karakter)
  - Poziv `api.createProject(name)`
  - Success callback koji poziva `onSuccess` prop
  - Error handling s prikazom greške

**4.3 Dialog close logika**
- **Implementirati:** onClose handler koji resetira stanje
- **Funkcionalnost:**
  - Zatvaranje modala
  - Reset input polja
  - Clear error stanja

## 5. MODIFICIRANJE API POZIVA

**5.1 Ažurirati createProject funkciju**
- **Datoteka:** `ui/src/lib/serverComm.ts`
- **Trenutna signatura:** `async function createProject()`
- **Nova signatura:** `async function createProject(name: string)`
- **Body za dodavanje:** `body: JSON.stringify({ name })`

**5.2 Ažurirati pozive createProject funkcije**
- **Lokacija:** CreateProjectDialog.tsx
- **Poziv:** `await api.createProject(name)`

## 6. DATA REFETCHING IMPLEMENTACIJA

**6.1 Callback funkcija u Home.tsx**
- **Funkcija:** `handleProjectCreated`
- **Funkcionalnost:**
  - Poziv `fetchProjects()` za osvježavanje liste
  - Zatvaranje modala
  - Prikaz success poruke
  - Reset stanja

**6.2 Props passing u CreateProjectDialog**
- **Prop:** `onSuccess: (project: Project) => void`
- **Implementacija:** Proslijedi callback iz Home.tsx u CreateProjectDialog

## 7. VALIDACIJA I ERROR HANDLING

**7.1 Frontend validacija**
- **Lokacija:** CreateProjectDialog.tsx
- **Validacija:** 
  - Provjeri da ime nije prazno
  - Trim whitespace
  - Min length provjera

**7.2 Backend error handling**
- **Lokacija:** CreateProjectDialog.tsx
- **Implementacija:**
  - Catch API errors
  - Prikaz user-friendly poruka
  - Maintain form state on error

## 8. UI/UX POBOLJŠANJA

**8.1 Loading states**
- **Button u Home.tsx:** Disable tijekom otvaranja modala
- **Submit button u modalu:** Loading spinner tijekom API poziva
- **Input field:** Disable tijekom submita

**8.2 Accessibility**
- **Dialog:** Proper ARIA labels
- **Input:** Required attribute i proper labeling
- **Focus management:** Auto-focus na input kad se modal otvori

## 9. TIPOVI I INTERFEJSI

**9.1 Dodati interface za CreateProjectDialog props**
- **Datoteka:** `ui/src/components/CreateProjectDialog.tsx`
- **Interface:**
```typescript
interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (project: Project) => void;
}
```

**9.2 Ažurirati tipove u serverComm.ts**
- **Funkcija:** `createProject(name: string): Promise<Project>`

## 10. TESTIRANJE I VALIDACIJA

**10.1 Funkcionalnosti za testiranje**
- Modal se otvara na klik gumba
- Input validacija radi ispravno
- API poziv šalje ispravan JSON body
- Success callback osvježava listu projekata
- Error handling prikazuje greške
- Modal se zatvara nakon uspješnog kreiranja

**10.2 Edge cases za testiranje**
- Prazan input
- Whitespace-only input
- Network errors
- API validation errors
- Concurrent requests

---

**SLIJED IMPLEMENTACIJE:**
1. Kreirati CreateProjectDialog komponentu
2. Modificirati createProject funkciju u serverComm.ts
3. Ažurirati Home.tsx za korištenje modala
4. Testirati end-to-end funkcionalnost
5. Dodati error handling i loading states
6. Finalizirati UI/UX detalje
