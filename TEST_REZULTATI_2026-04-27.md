# Story Architect Lite — Test Sesija 2026-04-27

## Rezultati testova

### 1. Planner
- [x] Projekt se učitava (lutajuci planet)
- [x] Faze 0-6 vidljive
- [x] AI Co-author gumb radi (nakon fix timeoutova i parsinga)
- Rezultat: RADI uz napomene - sesija se ne resetira pri promjeni polja

### 2. AI Sidebar
- [x] Model dropdown pokazuje Claude Sonnet 4.6
- [x] Brainstorming mod odgovara
- [x] Planner mod odgovara
- [x] Humanization toggle vidljiv (samo u Planner modu — ispravno)
- Rezultat: RADI ali Brainstorming je prespor

### 3. Humanization Layer
- [ ] Toggle ON radi
- [ ] Output kvaliteta
- [ ] Timing s humanizacijom vs bez
- Rezultat:

### 4. Studio / Editor
- [x] Editor se učitava i prima tekst
- [ ] Contextual edit — AI Akcije popup se pojavi, ali selekcija se NE prosljeđuje AI-ju (traži tekst ponovo umjesto da transformira selektirani)
- [ ] Auto-save — nema vidljive indikacije da je tekst spremljen
- Rezultat: DJELOMIČNO RADI

### 5. CRUD (Likovi / Lokacije / Poglavlja / Scene)
- [ ] Kreiranje radi
- [ ] Lista vidljiva u sidebaru
- Rezultat:

### 6. Settings
- [ ] Writing Style Profile vidljiv
- [ ] Upload writing samplea radi
- Rezultat:

## Pronađeni problemi
| # | Dio aplikacije | Što se dogodilo | Što sam očekivao | Prioritet |
| 1 | Planner - AI Co-author | Kad se prebacim s Theme na Premise polje, stari chat ostaje otvoren s kontekstom prethodnog polja. Trebalo bi resetirati sesiju ili otvoriti novi chat kad se promijeni planner kontekst. | Novi chat za svako polje | Srednji |
| 2 | Planner - Accept dugme | Funkcija "Accept?" koja ubacuje AI odgovor u polje — kliknuo sam X umjesto Accept, trebam provjeriti radi li Accept ispravno | Provjera potrebna | Srednji |
| 3 | Ollama timeout/parsing | Timeout bio 15s (premalo za Qwen3), parser nije čitao thinking format. POPRAVLJENO — timeout 120s, parser podržava array i string content. | - | Riješeno |
| 4 | Brainstorming | Brainstorming ide kroz puni pipeline (Manager→Worker→Critique) umjesto direktnog API poziva. Prespor za "brzi chat". | Direktan Sonnet API poziv, bez pipeline-a | Visoki |
| 5 | Brainstorming - Save | Save dugme nudi spremanje cijelog odgovora bez mogućnosti odabira pojedine ideje. Nejasno gdje se sprema. | Omogućiti odabir + jasna destinacija (npr. bilješke projekta) | Srednji |
| 7 | Humanization toggle u Planneru | Humanization toggle je vidljiv u Planner modu — nema smisla jer planner sadržaj je interni i ne objavljuje se. Humanizacija treba biti dostupna SAMO u Studio/Writer modu gdje se piše finalni tekst koji ide u objavu. | Sakriti toggle u Planner i Brainstorming modu | Srednji |
| 8 | Studio - Contextual Edit | AI Akcije (npr. promjena tona) ne prima selektirani tekst. AI traži tekst ponovo umjesto da transformira selekciju. | Selektirani tekst treba ići u AI prompt automatski | Visoki |
| 9 | Studio - Auto-save | Nema vidljive indikacije da je tekst spremljen (kvačica, "Saved" poruka) | Dodati auto-save indikator | Niski |
| 10 | Chief Editor - model | Piše "Gemini 1.5 Pro" — treba ažurirati model i nastaviti razvijati ovu funkciju | Ažurirati na noviji Gemini model | Srednji |

## Sljedeći koraci
