--- PLAN ZADATAK 1.3: UPRAVLJANJE SCENAMA ---

Analizirat ću postojeći kod i stvoriti detaljan tehnički plan za implementaciju funkcionalnosti upravljanja scenama.

[5 tools called]

Na temelju analize postojećeg koda, evo detaljnog tehničkog plana za implementaciju funkcionalnosti upravljanja scenama (Rename, Delete, Edit) putem kontekstualnog izbornika:

TEHNIČKI PLAN ZA IMPLEMENTACIJU KONTEKSTUALNOG IZBORNIKA SCENA

1. UI SLOJ (StudioSidebar.tsx)

1.1 ShadCN komponente potrebne:

DropdownMenu komponente:   - DropdownMenu (glavni wrapper)   - DropdownMenuTrigger (trigger element)   - DropdownMenuContent (sadržaj izbornika)   - DropdownMenuItem (pojedinačne opcije)   - DropdownMenuSeparator (separator između opcija)

Dialog komponente za modal:   - Dialog (glavni wrapper)   - DialogTrigger (trigger - neće se koristiti direktno)   - DialogContent (sadržaj modala)   - DialogHeader (zaglavlje modala)   - DialogTitle (naslov modala)   - DialogFooter (podnožje s gumbovima)

Input komponenta za preimenovanje

Button komponente za akcije

AlertDialog komponente za potvrdu brisanja

1.2 Implementacijski koraci:

Korak 1.2.1: Dodati import potrebnih ShadCN komponenti

Dodati importove za DropdownMenu, Dialog, AlertDialog, Input komponente

Dodati ikone: MoreVertical, Edit, Trash2 iz lucide-react

Korak 1.2.2: Dodati state varijable za modalne dijaloge

isRenameDialogOpen: boolean - za modal preimenovanja

isDeleteDialogOpen: boolean - za potvrdu brisanja

selectedSceneId: string | null - ID trenutno odabrane scene

renameValue: string - vrijednost u input polju za preimenovanje

Korak 1.2.3: Modificirati postojeći scene button

Umjesto trenutnog Button elementa, koristiti kombinaciju div + Button + DropdownMenu

Button će zadržati postojeću funkcionalnost (setActiveScene)

DropdownMenu će se aktivirati na desni klik ili na klik na "three dots" ikonu

Korak 1.2.4: Implementirati event handlere

handleRenameClick(sceneId: string, currentTitle: string) - otvara rename modal

handleDeleteClick(sceneId: string) - otvara delete potvrdu

handleRenameSubmit() - poziva store akciju za preimenovanje

handleDeleteConfirm() - poziva store akciju za brisanje

2. STORE SLOJ (studioStore.ts)

2.1 Nove akcije potrebne:

Akcija 2.1.1: deleteSceneFromStore(sceneId: string)

// Uklanja scenu iz lokalnog store-a



// Ako je obrisana scena bila aktivna, postavlja novu aktivnu scenu (prvu dostupnu)

// Ažurira editorContent na novu aktivnu scenu



Akcija 2.1.2: renameSceneInStore(sceneId: string, newTitle: string)



// Ažurira title scene u lokalnom store-u



// Ako je preimenovana scena trenutno aktivna, ne mijenja activeSceneId



Akcija 2.1.3: updateSceneInStore(sceneId: string, updates: Partial<Scene>)



// Generička funkcija za ažuriranje bilo kojeg polja scene



// Može se koristiti i za rename i za druge buduće ažuriranja



2.2 Implementacijski koraci:



Korak 2.2.1: Dodati nove akcije u StudioState interface Korak 2.2.2: Implementirati logiku za svaku akciju u create() funkciji Korak 2.2.3: Osigurati da se activeSceneId pravilno ažurira nakon brisanja

3. API SLOJ (serverComm.ts i api.ts)

3.1 Potvrda postojećih API funkcija:

✅ POTVRĐENO: updateScene(sceneId, sceneData) - linija 219-225 u serverComm.ts ✅ POTVRĐENO: deleteScene(sceneId) - linija 228-233 u serverComm.ts ✅ POTVRĐENO: Backend PUT /api/scenes/:sceneId - linija 687-720 u api.ts ✅ POTVRĐENO: Backend DELETE /api/scenes/:sceneId - linija 722-741 u api.ts

3.2 Implementacijski koraci:

Korak 3.2.1: Implementirati API pozive u StudioSidebar.tsx

handleRenameSubmit() poziva api.updateScene(sceneId, { title: newTitle })

handleDeleteConfirm() poziva api.deleteScene(sceneId)

Korak 3.2.2: Implementirati error handling

Try-catch blokovi oko API poziva

Prikazivanje error poruka korisniku

Rollback lokalnih promjena u slučaju greške

Korak 3.2.3: Implementirati optimistic updates

Odmah ažurirati store prije API poziva

U slučaju greške, vratiti staro stanje

4. DETALJNI WORKFLOW

4.1 Rename Scene Workflow:

Korisnik klikne "Preimenuj" u dropdown meniju

Otvara se Dialog s Input poljem (prefilled s trenutnim nazivom)

Korisnik unosi novi naziv i klikne "Spremi"

Poziva se renameSceneInStore() (optimistic update)

Poziva se api.updateScene() 

U slučaju uspjeha - ništa (već ažurirano)

U slučaju greške - rollback + prikaži error

4.2 Delete Scene Workflow:

Korisnik klikne "Izbriši" u dropdown meniju

Otvara se AlertDialog s potvrdom

Korisnik potvrdi brisanje

Poziva se deleteSceneFromStore() (optimistic update)

Poziva se api.deleteScene()

U slučaju uspjeha - ništa (već ažurirano)

U slučaju greške - rollback + prikaži error

5. DATOTEKE ZA MODIFICIRANJE

5.1 ui/src/components/studio/StudioSidebar.tsx:

Dodati importove za nove ShadCN komponente

Dodati state varijable za modale

Modificirati scene rendering logiku

Implementirati event handlere

Dodati Dialog i AlertDialog komponente na kraj

5.2 ui/src/stores/studioStore.ts:

Proširiti StudioState interface s novim akcijama

Implementirati deleteSceneFromStore() akciju

Implementirati renameSceneInStore() akciju

Implementirati updateSceneInStore() akciju

5.3 Potrebne ShadCN komponente za dodavanje:

npx shadcn-ui add dropdown-menu



npx shadcn-ui add dialog  

npx shadcn-ui add alert-dialog

npx shadcn-ui add input



6. SIGURNOSNI ASPEKTI

6.1 Validacija:

Provjera da novi naziv nije prazan



Provjera da scena postoji prije brisanja



UUID validacija na backend strani (već implementirana)



6.2 UX poboljšanja:

Loading stanja tijekom API poziva



Potvrda prije brisanja



Escape key za zatvaranje modala



Enter key za potvrdu u rename modalu
