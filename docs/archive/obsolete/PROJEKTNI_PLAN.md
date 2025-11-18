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
        1.  **"Sinopsis":** Jedno veliko `textarea` polje.
        2.  **"Izrada Okvira Radnje (Bilješke)":** Jedno veliko `textarea` polje.
        3.  **"Popis Scena":** UI komponenta za upravljanje (CRUD) scenama.
        4.  **"Vizualizacija Strukture Tri Čina":** Prikaz statične slike/dijagrama.
    * Polja "Sinopsis" i "Bilješke" koriste sustav automatskog spremanja (`useDebouncedSave` iz `ProjectPage.tsx`).
* **Logika i Podaci (Backend):**
    * **`projects` Tabela:** Proširena s dva tekstualna polja: `synopsis` i `outline_notes`.
    * **Postojeći API (`PUT /api/projects/:projectId`):** Proširen da ažurira `synopsis` i `outline_notes`.
    * **Novi API (Scene):** Kreirane CRUD API rute za upravljanje `scenes` tabelom.

#### Faza 6: Završne Pripreme
* **Korisničko iskustvo (Frontend):**
    * Prikazuje se nova kartica "Faza 6: Završne Pripreme" na ruti `/projects/:projectId/finalization`.
    * Kartica sadrži **samo jedan** dio: "Odabir Pripovjedača (Point of View - POV)".
    * Implementirano kao `Accordion` s `RadioGroup` opcijama.
    * Odabir se automatski sprema u pozadini.
* **Logika i Podaci (Backend):**
    * **`projects` Tabela:** Proširena s `text` poljem: `point_of_view`. Uklonjena boolean polja.
    * **Postojeći API (`PUT /api/projects/:projectId`):** Ažuriran da podržava `point_of_view`.

## 2. Plan Razvoja i Praćenje Zadataka
Ovo je naša Kanban ploča. Zadatke ćemo prebacivati iz jedne kolone u drugu.

### [ ZADACI ZA ODRADITI (To-Do) ]

**Epic: Post-MVP: Daljnja Poboljšanja Kvalitete Koda**
* **Zadatak 10.3 (Refactor/Frontend):** Ukloniti neiskorištene `project` propove iz Form komponenti (`IdeationForm`, `Phase2Form`, `Phase6Form`).
* **Zadatak 10.4 (Refactor/Backend):** Ukloniti neiskorištenu `characters_to_scenes` tablicu i relacije iz `schema.ts` (i pokrenuti migracije).
* **Zadatak 10.5 (Refactor):** Standardizirati Error Handling kroz cijelu aplikaciju (frontend i backend).
* **Zadatak 10.6 (Infrastruktura/Backend):** Dodati ESLint konfiguraciju i `lint` skriptu u `server/package.json`.
* **Zadatak 10.7 (Refactor/Frontend):** Riješiti React Hook (`exhaustive-deps`) i Fast Refresh upozorenja.
* **Zadatak 10.8 (Refactor/Frontend):** Poboljšati čišćenje timeouta u `ProjectPage.tsx` i riješiti potencijalni race condition.
* **Zadatak 10.9 (Backend/Frontend):** Dodati validaciju maksimalne duljine za input polja gdje je to primjenjivo.

**Epic: Post-MVP: Nove Značajke**
(...ovdje ćemo definirati zadatke nakon završetka MVP-a, npr. Export, AI integracije...)


### [ TRENUTNO RADIMO (In Progress) ]

**Epic: Post-MVP: Poboljšanja Kvalitete Koda (Prioritet 1 & 2)**

* **Zadatak 10.1 (Refactor/Frontend):** Popraviti 15 TypeScript linter grešaka (`@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`) u UI komponentama.
* **Zadatak 10.2 (Backend/Sigurnost):**
    * **10.2.1:** Implementirati `DELETE /api/projects/:projectId` rutu s provjerom vlasništva.
    * **10.2.2:** Zamijeniti `any` tipove s jakim TypeScript tipovima u `server/src/api.ts` (npr. kreirati `interface` za request body).


### [ ZAVRŠENO (Done) ]

**Epic: MVP-7 (Refactor): Faza 6 - Završne Pripreme (v2)**
✅ **Zadatak 9.1 (Backend/Baza):** Ažuriran `schema.ts`. Uklonjena 3 boolean polja, dodano `point_of_view`.
✅ **Zadatak 9.2 (Backend/Baza):** Pokrenute `db:generate` i `db:migrate` (ili `db:push`) migracije.
✅ **Zadatak 9.3 (Backend):** Ažurirana `PUT /api/projects/:projectId` ruta.
✅ **Zadatak 9.4 (Frontend/Refactor):** Ažuriran `ProjectPage.tsx` (uklonjen `handleBooleanChange`, ažuriran state/tipovi).
✅ **Zadatak 9.5 (Frontend):** Instalirane `shadcn/ui` komponente `accordion` i `radio-group`.
✅ **Zadatak 9.6 (Frontend/Refactor):** Prepisana `Phase6Form.tsx` koristeći `Accordion` i `RadioGroup`.
✅ **Zadatak 9.7 (Frontend/Refactor):** Ažuriran poziv `Phase6Form` unutar `ProjectPage.tsx`.
✅ **Zadatak 9.8 (Bug Fix):** Riješen problem s migracijom korištenjem `db:push`.

**Epic: MVP-6: Faza 5 - Strukturiranje Radnje**
✅ Implementirana Faza 5 (hibridni pristup sa `textarea` i CRUD-om za Scene).
✅ Riješen bug s nedostajućim stupcima.

**Epic: MVP-5: Faza 4 - Razvoj Likova**
✅ Implementirana Faza 4 (CRUD za Likove).
✅ Riješen bug s nedostajućom `dialog` komponentom.

**Epic: MVP-4: Faza 3 - Izgradnja Svijeta**
✅ Implementirana Faza 3 (hibridni pristup s `textarea` i CRUD-om za Lokacije).

**Epic: MVP-3.5: Refaktoriranje Navigacije Projekta**
✅ Implementirano refaktoriranje navigacije (ugniježđene rute).

**Epic: MVP-3: Faza 2 - Planiranje i Istraživanje**
✅ Implementirana Faza 2 (`brainstorming`, `research`).

**Epic: MVP-2.5: Poboljšanja Faze 1**
✅ Ažurirana Faza 1 s "Žanr" i "Ciljana Publika".

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