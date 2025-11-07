# Projektni Plan v2: Story Architect Lite - Post-MVP Faza

Ovaj dokument je naš centralni sustav za praćenje zadataka post-MVP faze. Za detaljne tehničke specifikacije i primjere koda, pogledajte `TEHNIČKA_SPECIFIKACIJA_v2.md`.

## Legenda
- 🔴 Kritično (blokira druge zadatke)
- 🟡 Važno (poboljšava kvalitetu)
- 🟢 Korisno (nice-to-have)

## [ ZADACI ZA ODRADITI (To-Do) ]

### Epic: AI Integracija - Faza A (Direktni API) 🔴

### Epic: UI/UX Poboljšanja 🟢
* **Zadatak 2.1:** Dodati vizualni indikator trenutne faze u navigaciji
* **Zadatak 2.2:** Implementirati tooltipove i help tekstove za sva polja
* **Zadatak 2.3:** Dodati dark mode podršku
* **Zadatak 2.4:** Optimizirati komponente za mobilne uređaje


### Epic: AI Integracija - Faza B (Orkestrator) 🟢
* **Zadatak 3.7 (NOVI):** Korak 1 - Postavljanje LangGraph.js i definiranje AgentState-a
* **Zadatak 3.8 (NOVI):** Korak 2 - Implementacija RAG čvorova (transform_query i retrieve_context)
* **Zadatak 3.9 (NOVI):** Korak 3 - Implementacija Usmjeravanja (route_task i handle_simple_retrieval)
* **Zadatak 3.10 (NOVI):** Korak 4 - Implementacija 'Reflection' petlje (generate_draft, critique_draft, refine_draft)
* **Zadatak 3.11 (NOVI):** Korak 5 - Finalna evaluacija i testiranje (Evals)

### Epic: Tehnički Dug - Faza 3 (Post-AI) 🟢
* **Zadatak 4.1:** Popraviti preostala 4 neuspjela AI integration testa iz `server/src/__tests__/ai.integration.test.ts`. Testovi su pali zbog problema s mockingom.
* **Zadatak 4.2:** Popraviti tipizaciju u `api.ts`. Trenutno `getValidatedBody(c)` vraća `{}` umjesto pravilno tipiziranog objekta, što uzrokuje TypeScript greške u testovima.
* **Zadatak 4.3:** Riješiti preostale generalne TypeScript greške u kodu koje je AI prijavio tijekom refaktoringa (greške nevezane za specifične zadatke).


## [ TRENUTNO RADIMO (In Progress) ]

_Trenutno nema zadataka u tijeku._

## [ ZAVRŠENO (Done) ]

### Epic: Održavanje Projektnih Dokumenata 🔴
* **Zadatak 0.1:** Ažurirati `product-brief.md` - dodati "AI Co-Writer" u dugoročnu viziju
* **Zadatak 0.2:** Ažurirati `.cursorrules` - dodati pravila za AI integraciju
* **Zadatak 0.3:** Ažurirati `COMMAND_PROMPTS.md` - dodati prompt za "Planiranje AI Značajke"
* **Zadatak 0.4:** Preimenovati postojeći PROJEKTNI_PLAN_v2.md u TEHNIČKA_SPECIFIKACIJA_v2.md ⚪ Odbačeno (Odluka: Zadržati oba filea)

### Epic: AI Integracija - Faza A (Direktni API) 🔴
* **Zadatak 3.1:** Instalirati AI biblioteke (`openai`, `@anthropic-ai/sdk`, `axios`) ✅
* **Zadatak 3.2:** Kreirati AI service sloj (`server/src/services/ai.service.ts`) - Tehnički plan kreiran u `TEHNICKI_PLAN_AI_FAZA_A.md` ✅
* **Zadatak 3.3:** Implementirati `POST /api/projects/:projectId/ai/generate-scene-synopsis` ✅
* **Zadatak 3.4:** Implementirati `POST /api/ai/test` (Proof of Concept) ✅
* **Zadatak 3.5:** Integrirati AI funkcionalnost u frontend (Phase5Form.tsx) ✅
* **Zadatak 3.6:** Dizajnirati arhitekturu za hibridni AI orkestrator (Arhitektura v2.0 - Stateful Graf definirana u TEHNICKI_PLAN_AI_FAZA_B_v2.md) ✅

### Epic: MVP Implementacija ✅
* Sve faze (1-6) implementirane i testirane
* CRUD operacije za projekte, likove, lokacije i scene
* Autosave funkcionalnost
* Firebase autentifikacija
* PostgreSQL baza podataka s Drizzle ORM
* Deployment ready (Cloudflare Workers)

### Epic: Post-MVP Code Review (P1 i P2) ✅
* Riješene sve kritične TypeScript greške
* Implementirana DELETE ruta za projekte
* Popravljena Faza 6 (POV radio button)
* Riješeni React Hook upozorenja

### Epic: Multi-User Podrška ✅
* Proširena users tablica s dodatnim poljima
* Implementirani API endpoint-i za upravljanje korisnicima
* Kreiran Zustand store za user state management
* Dodano token caching za bolje performanse
* Implementiran session timeout s automatskim logout-om
* Kreirana UserProfileForm i RegisterForm komponenta
* Integrirana ProtectedRoute komponenta
* Ažurirane postojeće stranice za korištenje novih komponenti

### Epic: Refaktoring i Tehnički Dug - Faza 1 ✅
* **Zadatak 1.1:** Ukloniti neiskorištene `project` propove iz Form komponenti ✅
* **Zadatak 1.2:** Ukloniti neiskorištenu `charactersToScenes` tablicu i relacije ✅
* **Zadatak 1.3:** Provjeriti postojanje ESLint konfiguracije za backend ✅
* **Zadatak 1.4:** Implementirati centralizirani error handling (globalni Hono middleware) ✅
* **Zadatak 1.5:** Zamijeniti `any` tipove s jakim TypeScript tipovima u `api.ts` ✅
* **Zadatak 1.0:** Kreirati `database-server/docker-compose.yml` za PostgreSQL setup ✅

### Epic: Refaktoring i Tehnički Dug - Faza 2 ✅
* **Zadatak 1.6:** Refaktorirati sve API endpoint-e da koriste novi error handling ✅ Dovršeno
* **Zadatak 1.7:** Implementirati Zod validaciju za request body tipove ✅ Dovršeno
* **Zadatak 1.8:** Dodati unit testove za error handling middleware ✅ Dovršeno
* **Zadatak 1.9:** Optimizirati database query performanse (dodati indekse) ✅ Dovršeno
* **Zadatak TBD:** Popraviti logiku i validaciju za `POST /api/projects` (Riješen bug s hardkodiranim imenom i popravljen `validation.ts` middleware) ✅

## Prioriteti Implementacije

### Faza 1: Dokumentacija (0.5 dana)
- Zadaci 0.1 - 0.4
- Kritično za jasno usmjeravanje budućeg rada

### Faza 2: Tehnički Dug - Faza 1 (1-2 dana) ✅
- Zadaci 1.0 - 1.5 ✅
- Poboljšava kvalitetu koda prije dodavanja novih značajki

### Faza 2b: Tehnički Dug - Faza 2 (1-2 dana) ✅
- Zadaci 1.6 - 1.9 ✅
- Dodatno poboljšanje kvalitete i performansi

### Faza 3: AI Proof of Concept (2-3 dana)
- Zadaci 3.1 - 3.4
- Validacija AI integracije prije pune implementacije

### Faza 4: Puna AI Integracija (3-5 dana)
- Zadatak 3.5
- Integracija AI-ja u korisničko sučelje

### Faza 5: UI/UX Poboljšanja (po potrebi)
- Zadaci 2.1 - 2.4
- Može se raditi paralelno s drugim zadacima

### Faza 6: Orkestrator (budućnost)
- Zadaci 3.6 - 3.9
- Samo nakon uspješne implementacije Faze A

## Napomene

- Za tehničke detalje svakog zadatka, pogledajte `TEHNIČKA_SPECIFIKACIJA_v2.md`
- Ažurirajte ovaj dokument svaki put kada prebacite zadatak između kolona
- Koristite git commit poruke koje referenciraju broj zadatka (npr. "Zadatak 1.1: Uklonjen neiskorišten project prop")

## Napomene za Korisnika - Post Refaktoring

### ✅ Završeno u Refaktoring Fazi 1:
- **Database Setup:** Kreiran `database-server/docker-compose.yml` - PostgreSQL baza je sada dostupna
- **Error Handling:** Implementiran centralizirani error handler - samo jedan endpoint refaktoriran kao primjer
- **TypeScript:** Uklonjeni svi `any` tipovi - kreiran `server/src/types/api.ts` s jakim tipovima
- **Schema Cleanup:** Uklonjena neiskorištena `charactersToScenes` tablica
- **Code Quality:** ESLint konfiguracija provjerena i aktivna

### ✅ Završeno u Refaktoring Fazi 2:
- **Error Handling:** Refaktorirani svi API endpoint-i da koriste novi error handling pattern ✅
- **Validacija:** Dodana Zod validacija za sve request body tipove ✅
- **Testiranje:** Kreirani unit testovi za error handling middleware ✅
- **Performanse:** Optimizirani database query-ji dodavanjem indeksa ✅

### 🚀 Baza Podataka:
- PostgreSQL pokrenut preko Docker Compose u `database-server/` direktoriju
- Sve migracije uspješno primijenjene
- Aplikacija spremna za korištenje

## Workflow Podsjetnik

1. **Odaberi zadatak** iz To-Do kolone
2. **Prebaci ga** u In Progress
3. **Pregledaj** tehničku specifikaciju ako je potrebno
4. **Implementiraj** rješenje
5. **Testiraj** funkcionalnost
6. **Commit** s jasnom porukom
7. **Prebaci** zadatak u Done
8. **Ponovi** proces

---

## NOVI ZADACI (Tehnički Dug - Otkriveno u Fazi Refaktoringa 2)

_Trenutno nema novih zadataka._