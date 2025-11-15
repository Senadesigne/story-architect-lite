# Tehnički Plan C.1: Chat API Endpoint

**Značajka:** Implementacija novog, zaštićenog API endpointa `POST /api/projects/:projectId/chat` koji služi kao produkcijski ulaz za AI Orkestrator (LangGraph).

**Datum:** 15. studenog 2025  
**Status:** Planiranje  

---

## 1. VALIDACIJA (Zod Schema)

### 1.1 Dodavanje nove Zod sheme u `server/src/schemas/validation.ts`

**Datoteka za izmjenu:** `server/src/schemas/validation.ts`

**Koraci:**
1. Dodati novu Zod shemu na kraj AI VALIDATION SCHEMAS sekcije (nakon `GenerateSceneSynopsisBodySchema`)
2. Definirati `ChatRequestBodySchema` s jednim obaveznim poljem:
   - `userInput: z.string().min(1, 'User input is required').trim()`
3. Dodati inferred type `ChatRequestBody` u INFERRED TYPES sekciju
4. Eksportirati novu shemu i tip

**Lokacija u datoteci:** Linija ~99, nakon `GenerateSceneSynopsisBodySchema`

---

## 2. API RUTA (Hono Framework)

### 2.1 Kreiranje nove rute u `server/src/api.ts`

**Datoteka za izmjenu:** `server/src/api.ts`

**Koraci:**
1. Importirati novu `ChatRequestBodySchema` iz `./schemas/validation`
2. Dodati novu rutu u AI ENDPOINTS sekciju (nakon postojećeg AI koda, oko linije 796)
3. Konfigurirati rutu s middlewareima:
   - `aiRateLimiter.middleware()` - postojeći rate limiter za AI pozive
   - `validateBody(ChatRequestBodySchema)` - validacija request body-ja
4. Ruta mora biti zaštićena postojećim `authMiddleware` (već je registriran globalno za `/api/*`)

**Lokacija u datoteci:** Linija ~796, u AI ENDPOINTS sekciji

---

## 3. LOGIKA ENDPOINTA

### 3.1 Implementacija handler funkcije unutar nove rute

**Koraci:**
1. **Dohvaćanje parametara:**
   - `const user = c.get('user')` - korisnik iz auth middleware
   - `const projectId = c.req.param('projectId')` - ID projekta iz URL-a
   - `const { userInput } = getValidatedBody(c)` - validirani input iz body-ja

2. **Validacija parametara:**
   - `requireValidUUID(projectId, 'project ID')` - provjera UUID formata
   - `await requireProjectOwnership(db, projectId, user.id)` - provjera vlasništva

3. **Database setup:**
   - `const databaseUrl = getDatabaseUrl()`
   - `const db = await getDatabase(databaseUrl)`

---

## 4. IZGRADNJA KONTEKSTA

### 4.1 Implementacija `buildProjectContext` u `server/src/services/context.builder.ts`

**Datoteka za izmjenu:** `server/src/services/context.builder.ts`

**Koraci:**
1. Implementirati `buildProjectContext` metodu (trenutno je TODO na liniji 82)
2. Koristiti Drizzle ORM s `with` relacijama za efikasno dohvaćanje:
   ```typescript
   const projectData = await db.query.projects.findFirst({
     where: eq(tables.projects.id, projectId),
     with: {
       characters: true,
       locations: true,
       scenes: {
         with: {
           location: true
         }
       }
     }
   })
   ```
3. Vratiti `ProjectContext` objekt s formatiranim podacima

### 4.2 Formatiranje konteksta u string

**Koraci:**
1. Dodati novu helper metodu `formatProjectContextToString` u `ContextBuilder` klasu
2. Metoda treba formatirati `ProjectContext` objekt u čitljiv string koji sadrži:
   - Osnovne informacije o projektu (naslov, logline, premise, tema, žanr)
   - Popis svih likova s njihovim karakteristikama
   - Popis svih lokacija s opisima
   - Popis svih scena s redoslijedom i povezanim lokacijama
3. Koristiti jasno strukturiran format koji AI može lako parsirati

---

## 5. POZIVANJE AI GRAFA

### 5.1 Integracija s postojećim AI grafom

**Koraci:**
1. Importirati potrebne funkcije:
   - `createStoryArchitectGraph` iz `./services/ai/graph/graph`
   - `createInitialState` iz `./services/ai/graph/graph`
2. Kreirati početno stanje:
   ```typescript
   const initialState = createInitialState(userInput, storyContext)
   ```
3. Kompajlirati i pokrenuti graf:
   ```typescript
   const graph = createStoryArchitectGraph()
   const compiledGraph = graph.compile()
   const finalState = await compiledGraph.invoke(initialState)
   ```

---

## 6. ERROR HANDLING I ODGOVOR

### 6.1 Implementacija error handling-a

**Koraci:**
1. Omatati cijelu logiku u `handleDatabaseOperation` wrapper
2. Koristiti postojeći pattern iz drugih AI endpoint-a
3. Dodati specifične error poruke za Chat API

### 6.2 JSON odgovor

**Koraci:**
1. Vratiti JSON objekt koji sadrži:
   - `status: 'success'`
   - `finalOutput: finalState.finalOutput` - glavni AI odgovor
   - `executionTime` - vrijeme izvršavanja (opcionalno)
   - `timestamp` - vremenska oznaka
2. Za debugging, uključiti cijeli `finalState` objekt
3. HTTP status kod: 200 za uspjeh

---

## 7. DATOTEKE ZA KREIRANJE/IZMJENU

### 7.1 Datoteke za izmjenu:
1. **`server/src/schemas/validation.ts`**
   - Dodati `ChatRequestBodySchema`
   - Dodati `ChatRequestBody` tip

2. **`server/src/api.ts`**
   - Importirati novu shemu
   - Dodati novu rutu `POST /api/projects/:projectId/chat`
   - Implementirati handler logiku

3. **`server/src/services/context.builder.ts`**
   - Implementirati `buildProjectContext` metodu
   - Dodati `formatProjectContextToString` helper metodu

### 7.2 Datoteke za čitanje (dependencies):
- `server/src/middleware/auth.ts` - authMiddleware
- `server/src/middleware/rateLimiter.ts` - aiRateLimiter
- `server/src/middleware/validation.ts` - validateBody, getValidatedBody
- `server/src/middleware/errorHandler.ts` - handleDatabaseOperation, requireProjectOwnership
- `server/src/services/ai/graph/graph.ts` - createStoryArchitectGraph, createInitialState
- `server/src/schema/schema.ts` - database tables i relations

---

## 8. TESTIRANJE

### 8.1 Manualno testiranje
1. Kreirati test projekt s likovima, lokacijama i scenama
2. Poslati POST zahtjev na `/api/projects/:projectId/chat`
3. Provjeriti da AI graf vraća smislen odgovor
4. Testirati error scenarije (nepostojući projekt, neautorizirani korisnik)

### 8.2 Integracija s postojećim test suiteom
1. Dodati test case u `server/src/__tests__/ai.integration.test.ts`
2. Mockirati database pozive
3. Testirati različite user input scenarije

---

## 9. SIGURNOST I PERFORMANSE

### 9.1 Sigurnosne mjere
- ✅ Autentifikacija kroz `authMiddleware`
- ✅ Autorizacija kroz `requireProjectOwnership`
- ✅ Rate limiting kroz `aiRateLimiter`
- ✅ Input validacija kroz Zod schema
- ✅ UUID validacija za `projectId`

### 9.2 Performanse
- Koristiti Drizzle `with` relacije za efikasno dohvaćanje povezanih podataka
- Ograničiti AI response kroz postojeće konfiguracije
- Koristiti postojeći database connection pooling

---

## 10. DEPLOYMENT NAPOMENE

### 10.1 Environment varijable
- Nema potrebe za novim environment varijablama
- Koristi postojeće AI API ključeve iz `process.env`

### 10.2 Database migracije
- Nema potrebe za database promjenama
- Koristi postojeću shemu

---

## 11. PRIORITET IMPLEMENTACIJE

### Faza 1: Core funkcionalnost (1-2 sata)
1. Dodati Zod shemu
2. Implementirati osnovnu rutu
3. Implementirati `buildProjectContext`

### Faza 2: AI integracija (30-60 minuta)
1. Integrirati s AI grafom
2. Formatirati kontekst u string
3. Implementirati error handling

### Faza 3: Testiranje i optimizacija (30 minuta)
1. Manualno testiranje
2. Dodati unit testove
3. Performance optimizacija

---

**Ukupno procijenjeno vrijeme:** 2-4 sata

**Kritične ovisnosti:** 
- Postojeći AI graf mora biti funkcionalan
- Database veza mora biti stabilna
- Firebase autentifikacija mora raditi

**Rizici:**
- AI graf može biti spor za velike projekte s puno podataka
- Potrebno je paziti na rate limiting za AI pozive
- Formatiranje konteksta mora biti optimalno za AI razumijevanje
