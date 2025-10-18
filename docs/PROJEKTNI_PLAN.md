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
    * Na stranici projekta, ispod kartice za Fazu 1, prikazuje se nova kartica s naslovom "Faza 2: Planiranje i Istraživanje".
    * Unutar kartice se nalaze dva velika polja za unos (text area):
        * "Brainstorming": Za slobodno pisanje, mape uma, ideje za likove i zaplete.
        * "Istraživanje": Za bilješke o lokacijama, povijesnim događajima, i drugim istraživačkim materijalima.
    * Sustav automatskog spremanja funkcionira identično kao i za Fazu 1.
* **Logika i Podaci (Backend):**
    * Tabela `projects` u bazi podataka će se proširiti s dva nova tekstualna polja: `brainstorming` i `research`.
    * Postojeća backend API ruta `PUT /api/projects/:projectId` će se proširiti kako bi mogla primati i ažurirati ova dva nova polja.

#### Faza 3: Izgradnja Svijeta
(...detaljna razrada slijedi...)

#### Faza 4: Razvoj Likova
(...detaljna razrada slijedi...)

#### Faza 5: Strukturiranje Radnje
(...detaljna razrada slijedi...)

#### Faza 6: Završne Pripreme
(...detaljna razrada slijedi...)

## 2. Plan Razvoja i Praćenje Zadataka
Ovo je naša Kanban ploča. Zadatke ćemo prebacivati iz jedne kolone u drugu.

### [ ZADACI ZA ODRADITI (To-Do) ]

**Epic: MVP-4: Faza 3 - Izgradnja Svijeta**
(...ovdje ćemo definirati zadatke za izgradnju svijeta...)


### [ TRENUTNO RADIMO (In Progress) ]

**Epic: MVP-3.5: Refaktoriranje Navigacije Projekta**

* **Zadatak 4.1 (Infrastruktura/Frontend):** Uvesti ugniježđene rute (nested routes) koristeći `react-router-dom` za stranicu pojedinog projekta.
* **Zadatak 4.2 (Frontend):** Pretvoriti `ProjectPage.tsx` da služi kao "layout" komponenta. Ona će biti odgovorna za dohvaćanje podataka o projektu i sadržavat će `Sidebar` i `Outlet` za renderiranje aktivne faze.
* **Zadatak 4.3 (Frontend):** Ažurirati lijevi `Sidebar` (vjerojatno `ui/src/components/layout/Sidebar.tsx`) da prikazuje stvarne linkove za navigaciju između faza (npr. "Faza 1: Ideja", "Faza 2: Planiranje").
* **Zadatak 4.4 (Frontend):** Premjestiti `IdeationForm` i `Phase2Form` komponente tako da se renderiraju unutar `Outlet`-a na svojim specifičnim rutama (npr. `/projects/:projectId/ideation` i `/projects/:projectId/planning`).
* **Zadatak 4.5 (Frontend):** Osigurati da postojeća logika za dohvaćanje podataka i automatsko spremanje (`useDebouncedSave`, `handleFieldChange` itd.) koja se nalazi u `ProjectPage.tsx` i dalje ispravno funkcionira i prosljeđuje podatke u pod-komponente.

### [ ZAVRŠENO (Done) ]

**Epic: MVP-3: Faza 2 - Planiranje i Istraživanje**
✅ **Zadatak 3.1 (Backend):** Ažurirati `projects` tabelu u `schema.ts` s novim tekstualnim poljima `brainstorming` i `research`.
✅ **Zadatak 3.2 (Backend):** Proširiti `PUT /api/projects/:projectId` rutu kako bi prihvaćala i spremala podatke za `brainstorming` i `research`.
✅ **Zadatak 3.3 (Frontend):** Kreirati novu React komponentu, `Phase2Form.tsx`.
✅ **Zadatak 3.4 (Frontend):** Integrirati `Phase2Form.tsx` na stranicu projekta (`ProjectPage.tsx`) i povezati je s logikom za automatsko spremanje.

**Epic: MVP-2.5: Poboljšanja Faze 1**
✅ **Zadatak 2.5 (Backend/Frontend):** Ažurirati Fazu 1 s poljima za "Žanr" i "Ciljana Publika".

**Epic: MVP-2: Faza 1 - Ideja i Koncept**
✅ **Zadatak 2.0 (Infrastruktura):** Implementirati navigaciju i stranicu za prikaz pojedinačnog projekta.
✅ **Zadatak 2.1 (Backend):** Kreirati API rutu (`PUT /api/projects/:projectId`).
✅ **Zadatak 2.2 (Frontend):** Kreirati React komponentu (`IdeationForm.tsx`).
✅ **Zadatak 2.3 (Frontend):** Povezati formu s backendom i implementirati automatsko spremanje.

**Epic: MVP-1: Dashboard i Upravljanje Projektima**
✅ **Zadatak 1.1 (Backend):** Kreirati API rutu (`GET /api/projects`) koja dohvaća sve projekte za prijavljenog korisnika.
✅ **Zadatak 1.2 (Backend):** Kreirati API rutu (`POST /api/projects`) koja stvara novi, prazan projekt za prijavljenog korisnika.
✅ **Zadatak 1.3 (Frontend):** Dizajnirati i implementirati osnovni UI za Dashboard stranicu (`/dashboard`).
✅ **Zadatak 1.4 (Frontend):** Prikazati listu projekata dohvaćenih s backenda.
✅ **Zadatak 1.5 (Frontend):** Implementirati funkcionalnost gumba "+ Novi Projekt" koji poziva backend i osvježava listu.

**Epic: MVP-0: Postavljanje Projekta**
✅ Inicijalizacija projekta s `create-volo-app`.
✅ Konfiguracija `product-brief.md` i `.cursor-rules`.
✅ Definiranje i primjena sheme baze podataka.
✅ Uspješno postavljanje na GitHub.

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