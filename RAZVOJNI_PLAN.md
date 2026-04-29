# RAZVOJNI PLAN — story-architect-lite

**Datum kreiranja:** 2026-04-28
**Zadnje ažurirano:** 2026-04-29
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

- [ ] Kreirati testni projekt s minimumom konteksta (1 lik, 1 lokacija, premisa)
- [ ] Pokrenuti `db:populate` da se napune embeddinzi
- [ ] Generirati jednu scenu kroz puni pipeline
- [ ] Senad čita naglas, ocjenjuje
- [ ] Diskusija rezultata: nastavljamo ili refine humanization prompt?

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

### 2026-04-29

- Commit RAG cross-project fix + timeout izmjene + utility skripte pushano na origin/main (ce3ff3e)
- Provjereno stanje Neon baze i lokalnih migracija — migracija 0005_tiresome_slapstick (style_profiles) potvrđena primijenjena
- README ažuriran: Humanizer dodan u Stack i arhitektura dijagram, Faza 5 raspisana na 5-A/5-B/7-8
- Dead code cleanup: 22 fajla obrisana (knip 36→14), TS clean, pushano (5bd62b6)

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

---

## PRAVILA AŽURIRANJA

1. **Ne brišemo.** Samo dodajemo ili mijenjamo `[ ]` u `[x]`.
2. **Datumiramo** sve čekirano — npr. `[x] Nešto (2026-04-28)`.
3. **Spoznaje** idu u sekciju "Spoznaje tijekom rada", ne u checkliste.
4. **Blokade** idu u sekciju "Blokade / Problemi" s objašnjenjem.
5. **Novi prioriteti** se dodaju na dno liste prioriteta s 🆕 oznakom.
6. **Velike promjene plana** — kratak unos u "Povijest revizija".