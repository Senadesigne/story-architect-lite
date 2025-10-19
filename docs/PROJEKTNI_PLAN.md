Projektni Plan: Story Architect Lite
Ovaj dokument je naš centralni "mozak" projekta. Služi kao detaljna funkcionalna specifikacija i sustav za praćenje zadataka. Svaki put kada započinjemo novi chat, ovaj dokument će biti glavni kontekst.

## 1. Detaljna Funkcionalna Specifikacija
Ovdje ćemo detaljno razraditi svaku od 6 faza aplikacije. Cilj je da za svaki korak znamo točno kako treba izgledati i funkcionirati.

#### Faza 1: Ideja i Koncept
* **Korisničko iskustvo (Frontend):**
    * Prikazuje se forma unutar kartice s naslovom "Faza 1: Ideja i Koncept".
    * Forma sadrži polja za unos: Logline, Tema, Premisa, Žanr i Ciljana Publika.
    * Sve promjene se automatski spremaju u pozadini.
* **Logika i Podaci (Backend):**
    * Backend ažurira odgovarajuća polja (logline, theme, premise, genre, audience) u `projects` tabeli.

#### Faza 2: Planiranje i Istraživanje
* **Korisničko iskustvo (Frontend):**
    * Prikazuje se nova kartica s naslovom "Faza 2: Planiranje i Istraživanje".
    * Unutar kartice se nalaze dva velika polja za unos (text area): "Brainstorming" i "Istraživanje".
    * Sustav automatskog spremanja funkcionira identično kao i za Fazu 1.
* **Logika i Podaci (Backend):**
    * Tabela `projects` u bazi podataka će se proširiti s dva nova tekstualna polja: `brainstorming` i `research`.
    * Postojeća backend API ruta `PUT /api/projects/:projectId` će se proširiti kako bi mogla primati i ažurirati ova dva nova polja.

#### Faza 3: Izgradnja Svijeta
* **Korisničko iskustvo (Frontend):**
    * Prikazuje se nova kartica "Faza 3: Izgradnja Svijeta" na ruti `/projects/:projectId/worldbuilding`.
    * Sadrži dva `textarea` polja ("Definiranje Pravila", "Kultura, Društvo i Povijest") i CRUD sučelje za "Geografija i Lokacije".
    * `textarea` polja koriste sustav automatskog spremanja iz `ProjectPage.tsx`.
* **Logika i Podaci (Backend):**
    * **`projects` Tabela:** Proširena s `rules_definition` i `culture_and_history`.
    * **Postojeći API (`PUT /api/projects/:projectId`):** Proširen da ažurira ova dva polja.
    * **Novi API (Lokacije):** Kreirane CRUD API rute za upravljanje `locations` tabelom.

#### Faza 4: Razvoj Likova
* **Korisničko iskustvo (Frontend):**
    * Prikazuje se nova kartica "Faza 4: Razvoj Likova" na ruti `/projects/:projectId/characters`.
    * Sučelje je u potpunosti posvećeno CRUD (Create, Read, Update, Delete) upravljanju likovima.
    * Gumb "+ Dodaj Lika" otvara modalnu formu za unos/uređivanje detalja o liku.
* **Logika i Podaci (Backend):**
    * **`characters` Tabela:** Proširena s poljima `goal`, `fear`, i `backstory`.
    * **Novi API (Likovi):** Kreirane CRUD API rute za upravljanje `characters` tabelom.

#### Faza 5: Strukturiranje Radnje
* **Korisničko iskustvo (Frontend):**
    * Prikazuje se nova kartica "Faza 5: Strukturiranje Radnje" na ruti `/projects/:projectId/structure`.
    * Kartica sadrži hibridni pristup:
        1.  **"Sinopsis":** Jedno veliko `textarea` polje za unos sinopsisa.
        2.  **"Izrada Okvira Radnje (Bilješke)":** Jedno veliko `textarea` polje za slobodne bilješke o strukturi.
        3.  **"Popis Scena":** UI komponenta za upravljanje (CRUD) scenama.
        4.  **"Vizualizacija Strukture Tri Čina":** Prikaz statične slike/dijagrama kao vizualne pomoći.
    * Polja "Sinopsis" i "Bilješke" koriste sustav automatskog spremanja (`useDebouncedSave` iz `ProjectPage.tsx`).
* **Logika i Podaci (Backend):**
    * **`projects` Tabela:** Proširena s dva tekstualna polja: `synopsis` i `outline_notes`.
    * **Postojeći API (`PUT /api/projects/:projectId`):** Proširen da ažurira `synopsis` i `outline_notes`.
    * **Novi API (Scene):** Kreirane CRUD API rute za upravljanje `scenes` tabelom.

#### Faza 6: Završne Pripreme
* **Korisničko iskustvo (Frontend):**
    * Prikazuje se nova kartica "Faza 6: Završne Pripreme" na ruti `/projects/:projectId/finalization`.
    * Kartica sadrži jedno veliko `textarea` polje za "Završne Bilješke" (npr. ideje za nastavak, podsjetnici za uređivanje, itd.).
    * Može sadržavati i gumb "Izvezi Projekt" (funkcionalnost će biti dodana u budućnosti).
    * Polje "Završne Bilješke" koristi sustav automatskog spremanja.
* **Logika i Podaci (Backend):**
    * **`projects` Tabela:** Proširit će se s jednim novim tekstualnim poljem: `final_notes`.
    * **Postojeći API (`PUT /api/projects/:projectId`):** Proširit će se kako bi mogao ažurirati `final_notes`.

## 2. Plan Razvoja i Praćenje Zadataka
Ovo je naša Kanban ploča. Zadatke ćemo prebacivati iz jedne kolone u drugu.

### [ ZADACI ZA ODRADITI (To-Do) ]

**Epic: Post-MVP**
(...ovdje ćemo definirati zadatke nakon završetka MVP-a, npr. Export, AI integracije...)

### [ TRENUTNO RADIMO (In Progress) ]

**Epic: MVP-7: Faza 6 - Završne Pripreme**

* **Zadatak 8.1 (Backend/Baza):** Ažurirati `server/src/schema/schema.ts`. Dodati jedno novo tekstualno polje u `projects` tablicu: `final_notes`.
* **Zadatak 8.2 (Backend/Baza):** Pokrenuti `pnpm run db:generate` i `pnpm run db:migrate` (u `server` folderu).
* **Zadatak 8.3 (Backend):** Proširiti `PUT /api/projects/:projectId` rutu (i `ProjectUpdateData` tip) kako bi prihvaćala i spremala podatke za `final_notes`.
* **Zadatak 8.4 (Frontend):** Kreirati novu React komponentu, `Phase6Form.tsx`.
* **Zadatak 8.5 (Frontend):** U `Phase6Form.tsx` implementirati `textarea` polje (`final_notes`) i povezati ga s postojećom `handleFieldChange` logikom iz `ProjectPage.tsx`.
* **Zadatak 8.6 (Frontend/Routing):** Ažurirati `ProjectPage.tsx` (tip `ProjectField`, `formData` state) i renderirati novu `Phase6Form` komponentu na ruti `finalization`.

### [ ZAVRŠENO (Done) ]

**Epic: MVP-6: Faza 5 - Strukturiranje Radnje**
✅ **Zadatak 7.1 (Backend/Baza):** Ažurirana `projects` tablica s `synopsis` i `outline_notes`.
✅ **Zadatak 7.2 (Backend/Baza):** Pokrenute `db:generate` i `db:migrate` migracije.
✅ **Zadatak 7.3 (Backend):** Proširena `PUT /api/projects/:projectId` ruta za `synopsis` i `outline_notes`.
✅ **Zadatak 7.4 (Backend):** Kreirane CRUD API rute za Scene (`scenes` tablica).
✅ **Zadatak 7.5 (Frontend):** Kreirana `Phase5Form.tsx`.
✅ **Zadatak 7.6 (Frontend):** Povezana `textarea` polja (`synopsis`, `outline_notes`) s `handleFieldChange`.
✅ **Zadatak 7.7 (Frontend):** Implementiran UI za CRUD nad scenama.
✅ **Zadatak 7.8 (Frontend):** Prikazana statična slika (placeholder).
✅ **Zadatak 7.9 (Frontend/Routing):** Ažuriran `ProjectPage.tsx`.
✅ **Zadatak 7.10 (Bug Fix):** Riješen problem (`column "synopsis" does not exist`) ponovnim pokretanjem servera i primjenom migracije.

**Epic: MVP-5: Faza 4 - Razvoj Likova**
✅ **Zadatak 6.1 (Backend/Baza):** Ažurirana `characters` tabela u `schema.ts` s poljima `goal`, `fear`, `backstory`.
✅ **Zadatak 6.2 (Backend/Baza):** Pokrenute `db:generate` i `db:migrate` migracije.
✅ **Zadatak 6.3 (Backend):** Kreirane nove CRUD API rute za Likove (GET, POST, PUT, DELETE) koristeći `characters` tablicu.
✅ **Zadatak 6.4 (Frontend):** Kreirana nova komponenta, `Phase4Form.tsx`.
✅ **Zadatak 6.5 (Frontend):** Implementiran UI za CRUD operacije nad likovima (modalna forma).
✅ **Zadatak 6.6 (Frontend/Routing):** Ažuriran `ProjectPage.tsx` da renderira `Phase4Form` na `characters` ruti.
✅ **Zadatak 6.7 (Bug Fix):** Instalirana nedostajuća `shadcn/ui dialog` komponenta kako bi se riješilo rušenje aplikacije.

**Epic: MVP-4: Faza 3 - Izgradnja Svijeta**
✅ **Zadatak 5.1 (Backend/Baza):** Ažurirana `projects` tabela s `rules_definition` i `culture_and_history`.
✅ **Zadatak 5.2 (Backend/Baza):** Pokrenute migracije.
✅ **Zadatak 5.3 (Backend):** Proširena `PUT /api/projects/:projectId` ruta.
✅ **Zadatak 5.4 (Backend):** Kreirane CRUD API rute za Lokacije (`locations` tabela).
✅ **Zadatak 5.5 (Frontend):** Kreirana `Phase3Form.tsx`.
✅ **Zadatak 5.6 (Frontend):** Povezana `textarea` polja s `handleFieldChange`.
✅ **Zadatak 5.7 (Frontend):** Implementiran UI za CRUD nad lokacijama.
✅ **Zadatak 5.8 (Frontend/Routing):** Ažuriran `ProjectPage.tsx`.

**Epic: MVP-3.5: Refaktoriranje Navigacije Projekta**
✅ **Zadatak 4.1 (Infrastruktura/Frontend):** Uvedene ugniježđene rute.
✅ **Zadatak 4.2 (Frontend):** `ProjectPage.tsx` pretvoren u "layout" komponentu.
✅ **Zadatak 4.3 (Frontend):** Ažuriran lijevi `Sidebar`.
✅ **Zadatak 4.4 (Frontend):** `IdeationForm` i `Phase2Form` prebačeni u `Outlet`.
✅ **Zadatak 4.5 (Frontend):** Osigurana logika automatskog spremanja.

**Epic: MVP-3: Faza 2 - Planiranje i Istraživanje**
✅ **Zadatak 3.1 (Backend):** Ažurirana `projects` tabela.
✅ **Zadatak 3.2 (Backend):** Proširena `PUT /api/projects/:projectId` ruta.
✅ **Zadatak 3.3 (Frontend):** Kreirana `Phase2Form.tsx`.
✅ **Zadatak 3.4 (Frontend):** Integrirana `Phase2Form.tsx`.

**Epic: MVP-2.5: Poboljšanja Faze 1**
✅ **Zadatak 2.5 (Backend/Frontend):** Ažurirana Faza 1.

**Epic: MVP-2: Faza 1 - Ideja i Koncept**
✅ Implementirana Faza 1 (Backend i Frontend).

**Epic: MVP-1: Dashboard i Upravljanje Projektima**
✅ Implementiran Dashboard i osnovni CRUD za projekte.

**Epic: MVP-0: Postavljanje Projekta**
✅ Inicijalizacija projekta i baze podataka.

## 3. Naš Tijek Rada (Workflow) - "The Perfect Workflow"
Slijedimo precizan, iterativni proces inspiriran najboljim praksama za rad s AI alatima.

1.  **Odabir Zadatka:** Izaberemo jedan zadatak iz [ TRENUTNO RADIMO ].
2.  **Planiranje (Novi Chat):**
    * Koristimo prompt "Planiranje Nove Značajke" iz `docs/COMMAND_PROMPTS.md`.
3.  **Pregled Plana (Plan Review):** Ovo je najvažniji korak. Detaljno analiziramo tehnički plan koji je AI generirao. Iteriramo i ispravljamo ga dok nismo 100% zadovoljni. Plan spremimo u novu datoteku (npr. `docs/plan-zadatak-1.1.md`).
4.  **Implementacija (Novi Chat):**
    * Dajemo AI-u odobreni plan i tražimo implementaciju.
    * Za veće "Epice", možemo razbiti implementaciju na faze (npr. prvo backend i baza, zatim frontend).
5.  **Pregled Koda (Code Review - Potpuno Novi Chat):**
    * Nakon implementacije, otvaramo potpuno novi, svježi chat.
    * Koristimo prompt "Pregled Koda" iz `docs/COMMAND_PROMPTS.md` da dobijemo nepristranu analizu.
    * Iteriramo s AI-em dok se svi uočeni problemi ne isprave.
6.  **Testiranje:** Ručno testiramo funkcionalnost u aplikaciji. Sve greške iz konzole lijepimo direktno u chat za brzo rješavanje.
7.  **Commit:** Kada je zadatak gotov i testiran, radimo `git commit` s jasnom porukom.
8.  **Ponavljanje:** Vraćamo se na korak 1 i uzimamo sljedeći zadatak.