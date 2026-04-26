⚠️ ARHIV — zamijenjen aktualnim README.md i MASTER_PLAN_REFAKTORIRANJA.md.
Incident opisan ovdje je riješen. Dokument ostaje kao historijska referenca.

---

# SYSTEM DOSSIER: Story Architect Lite - Production Incident Report

**Datum:** 4. Siječanj 2026.
**Status:** 🔴 CRITICAL (Production 500 Error)
**Verzija:** v2.1.0-hotfix

---

## 1. Arhitektura Projekta (High-Level Overview)

Sustav je moderna web aplikacija za pisanje priča, izgrađena na Monorepo arhitekturi.

### Tehnološki Stack
*   **Frontend:** React (Vite), TypeScript, TailwindCSS.
*   **Backend:** Hono (Node.js/Serverless compatible), TypeScript.
*   **Baza Podataka:** Neon (Serverless Postgres).
*   **ORM:** Drizzle ORM (tipizirani SQL).
*   **Autentifikacija:** Firebase Auth (korisnički tokeni se validiraju na backendu, korisnik se sinkronizira u Postgres).
*   **Hosting:** Vercel (Frontend & Backend functions).

### Data Flow
1.  **Korisnik (Frontend):** Inicira akciju (npr. "Create Project").
2.  **Auth Layer:** Frontend šalje Firebase ID Token u `Authorization` headeru.
3.  **Backend (Hono):**
    *   `authMiddleware` verificira token.
    *   Provjerava postoji li korisnik u `users` tablici (Postgres). Ako ne, kreira ga (On-the-fly sync).
4.  **API Handler (`/api/projects`):**
    *   Validira body zahtjeva (Zod).
    *   Izvršava `db.insert(projects)...returning()`.
5.  **Baza (Neon):** Izvršava SQL upit, vraća sve kolone (`RETURNING *`).

---

## 2. Povijest Problema i Kronologija

Projekt je prošao kroz nekoliko faza brzog razvoja, što je dovelo do "drift-a" sheme baze.

*   **Faza 0 (Inicijalna):** Postojalo je polje `logline`.
*   **Faza 1-6 (Ekspanzija):** Dodana su mnoga nova polja (`premise`, `theme`, `beat_sheet_*`, `story_idea`...). Polje `logline` je odlučeno biti uklonjeno.
*   **Incident:** Nakon mergeanja `feature-clean-ui` grane, produkcija je počela vraćati 500 Error na `POST /api/projects`.

### Pokušaji Popravka (Kronološki)
1.  **Standardizacija Migracija:** Uveden `drizzle-kit` direktno umjesto wrapper skripti.
2.  **Fix 500 Error (Pokušaj 1):** Otkriveno da kod traži obrisani `logline`. Kod očišćen.
    *   *Rezultat:* GitHub Action prolazi, ali API i dalje pada.
3.  **Fix Drizzle Journal (Pokušaj 2):** Drizzle journal je bio korumpiran (referencirao obrisanu migraciju). Ručno popravljen JSON.
    *   *Rezultat:* Migracije uspješno prolaze na CI/CD.
4.  **Sync Schema (Pokušaj 3 - Trenutni):** Otkriveno da produkcijskoj bazi nedostaju ne samo nova polja, već i neka starija ("Faza 1").
    *   Kreirana "catch-all" migracija `0001_sync_schema.sql` koja koristi `ADD COLUMN IF NOT EXISTS` za sva polja.

---

## 3. Trenutno Stanje (The "Gap")

Ovo je srž problema koji treba analizirati.

*   **GitHub Actions:** ✅ Javlja "Success". Tvrdi da je migracija `0001_sync_schema.sql` izvršena.
*   **Vercel:** ✅ Deployment "Ready".
*   **Runtime:** ❌ `POST /api/projects` baca 500.

### Hipoteza
Iako GitHub Action kaže "Success", postoji šansa da se migracija izvršila nad *krivom bazom* (npr. Preview umjesto Prod) ili da Drizzle Client na Vercelu koristi *stare* artifakte/metapodatke i generira krive upite, bez obzira na stvarno stanje baze. Druga mogućnost je da "catch-all" migracija nije pokrila *sve* što kod očekuje (iako smo dodali `premise`, `theme` itd.).

---

## 4. Tehničke Specifikacije (Za Analizu)

### A. Izvadak Sheme (`server/src/schema/schema.ts`)
Ovo je "Truth" - ono što backend očekuje da baza ima.

```typescript
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 256 }).notNull(),
  // ... timestamps & userId ...
  
  // OČEKIVANA POLJA (Ako bilo koje fali u bazi, RETURNING * puca!)
  story_idea: text('story_idea'),
  premise: text('premise'),
  theme: text('theme'),
  genre: text('genre'),
  audience: text('audience'),
  brainstorming: text('brainstorming'),
  research: text('research'),
  rules_definition: text('rules_definition'),
  culture_and_history: text('culture_and_history'),
  synopsis: text('synopsis'),
  outline_notes: text('outline_notes'),
  beat_sheet_setup: text('beat_sheet_setup'),
  // ... ostali beat_sheet ...
  point_of_view: text('point_of_view'),
});
// NAPOMENA: 'logline' NE POSTOJI ovdje.
```

### B. Izvadak API Rute (`server/src/api.ts`)
Mjesto gdje nastaje greška.

```typescript
app.post('/api/projects', validateBody(CreateProjectBodySchema), async (c) => {
  // ... auth ...
  const newProject = await handleDatabaseOperation(async () => {
    // INSERT samo title i userId
    const [result] = await db
      .insert(projects)
      .values({
        title: name,
        userId: user.id,
      })
      .returning(); // <--- OVDJE PUCA! Drizzle radi "RETURNING *"

    return result;
  });
  return c.json(newProject, 201);
});
```

### C. Primijenjena Migracija (`server/drizzle/0001_sync_schema.sql`)
Posljednji pokušaj sinkronizacije (Manual Force).

```sql
-- Manually created migration to synchronize DB schema with Codebase [Forced Update 3]
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "premise" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "theme" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "genre" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "audience" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "point_of_view" text;
-- ... (sva ostala polja iz Faze 2-6) ...
ALTER TABLE "projects" DROP COLUMN IF EXISTS "logline";
```

### D. Ključne Varijable Okruženja
*   `DATABASE_URL`: Connection string za Neon (Mora biti `sslmode=require` za produkciju).
*   `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: Alternative za spajanje.
*   `VITE_API_URL`: URL backenda.

---

**Preporuka za Vanjskog Analitičara:**
Fokusirajte se na nesklad između onoga što `db.insert(...).returning()` traži od baze i onoga što baza *stvarno* sadrži nakon izvršenja gornje SQL skripte. Provjerite Postgres logove za točnu grešku ("column X does not exist").
