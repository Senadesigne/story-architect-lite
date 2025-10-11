Projektni Plan: Story Architect Lite
Ovaj dokument je naš centralni "mozak" projekta. Služi kao detaljna funkcionalna specifikacija i sustav za praćenje zadataka. Svaki put kada započinjemo novi chat, ovaj dokument će biti glavni kontekst.

1. Detaljna Funkcionalna Specifikacija
Ovdje ćemo detaljno razraditi svaku od 6 faza aplikacije. Cilj je da za svaki korak znamo točno kako treba izgledati i funkcionirati.

Faza 1: Ideja i Koncept
Korisničko iskustvo (Frontend):

Prikazuje se jednostavna forma s velikim, jasnim naslovom "Faza 1: Ideja i Koncept".

Forma sadrži 4 polja za unos (text area): Premisa, Tema, Žanr, Logline.

Svako polje ima jasan label iznad sebe i koristan placeholder tekst unutar polja koji vodi korisnika (npr. "Sažmite svoju priču u jednu uzbudljivu rečenicu.").

Nema "Spremi" dugmeta. Sve promjene se automatski spremaju u pozadini. Suptilni indikator ("Spremljeno ✓") se pojavljuje nakon unosa.

Logika i Podaci (Backend):

Kada korisnik unese tekst, frontend šalje PUT zahtjev na API rutu (npr. /api/projects/:projectId).

Backend prima podatke i ažurira odgovarajuća polja (logline, premise, theme) u projects tabeli u bazi podataka za taj projekt.

Faza 2: Planiranje i Istraživanje
Korisničko iskustvo (Frontend):

(Ovdje ćemo detaljno opisati kako izgleda modul za brainstorming i istraživanje)

Logika i Podaci (Backend):

(Ovdje ćemo opisati kako se spremaju bilješke)

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
Epic: MVP-2: Faza 1 - Ideja i Koncept

Zadatak 2.1 (Backend): Kreirati API rutu (PUT /api/projects/:projectId) koja prima i sprema podatke za logline, premise, theme u bazu.

Zadatak 2.2 (Frontend): Kreirati React komponentu (IdeationForm.tsx) koja prikazuje formu za Fazu 1.

Zadatak 2.3 (Frontend): Povezati formu s backendom i implementirati automatsko spremanje.

Epic: MVP-3: Faza 4 - Razvoj Likova

(...ovdje ćemo definirati zadatke za likove...)

[ TRENUTNO RADIMO (In Progress) ]
Epic: MVP-1: Dashboard i Upravljanje Projektima

Zadatak 1.2 (Backend): Kreirati API rutu (POST /api/projects) koja stvara novi, prazan projekt za prijavljenog korisnika.

Zadatak 1.3 (Frontend): Dizajnirati i implementirati osnovni UI za Dashboard stranicu (/dashboard).

Zadatak 1.4 (Frontend): Prikazati listu projekata dohvaćenih s backenda.

Zadatak 1.5 (Frontend): Implementirati funkcionalnost gumba "+ Novi Projekt" koji poziva backend i osvježava listu.

[ ZAVRŠENO (Done) ]
Epic: MVP-1: Dashboard i Upravljanje Projektima

✅ Zadatak 1.1 (Backend): Kreirati API rutu (GET /api/projects) koja dohvaća sve projekte za prijavljenog korisnika.

[ ZAVRŠENO (Done) ]
Epic: MVP-0: Postavljanje Projekta

✅ Inicijalizacija projekta s create-volo-app.

✅ Konfiguracija product-brief.md i .cursor-rules.

✅ Definiranje i primjena sheme baze podataka.

✅ Uspješno postavljanje na GitHub.


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