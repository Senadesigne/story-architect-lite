Projektni Plan: Story Architect Lite
Ovaj dokument je naš centralni "mozak" projekta. Služi kao detaljna funkcionalna specifikacija i sustav za praćenje zadataka. Svaki put kada započinjemo novi chat, ovaj dokument će biti glavni kontekst.

1. Detaljna Funkcionalna Specifikacija
Ovdje ćemo detaljno razraditi svaku od 6 faza aplikacije. Cilj je da za svaki korak znamo točno kako treba izgledati i funkcionirati.

1. Detaljna Funkcionalna Specifikacija
Faza 1: Ideja i Koncept
Korisničko iskustvo (Frontend):

Prikazuje se forma unutar kartice s naslovom "Faza 1: Ideja i Koncept".

Forma sadrži polja za unos: Logline, Tema, Premisa, Žanr i Ciljana Publika.

Sve promjene se automatski spremaju u pozadini.

Logika i Podaci (Backend):

Backend ažurira odgovarajuća polja (logline, theme, premise, genre, audience) u projects tabeli.

Faza 2: Planiranje i Istraživanje
Korisničko iskustvo (Frontend):

Na stranici projekta, ispod kartice za Fazu 1, prikazuje se nova kartica s naslovom "Faza 2: Planiranje i Istraživanje".

Unutar kartice se nalaze dva velika polja za unos (text area):

"Brainstorming": Za slobodno pisanje, mape uma, ideje za likove i zaplete.

"Istraživanje": Za bilješke o lokacijama, povijesnim događajima, i drugim istraživačkim materijalima.

Sustav automatskog spremanja funkcionira identično kao i za Fazu 1.

Logika i Podaci (Backend):

Tabela projects u bazi podataka će se proširiti s dva nova tekstualna polja: brainstorming i research.

Postojeća backend API ruta PUT /api/projects/:projectId će se proširiti kako bi mogla primati i ažurirati ova dva nova polja.

Faza 3: Izgradnja Svijeta
(...detaljna razrada slijedi...)

Faza 4: Razvoj Likova
(...detaljna razrada slijedi...)

Faza 5: Strukturiranje Radnje
(...detaljna razrada slijedi...)

Faza 6: Završne Pripreme
(...detaljna razrada slijedi...)

2. Plan Razvoja i Praćenje Zadataka
Ovo je naša Kanban ploča. Zadatke ćemo prebacivati iz jedne kolone u drugu.

[ ZADACI ZA ODRADITI (To-Do) ]

Epic: MVP-3: Faza 4 - Razvoj Likova

(...ovdje ćemo definirati zadatke za likove...)

[ TRENUTNO RADIMO (In Progress) ]

Epic: MVP-3: Faza 2 - Planiranje i Istraživanje

Zadatak 3.1 (Backend): Ažurirati projects tabelu u schema.ts s novim tekstualnim poljima brainstorming i research. Primijeniti promjene na bazu.

Zadatak 3.2 (Backend): Proširiti PUT /api/projects/:projectId rutu kako bi prihvaćala i spremala podatke za brainstorming i research.

Zadatak 3.3 (Frontend): Kreirati novu React komponentu, npr. Phase2Form.tsx, koja sadrži karticu i dva Textarea polja za Fazu 2.

Zadatak 3.4 (Frontend): Integrirati Phase2Form.tsx na stranicu projekta (ProjectPage.tsx) i povezati je s postojećom logikom za automatsko spremanje.

[ ZAVRŠENO (Done) ]
Epic: MVP-0: Postavljanje Projekta

✅ Inicijalizacija projekta s create-volo-app.

✅ Konfiguracija product-brief.md i .cursor-rules.

✅ Definiranje i primjena sheme baze podataka.

✅ Uspješno postavljanje na GitHub.

[ ZAVRŠENO (Done) ]
Epic: MVP-1: Dashboard i Upravljanje Projektima

✅ Zadatak 1.1 (Backend): Kreirati API rutu (GET /api/projects) koja dohvaća sve projekte za prijavljenog korisnika.

✅ Zadatak 1.2 (Backend): Kreirati API rutu (POST /api/projects) koja stvara novi, prazan projekt za prijavljenog korisnika.

✅ Zadatak 1.3 (Frontend): Dizajnirati i implementirati osnovni UI za Dashboard stranicu (/dashboard).

✅ Zadatak 1.4 (Frontend): Prikazati listu projekata dohvaćenih s backenda.

✅ Zadatak 1.5 (Frontend): Implementirati funkcionalnost gumba "+ Novi Projekt" koji poziva backend i osvježava listu.

[ ZAVRŠENO (Done) ]
Epic: MVP-2: Faza 1 - Ideja i Koncept

✅ Zadatak 2.0 (Infrastruktura): Implementirati navigaciju i stranicu za prikaz pojedinačnog projekta.
✅ Zadatak 2.1 (Backend): Kreirati API rutu (PUT /api/projects/:projectId) koja prima i sprema podatke za logline, premise, theme u bazu.
✅ Zadatak 2.2 (Frontend): Kreirati React komponentu (IdeationForm.tsx) koja prikazuje formu za Fazu 1.
✅ Zadatak 2.3 (Frontend): Povezati formu s backendom i implementirati automatsko spremanje.

[ ZAVRŠENO (Done) ]
Epic: MVP-2.5: Poboljšanja Faze 1

✅ Zadatak 2.5 (Backend/Frontend): Ažurirati Fazu 1 s poljima za "Žanr" i "Ciljana Publika". To uključuje ažuriranje baze (schema.ts), PUT rute i ProjectPage.tsx forme, osiguravajući da su i postojeća polja (Logline, Tema, Premisa) zadržana.

3. Naš Tijek Rada (Workflow) - "The Perfect Workflow"
Slijedimo precizan, iterativni proces inspiriran najboljim praksama za rad s AI alatima.

Odabir Zadatka: Izaberemo jedan zadatak iz [ TRENUTNO RADIMO ].

Planiranje (Novi Chat):

Koristimo prompt "Planiranje Nove Značajke" iz docs/COMMAND_PROMPTS.md.

Pregled Plana (Plan Review): Ovo je najvažniji korak. Detaljno analiziramo tehnički plan koji je AI generirao. Iteriramo i ispravljamo ga dok nismo 100% zadovoljni. Plan spremimo u novu datoteku (npr. docs/plan-zadatak-1.1.md).

Implementacija (Novi Chat):

Dajemo AI-u odobreni plan i tražimo implementaciju.

Za veće "Epice", možemo razbiti implementaciju na faze (npr. prvo backend i baza, zatim frontend).

Pregled Koda (Code Review - Potpuno Novi Chat):

Nakon implementacije, otvaramo potpuno novi, svježi chat.

Koristimo prompt "Pregled Koda" iz docs/COMMAND_PROMPTS.md da dobijemo nepristranu analizu.

Iteriramo s AI-em dok se svi uočeni problemi ne isprave.

Testiranje: Ručno testiramo funkcionalnost u aplikaciji. Sve greške iz konzole lijepimo direktno u chat za brzo rješavanje.

Commit: Kada je zadatak gotov i testiran, radimo git commit s jasnom porukom.

Ponavljanje: Vraćamo se na korak 1 i uzimamo sljedeći zadatak.