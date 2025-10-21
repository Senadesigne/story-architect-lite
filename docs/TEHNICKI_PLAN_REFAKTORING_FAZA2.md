# TEHNIČKI PLAN: Refaktoring i Tehnički Dug - Faza 2

**Datum kreiranja:** 21. listopad 2025  
**Zadaci:** 1.6, 1.7, 1.8, 1.9 iz PROJEKTNI_PLAN_v2.md  
**Epic:** Refaktoring i Tehnički Dug - Faza 2 🟡

## Pregled Trenutnog Stanja

### ✅ Već Implementirano:
- Centralizirani error handler u `server/src/middleware/errorHandler.ts`
- Custom error klase (ValidationError, NotFoundError, UnauthorizedError, DatabaseError)
- Error handler registriran u `api.ts` s `app.onError(errorHandler)`
- TypeScript tipovi definirani u `server/src/types/api.ts`
- Neki endpoint-i već koriste novi error handling (npr. `requireValidUUID`)

### 🔄 Treba Refaktorirati:
- Većina endpoint-a još uvijek koristi stari try-catch pristup
- Duplicirana UUID validacija u svakom endpoint-u
- Nedosljednost u error handling-u između endpoint-a
- Nema Zod validacije za request body
- Nema unit testova
- Nema database indeksa za optimizaciju

---

## ZADATAK 1.6: Refaktorirati sve API endpoint-e da koriste novi error handling

### Cilj:
Ukloniti duplicirani kod i standardizirati error handling u svim API endpoint-ima.

### Koraci implementacije:

#### 1.6.1: Proširiti error handling middleware
**Datoteka:** `server/src/middleware/errorHandler.ts`

**Dodati nove helper funkcije:**
- `requireProjectOwnership(db, projectId, userId)` - provjera vlasništva projekta
- `requireResourceOwnership(db, resourceType, resourceId, userId)` - generička provjera vlasništva
- `handleDatabaseOperation(operation)` - wrapper za database operacije s error handling-om

#### 1.6.2: Kreirati validation middleware
**Nova datoteka:** `server/src/middleware/validation.ts`

**Funkcije za kreiranje:**
- `validateProjectId()` - middleware za validaciju project ID parametra
- `validateResourceId(resourceType)` - generički middleware za validaciju resource ID-a
- `validateRequestBody(schema)` - middleware za validaciju request body-ja

#### 1.6.3: Refaktorirati User endpoint-e
**Datoteka:** `server/src/api.ts` (linije 44-85)

**Endpoint-i za refaktoriranje:**
- `PUT /api/user` (linija 44)
- `DELETE /api/user` (linija 71)

**Promjene:**
- Ukloniti try-catch blokove
- Koristiti `handleDatabaseOperation()` wrapper
- Bacati custom error-e umjesto vraćanja JSON odgovora

#### 1.6.4: Refaktorirati Project endpoint-e
**Datoteka:** `server/src/api.ts` (linije 88-261)

**Endpoint-i za refaktoriranje:**
- `GET /api/projects` (linija 88) - već je jednostavan, samo dodati error handling
- `POST /api/projects` (linija 102)
- `PUT /api/projects/:projectId` (linija 147) - već koristi `requireValidUUID`, proširiti
- `DELETE /api/projects/:projectId` (linija 228)

**Promjene:**
- Ukloniti dupliciranu UUID validaciju
- Koristiti `validateProjectId()` middleware
- Ukloniti try-catch blokove
- Koristiti `requireProjectOwnership()` helper

#### 1.6.5: Refaktorirati Location endpoint-e
**Datoteka:** `server/src/api.ts` (linije 264-448)

**Endpoint-i za refaktoriranje:**
- `GET /api/projects/:projectId/locations` (linija 264)
- `POST /api/projects/:projectId/locations` (linija 301)
- `PUT /api/locations/:locationId` (linija 350)
- `DELETE /api/locations/:locationId` (linija 410)

#### 1.6.6: Refaktorirati Character endpoint-e
**Datoteka:** `server/src/api.ts` (linije 453-649)

**Endpoint-i za refaktoriranje:**
- `GET /api/projects/:projectId/characters` (linija 453)
- `POST /api/projects/:projectId/characters` (linija 490)
- `PUT /api/characters/:characterId` (linija 545)
- `DELETE /api/characters/:characterId` (linija 611)

#### 1.6.7: Refaktorirati Scene endpoint-e
**Datoteka:** `server/src/api.ts` (linije 654-843)

**Endpoint-i za refaktoriranje:**
- `GET /api/projects/:projectId/scenes` (linija 654)
- `POST /api/projects/:projectId/scenes` (linija 692)
- `PUT /api/scenes/:sceneId` (linija 743)
- `DELETE /api/scenes/:sceneId` (linija 805)

### Očekivani rezultat:
- Svi endpoint-i koriste standardizirani error handling
- Uklonjen duplicirani kod za UUID validaciju
- Konzistentan pristup error handling-u kroz cijeli API
- Kraći i čitljiviji kod u endpoint-ima

---

## ZADATAK 1.7: Implementirati Zod validaciju za request body tipove

### Cilj:
Dodati runtime validaciju za sve request body tipove koristeći Zod biblioteku.

### Koraci implementacije:

#### 1.7.1: Instalirati Zod
**Naredba:**
```bash
cd server && pnpm add zod
```

#### 1.7.2: Kreirati Zod sheme
**Nova datoteka:** `server/src/schemas/validation.ts`

**Sheme za kreiranje:**
- `UpdateUserBodySchema` - validacija za user update
- `UpdateProjectBodySchema` - validacija za project update
- `CreateLocationBodySchema` - validacija za kreiranje lokacije
- `UpdateLocationBodySchema` - validacija za ažuriranje lokacije
- `CreateCharacterBodySchema` - validacija za kreiranje lika
- `UpdateCharacterBodySchema` - validacija za ažuriranje lika
- `CreateSceneBodySchema` - validacija za kreiranje scene
- `UpdateSceneBodySchema` - validacija za ažuriranje scene

#### 1.7.3: Kreirati validation middleware
**Proširiti datoteku:** `server/src/middleware/validation.ts`

**Dodati funkciju:**
- `validateBody(schema: ZodSchema)` - middleware za validaciju request body-ja

#### 1.7.4: Integrirati Zod validaciju u endpoint-e
**Datoteka:** `server/src/api.ts`

**Za svaki endpoint koji prima request body:**
- Dodati `validateBody()` middleware s odgovarajućom shemom
- Ukloniti manualne validacije (npr. `if (!name || name.trim() === '')`)

#### 1.7.5: Ažurirati TypeScript tipove
**Datoteka:** `server/src/types/api.ts`

**Promjene:**
- Dodati `z.infer<typeof Schema>` tipove za sve sheme
- Zadržati postojeće interface-e za kompatibilnost

### Očekivani rezultat:
- Runtime validacija svih request body podataka
- Detaljnije error poruke za validacijske greške
- Automatska TypeScript tipizacija iz Zod shema
- Uklonjen duplicirani validation kod

---

## ZADATAK 1.8: Dodati unit testove za error handling middleware

### Cilj:
Kreirati sveobuhvatan test suite za error handling middleware i validation funkcije.

### Koraci implementacije:

#### 1.8.1: Instalirati test ovisnosti
**Naredbe:**
```bash
cd server && pnpm add -D vitest @vitest/ui c8 supertest @types/supertest
```

#### 1.8.2: Konfigurirati Vitest
**Nova datoteka:** `server/vitest.config.ts`

**Konfiguracija:**
- Test environment setup
- Coverage konfiguracija
- Path aliases

#### 1.8.3: Kreirati test utilities
**Nova datoteka:** `server/src/test/helpers.ts`

**Helper funkcije:**
- `createTestApp()` - kreiranje test Hono aplikacije
- `createMockUser()` - kreiranje mock korisnika
- `createMockDatabase()` - mock database setup

#### 1.8.4: Testovi za error handler middleware
**Nova datoteka:** `server/src/middleware/__tests__/errorHandler.test.ts`

**Test scenariji:**
- Test svih custom error klasa (ValidationError, NotFoundError, etc.)
- Test default error handling-a
- Test JSON parsing error-a
- Test UUID validation error-a
- Test error logging funkcionalnosti

#### 1.8.5: Testovi za validation middleware
**Nova datoteka:** `server/src/middleware/__tests__/validation.test.ts`

**Test scenariji:**
- Test UUID validacije
- Test project ownership validacije
- Test resource ownership validacije
- Test Zod schema validacije

#### 1.8.6: Integration testovi za API endpoint-e
**Nova datoteka:** `server/src/__tests__/api.integration.test.ts`

**Test scenariji:**
- Test error handling-a u stvarnim API pozivima
- Test authentication error-a
- Test validation error-a
- Test database error-a

#### 1.8.7: Dodati test skripte
**Datoteka:** `server/package.json`

**Dodati skripte:**
- `"test": "vitest"`
- `"test:ui": "vitest --ui"`
- `"test:coverage": "vitest --coverage"`
- `"test:watch": "vitest --watch"`

### Očekivani rezultat:
- 90%+ code coverage za error handling middleware
- Automatski testovi za sve validation funkcije
- Integration testovi za API endpoint-e
- CI/CD ready test suite

---

## ZADATAK 1.9: Optimizirati database query performanse (dodati indekse)

### Cilj:
Analizirati i optimizirati database performanse dodavanjem potrebnih indeksa.

### Koraci implementacije:

#### 1.9.1: Analizirati trenutne query-je
**Alat:** Ručna analiza `server/src/api.ts`

**Query-ji za analizu:**
- Dohvaćanje projekata po userId
- Dohvaćanje lokacija po projectId
- Dohvaćanje likova po projectId
- Dohvaćanje scena po projectId (s ORDER BY)
- JOIN query-ji za ownership provjere

#### 1.9.2: Kreirati database indekse
**Nova datoteka:** `server/drizzle/0010_add_performance_indexes.sql`

**Indeksi za dodavanje:**
- `CREATE INDEX idx_projects_user_id ON projects(user_id);`
- `CREATE INDEX idx_locations_project_id ON locations(project_id);`
- `CREATE INDEX idx_characters_project_id ON characters(project_id);`
- `CREATE INDEX idx_scenes_project_id ON scenes(project_id);`
- `CREATE INDEX idx_scenes_order ON scenes(project_id, "order");`
- `CREATE INDEX idx_scenes_location_id ON scenes(location_id);`
- `CREATE INDEX idx_users_email ON users(email);`

#### 1.9.3: Ažurirati Drizzle schema
**Datoteka:** `server/src/schema/schema.ts`

**Dodati index definicije:**
- Koristiti Drizzle `index()` funkciju za definiranje indeksa
- Dodati composite indekse gdje je potrebno

#### 1.9.4: Kreirati migraciju
**Naredbe:**
```bash
cd server && pnpm db:generate
cd server && pnpm db:push
```

#### 1.9.5: Optimizirati postojeće query-je
**Datoteka:** `server/src/api.ts`

**Optimizacije:**
- Dodati `LIMIT` klauzule gdje je primjereno
- Koristiti `select()` s eksplicitnim poljima umjesto `select()`
- Optimizirati JOIN query-je za ownership provjere

#### 1.9.6: Kreirati performance monitoring
**Nova datoteka:** `server/src/middleware/performance.ts`

**Funkcionalnosti:**
- Query execution time logging
- Slow query detection
- Performance metrics collection

#### 1.9.7: Dodati database connection pooling
**Datoteka:** `server/src/lib/db.ts`

**Optimizacije:**
- Konfigurirati connection pool settings
- Dodati connection timeout konfiguraciju
- Implementirati connection retry logiku

### Očekivani rezultat:
- 50%+ poboljšanje performansi za česte query-je
- Optimizirani indeksi za sve glavne access pattern-e
- Performance monitoring i alerting
- Skalabilna database konfiguracija

---

## Redoslijed Implementacije

### Faza 1: Error Handling Refaktoring (2-3 dana)
1. **Dan 1:** Zadatak 1.6.1-1.6.3 (Middleware i User endpoint-i)
2. **Dan 2:** Zadatak 1.6.4-1.6.5 (Project i Location endpoint-i)
3. **Dan 3:** Zadatak 1.6.6-1.6.7 (Character i Scene endpoint-i)

### Faza 2: Zod Validacija (1-2 dana)
4. **Dan 4:** Zadatak 1.7.1-1.7.3 (Setup i sheme)
5. **Dan 5:** Zadatak 1.7.4-1.7.5 (Integracija)

### Faza 3: Unit Testovi (2-3 dana)
6. **Dan 6:** Zadatak 1.8.1-1.8.3 (Setup i utilities)
7. **Dan 7:** Zadatak 1.8.4-1.8.5 (Middleware testovi)
8. **Dan 8:** Zadatak 1.8.6-1.8.7 (Integration testovi)

### Faza 4: Database Optimizacija (1 dan)
9. **Dan 9:** Zadatak 1.9.1-1.9.7 (Analiza, indeksi, monitoring)

## Napomene za Implementaciju

### Kompatibilnost:
- Sve promjene moraju biti backward compatible
- Postojeći frontend kod ne smije se pokvariti
- Postupno refaktoriranje endpoint po endpoint

### Testiranje:
- Testirati svaki refaktorirani endpoint prije prelaska na sljedeći
- Koristiti postojeće frontend aplikacije za integration testiranje
- Provjeriti da svi postojeći API pozivi još uvijek rade

### Performance:
- Mjeriti performance prije i nakon optimizacija
- Koristiti database query analyzer za validaciju indeksa
- Monitorirati memory usage tijekom refaktoriranja

### Error Handling:
- Zadržati postojeće error poruke za frontend kompatibilnost
- Poboljšati logging za lakše debugging
- Dodati structured logging za production monitoring

## Definicija Završetka (Definition of Done)

### Zadatak 1.6 - Završen kada:
- ✅ Svi endpoint-i koriste centralizirani error handling
- ✅ Uklonjen sav duplicirani validation kod
- ✅ Svi endpoint-i bacaju custom error-e umjesto vraćanja JSON-a
- ✅ Manual testing potvrđuje da svi endpoint-i rade

### Zadatak 1.7 - Završen kada:
- ✅ Zod sheme definirane za sve request body tipove
- ✅ Svi endpoint-i koriste Zod validaciju
- ✅ TypeScript tipovi generirani iz Zod shema
- ✅ Validation error-i vraćaju detaljne poruke

### Zadatak 1.8 - Završen kada:
- ✅ 90%+ code coverage za error handling middleware
- ✅ Unit testovi za sve validation funkcije
- ✅ Integration testovi za sve API endpoint-e
- ✅ Svi testovi prolaze u CI/CD pipeline-u

### Zadatak 1.9 - Završen kada:
- ✅ Database indeksi dodani za sve glavne query-je
- ✅ Performance poboljšanje dokumentirano s metrikama
- ✅ Query execution time monitoring implementiran
- ✅ Database connection pooling optimiziran

---

**Ukupno procijenjeno vrijeme:** 8-9 radnih dana  
**Prioritet:** 🟡 Važno (poboljšava kvalitetu)  
**Ovisnosti:** Nema blokera, može se raditi paralelno s drugim zadacima
