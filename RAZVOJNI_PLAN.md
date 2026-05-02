# RAZVOJNI PLAN — story-architect-lite

**Datum kreiranja:** 2026-04-28
**Zadnje ažurirano:** 2026-05-01
**Status:** ŽIVI DOKUMENT
**Vlasnik:** Senad
**Suradnik:** Claude (Sonnet 4.7) + Claude Code

---

## Kako koristiti ovaj dokument

Ovo je checklist. Kad se nešto završi — Claude Code samo zamijeni `[ ]` u `[x]` i doda datum. Ništa se ne briše. Spoznaje i bilješke idu u zasebne sekcije na dnu.

**Statusi:**
- `[ ]` — nije počelo
- `[~]` — u tijeku
- `[x]` — završeno (uvijek dodaj datum)
- `[!]` — blokirano (objasni u Bilješkama)

---

## TRENUTNO STANJE

### Što radi

- [x] Faza 1 — kritični bugovi
- [x] Faza 2 — AI Factory unifikacija
- [x] Faza 3 — hibridni env config (Ollama + Anthropic)
- [x] Faza 5A — Humanization Layer temelj
- [x] Faza 5B — humanizationNode + graph routing
- [x] LangGraph pipeline kompletan
- [x] RAG embeddings (nomic-embed-text, pgvector, 768 dim)
- [x] Auth (Firebase) + DB (Drizzle ORM)

### Što je u tijeku

- [~] Faza 4 — cleanup tehničkog duga
- [ ] 3 uncommitted fajla: timeout.ts, nodes.ts, ollama.provider.ts
- [ ] 4 untracked fajla treba registrirati
- [ ] README ažurirati (prikazuje Fazu 5 kao PENDING — netočno)

---

## PRIORITETI

### Prioritet 1 — RAG curenje između projekata ✅

- [x] Dodati `projectId` u AgentState (2026-04-28)
- [x] Proširiti `createInitialState` (2026-04-28)
- [x] Proslijediti projectId u routeu (2026-04-28)
- [x] Filter u `getRelevantContext` (2026-04-28)
- [x] Ažurirati nodes.ts pozive (2026-04-28)
- [x] TypeScript prolazi (2026-04-28)
- [x] Obrisani test podaci iz baze (2026-04-28)
- [x] Commit izmjena (2026-04-29)
- [ ] Test u praksi (treba upaljen HPE #1 + napunjeni embeddinzi)

---

### Prioritet 2 — Faza 4 cleanup + commit pending izmjena

- [x] Commit 3 modificirana fajla (2026-04-29)
- [x] Registrirati 4 untracked fajla (2026-04-29)
- [x] Ažurirati README (2026-04-29)
- [x] Provjeriti da li je migracija 0007_add_style_profile.sql primijenjena (2026-04-29) — stvarno ime: 0005_tiresome_slapstick, primijenjena
- [x] Identificirati i obrisati dead code (Claude Code prijedlog) (2026-04-29)

**Procjena:** 0.5 dana

---

### Prioritet 2.5 🆕 — UI fix: Writer kao primarni mode

**Problem:** U Studio modu nema direktnog pristupa Writer assistantu.
Korisnik mora kliknuti "Brainstorming" gumb pa unutar AI Assistant panela
prebaciti tab na "Writer". Writer je primarni mode za generiranje sadržaja
i mora biti default ili barem jednako dostupan kao Brainstorming.

**Otkriveno:** 2026-04-29 tijekom P4 pre-flight testa.

- [x] Identificirati komponentu koja sadrži gumbe "Planner | Studio | Brainstorming | Chief Editor" u top baru (2026-04-29)
- [x] Dodati "Writer" gumb pored "Brainstorming" (ili promijeniti default tab u AI Assistant panelu na Writer) (2026-04-29)
- [x] Provjeriti da klik na Writer otvara AI Assistant s aktivnim Writer tabom (2026-04-29)
- [x] Vizualno testirati u oba teme (2026-04-30)

**Procjena:** 1-2h
**Preduvjet:** nema (UI only)

---

### Prioritet 2.6 🆕 — Lokalizacija UI stringova na engleski

**Problem:** Tržište je engleski (vidi PROJECT_VISION). Više UI stringova je
ostalo na hrvatskom: "Humanizacija (Qwen)", "Pišem...", potencijalno drugi.

**Otkriveno:** 2026-04-29 tijekom P4 pre-flight testa.

- [x] Grep cijeli ui/src/ za hrvatske stringove (2026-04-30)
- [x] Lista svih hrvatskih stringova s lokacijama (2026-04-30)
- [x] Zamijeniti engleskim ekvivalentima (2026-04-30)
- [x] TypeScript provjera + build (2026-04-30)
- [x] Vizualni pregled u Studiu i Planneru (2026-04-30)

**Procjena:** 1-2h
**Preduvjet:** nema (UI only)
**Napomena:** Ovo je quick fix bez i18n infrastrukture. Pravi i18n (više
jezika kroz library tipa react-i18next) ostavljamo za kasnije ako bude
potreba.

---

### Prioritet 3 — Faza 5 dovršetak (Korak 7 + 8)

- [ ] Korak 7 — Style Profile API (CRUD za writing samples)
  - [ ] POST /api/users/writing-samples
  - [ ] GET /api/users/writing-samples
  - [ ] DELETE /api/users/writing-samples/:id
- [ ] Korak 8 — Settings UI komponenta WritingSamplesManager.tsx
  - [ ] Upload uzoraka
  - [ ] Pregled uzoraka
  - [ ] Brisanje uzoraka

**Procjena:** 4-6h
**Preduvjet:** HPE #1 upaljen za testiranje

---

### Prioritet 4 — Eksperiment kvalitete (reality check)

- [x] Kreirati testni projekt s minimumom konteksta (2026-04-30)
- [x] Pokrenuti `db:populate` da se napune embeddinzi (2026-04-30)
- [x] Generirati jednu scenu kroz puni pipeline (2026-04-30)
- [x] Senad čita naglas, ocjenjuje (2026-04-30)
- [x] Diskusija rezultata: nastavljamo bez promjena (2026-04-30)

**Procjena:** 1-2h
**Preduvjet:** HPE #1 upaljen, Prioritet 1 commit-an

---

### Prioritet 5 — System/user prompt split

- [ ] Refaktor anthropic.provider.ts (system parametar odvojen od user)
- [ ] Refaktor ollama.provider.ts (system parametar odvojen od user)
- [ ] Ažurirati pozive u nodes.ts
- [ ] TypeScript provjera
- [ ] Test da postojeća funkcionalnost nije promijenjena

**Procjena:** 2-3h

---

### Prioritet 6 — Story Bible / Canon Tracker

**Veliki posao.** Tehnički plan ide u zasebni dokument kad budemo spremni.

Visoki nivo:

- [ ] Schema dizajn — story_events, scene_characters, character_states, story_facts
- [ ] DB migracija
- [ ] Critique Agent: ekstrakcija events iz generirane scene
- [ ] Retriever: Bible context u svaki poziv
- [ ] Critique Agent: continuity check task
- [ ] UI — opcionalan timeline pregled
- [ ] E2E test sa scenom kroz puni pipeline + canon tracking

**Procjena:** 2-3 tjedna
**Cilj:** Midjourney-style konzistencija likova kroz cijelu knjigu

---

### Prioritet 7 — Automatsko re-indexiranje

- [ ] Trigger u routeu — PUT/PATCH na character → re-embed
- [ ] Trigger u routeu — PUT/PATCH na scene → re-embed
- [ ] Trigger u routeu — PUT/PATCH na location → re-embed
- [ ] Test da stari embedding bude obrisan, novi kreiran

**Procjena:** 0.5 dana
**Status:** Nije hitno dok je Senad jedini korisnik

---

### Prioritet 8 — Blog Article Writer (Multi-Agent) 🆕

**Pristup:** Multi-Agent Orchestrator po uzoru na Anthropicov "How we built our multi-agent research system" (lipanj 2025).

**4 agenta:**
1. **Editor-in-Chief** (Qwen lokalno) — planira istraživanje, dijeli temu na 3 angle-a, sintetizira mini-dossiere u finalni brief
2. **3x Researcher** (Qwen + Tavily, paralelno) — svaki istražuje svoj angle, vraća mini-dossier s citatima
3. **Writer** (Sonnet 4.6) — piše cijeli članak iz briefa odjednom (1M context, prompt caching)
4. **Citation Agent** (Qwen lokalno) — provjeri da svaka tvrdnja u članku ima izvor u dossieru

**UI:** Novi 'Blog' tab u alatu, odvojen od Studio (fikcije). Dijele auth, bazu, infrastrukturu. Pipeline i UI su odvojeni.

**Bez Humanizera** — uključuje se kasnije kad bude dovršen i validiran.

#### Tjedan 1 — Skeleton + Editor-in-Chief

- [x] Nove DB tablice — `blog_articles`, `blog_research_dossiers` (2026-05-02)
- [x] Drizzle migracija (2026-05-02)
- [ ] Nova ruta `/blog` + `/blog/:id`
- [ ] UI: Blog tab, lista članaka, forma za novi članak (tema + audience)
- [ ] Editor-in-Chief LangGraph node (Qwen) — generira plan: keyword + 3 angle-a
- [ ] UI: korisnik potvrđuje plan prije nego krene research

#### Tjedan 2 — Paralelni Researcheri + Tavily

- [ ] Tavily API integracija (search + extract u jednom pozivu)
- [ ] Tavily account, API key u env
- [ ] LangGraph fan-out — 3 paralelna Researcher node-a
- [ ] Svaki Researcher: 3-5 query-ja, extract sadržaja, mini-dossier output
- [ ] Error handling: ako jedan Researcher padne, ostala dva nastavljaju
- [ ] Sinteza mini-dossiera natrag u Editor-in-Chief (finalni brief s citatima)

#### Tjedan 3 — Writer (Sonnet)

- [ ] Writer LangGraph node (Sonnet 4.6)
- [ ] Anthropic prompt caching za dossier (obavezno — bez ovog cijena 5x)
- [ ] Writer dobiva: brief + outline + dossier
- [ ] Output: cijeli članak s H2/H3 strukturom, FAQ blokom, meta description
- [ ] Spremanje u `blog_articles` tablicu
- [ ] UI: prikaz članka u editoru

#### Tjedan 4 — Citation Agent + UI polish

- [ ] Citation Agent LangGraph node (Qwen)
- [ ] Provjera: svaka konkretna tvrdnja (broj, datum, citat) ima referencu na URL iz dossiera
- [ ] Output: lista zastavica (claim → status: ✅ verified / ⚠️ unverified)
- [ ] UI: highlight zastavica u editoru, klik na zastavicu otvara izvor
- [ ] SEO meta polja u UI-u (title, description, OG tags)
- [ ] Export članka kao markdown ili HTML (copy-to-clipboard)

#### Tjedan 5 — Buffer + SaaS priprema

- [ ] Test s 3-5 pravih tema (osobne stranice)
- [ ] Cost tracking — provjera stvarne cijene po članku
- [ ] LiteLLM Gateway integracija (priprema za cloud Qwen kad bude SaaS)
- [ ] Switch lokalno/cloud Qwen kao config
- [ ] Dokumentacija u README

**Procjena:** 4-5 tjedana
**Preduvjet:** HPE #1 upaljen (sva 4 Qwen agenta su lokalna), Anthropic API key, Tavily API key
**Cijena po članku:** ~$0.45-0.65 (Tavily $0.12 + Sonnet s caching $0.30-0.50)
**Mjesečno za 20 članaka:** ~$10-15

**Cilj:** Funkcionalan alat za autonomno pisanje istraživanih članaka. Dugoročno: ponuda kao SaaS uz dijeljenu LiteLLM infrastrukturu.

---

## SPOZNAJE TIJEKOM RADA

_Ovdje idu otkrića o sustavu — stvari koje smo naučili i koje su važne za buduće odluke._

**2026-04-28:**
- `graph.ts` je posrednički sloj između route-a i state-a — `runStoryArchitectGraph` mora primiti projectId i proslijediti ga u `createInitialState`
- Test endpointi (/ai/test-rag, /ai/test-graph, /ai/test-agent) koriste hardcoded `'test'` projectId — TODO za buduće čišćenje
- Tablica `story_architect_embeddings` bila je prazna prije fixa — čisti reset bio je najjednostavniji put umjesto backfilla
- LangChain PGVectorStore (verzija 0.3.57) sintaksa za filter: `similaritySearch(query, k, { projectId })` — treći argument je plain objekt
- Manager Agent u `managerContextNode` po modu (planner/writer/brainstorming/contextual-edit) sastavlja različite kontekste — ovo je ključno mjesto za buduće optimizacije

---

## BLOKADE / PROBLEMI

_Ako nešto ne ide, opiši ovdje da znamo zaobići ili tražiti pomoć._

_(prazno)_

---

## DNEVNIK NAPRETKA

### 2026-05-02

- P8 W1 (DB sloj) — kreirane tablice `blog_articles` (14 kolona) i `blog_research_dossiers` (9 kolona) u server/src/schema/schema.ts
- Drizzle migracija 0006_icy_excalibur.sql generirana i primijenjena na lokalnu bazu
- FK relacije: blog_articles.user_id → users.id (cascade), blog_research_dossiers.article_id → blog_articles.id (cascade)
- Indeksi: idx_blog_articles_user_id, idx_blog_research_dossiers_article_id
- relations() blokovi dodani za navigacijski API
- Verificirano u bazi: information_schema.columns + pg_indexes + drizzle journal — sve sinkronizirano
- Sljedeće: nova ruta `/blog` + `/blog/:id` (backend + frontend skeleton)

---

### 2026-05-01

- P4 eksperiment kvalitete PASS — scena generirana za Ninth Ring kroz puni pipeline (Manager→Worker→Critique→Humanizer). Output bez AI klišeja, prirodan ritam. Humanization radi.
- P2.5 i P2.6 vizualno potvrđeni
- Sljedeće: P3 (Style Profile API + UI)

---

### 2026-04-30

- P2.5 zatvoren prethodnog dana (Brainstorming → AI Co-Author, Writer default tab + bonus session memory)
- P2.6 implementiran: ~150 hrvatskih stringova prevedeno na engleski u 21 fajlu
- AI prompts u FloatingMenuUI prevedeni na engleski (utječe na AI ponašanje — buduće generacije idu s EN instrukcijama)
- Phase3 worldbuilding options prevedeni — stari projekti s HR section titlovima ostaju legacy
- Auto-generated naslova prevedeni — postojeći HR naslovi u bazi preserved (no data migration)
- useSessionTimeout potvrđen kao live hook (App.tsx)
- Build i typecheck PASS
- Vizualni pregled je preostao — Senad provjerava manualno prije zatvaranja P2.6
- Sljedeće: P4 (eksperiment kvalitete) — sad valjano testiranje na engleskom kad UI bude vizualno potvrđen

---

### 2026-04-29

- Commit RAG cross-project fix + timeout izmjene + utility skripte pushano na origin/main (ce3ff3e)
- Provjereno stanje Neon baze i lokalnih migracija — migracija 0005_tiresome_slapstick (style_profiles) potvrđena primijenjena
- README ažuriran: Humanizer dodan u Stack i arhitektura dijagram, Faza 5 raspisana na 5-A/5-B/7-8
- Dead code cleanup: 22 fajla obrisana (knip 36→14), TS clean, pushano (5bd62b6)
- P4 pre-flight: pokušaj generirati scenu otkrio UX bug (Writer skriven iza Brainstorming) i hrvatske UI stringove
- Dodani novi prioriteti P2.5 (UI fix) i P2.6 (lokalizacija) prije P4
- Test napravljen na hrvatskom — humanization stack je dizajniran za engleski, P4 se mora ponoviti na engleskom kad UI bude spreman
- Bilješka: humanization toggle možda primjenjuje stanje tek od sljedećeg poziva (provjeriti tijekom P4)

---

### 2026-04-28

- Kreiran razvojni plan
- Identificiran kritični problem: RAG cross-project leak
- Potvrđeno preko Claude Code analize: `projectId` se gubi između route-a i grafa
- Obrisani test podaci iz baze (3 projekta, 5 chapters, 4 scenes, 2 characters)
- ✅ RAG fix implementiran u 6 fajlova
- TypeScript prolazi bez grešaka
- LangChain filter sintaksa potvrđena iz source-a biblioteke

---

## POVIJEST REVIZIJA

| Datum | Verzija | Što se promijenilo |
|---|---|---|
| 2026-04-28 | 1.0 | Inicijalna verzija s checkbox formatom |
| 2026-04-29 | 1.1 | Dodani P2.5 (UI Writer fix) i P2.6 (lokalizacija) — P4 odgođen dok UI ne bude spreman za pošten test |
| 2026-04-30 | 1.2 | P2.5 i P2.6 implementirani — UI spreman za pošten P4 test |
| 2026-05-01 | 1.3 | P4 PASS — quality experiment potvrđen, P2.5 i P2.6 vizualno zatvoreni |
| 2026-05-02 | 1.4 | Dodan P8 — Blog Article Writer (Multi-Agent), Anthropic-aligned arhitektura |
| 2026-05-02 | 1.5 | P8 W1 task 1 — DB tablice za Blog Article Writer (blog_articles, blog_research_dossiers) primijenjene |

---

## PRAVILA AŽURIRANJA

1. **Ne brišemo.** Samo dodajemo ili mijenjamo `[ ]` u `[x]`.
2. **Datumiramo** sve čekirano — npr. `[x] Nešto (2026-04-28)`.
3. **Spoznaje** idu u sekciju "Spoznaje tijekom rada", ne u checkliste.
4. **Blokade** idu u sekciju "Blokade / Problemi" s objašnjenjem.
5. **Novi prioriteti** se dodaju na dno liste prioriteta s 🆕 oznakom.
6. **Velike promjene plana** — kratak unos u "Povijest revizija".