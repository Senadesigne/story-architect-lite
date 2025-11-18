# Detaljan Tehnički Plan za Zadatak 1.8: Unit Testovi

Na temelju analize postojećeg koda, evo detaljnog plana implementacije za sve podzadatke:

## **Zadatak 1.8.1: Ovisnosti**

**pnpm naredba za instalaciju:**
```bash
cd server && pnpm add -D vitest @vitest/ui c8 supertest @types/supertest msw @types/node
```

**Objašnjenje paketa:**
- `vitest` - Brzi test runner kompatibilan s Vite-om
- `@vitest/ui` - Web UI za Vitest
- `c8` - Code coverage alat (V8-based)
- `supertest` - HTTP assertion library za integration testove
- `@types/supertest` - TypeScript tipovi za supertest
- `msw` - Mock Service Worker za mock-anje vanjskih API poziva
- `@types/node` - Node.js tipovi (ako već nisu instalirani)

## **Zadatak 1.8.2: Vitest Konfiguracija**

**Datoteka:** `server/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'coverage/',
        'drizzle/',
        'scripts/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test')
    }
  }
});
```

## **Zadatak 1.8.3: Test Utilities**

**Datoteka:** `server/src/test/helpers.ts`

**Ključne funkcije:**

1. **Mock Database Setup:**
```typescript
// Mock Drizzle database operacije
export const createMockDatabase = () => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  innerJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis()
});
```

2. **Mock Firebase Auth:**
```typescript
// Mock Firebase Admin SDK
export const createMockFirebaseAuth = () => ({
  verifyIdToken: vi.fn(),
  getUser: vi.fn()
});
```

3. **Test App Factory:**
```typescript
// Kreiranje test Hono aplikacije s mock-ovima
export const createTestApp = (mocks?: TestMocks) => {
  // Setup mock-ova i vraćanje test app instance
};
```

4. **Test Data Generators:**
```typescript
// Generatori test podataka
export const createMockUser = (overrides?: Partial<User>) => ({ ... });
export const createMockProject = (overrides?: Partial<Project>) => ({ ... });
```

## **Zadatak 1.8.4: Testovi za Error Handler**

**Datoteka:** `server/src/middleware/__tests__/errorHandler.test.ts`

**Ključni testni scenariji:**

1. **Custom Error Classes:**
   - ValidationError → 400 status
   - NotFoundError → 404 status  
   - UnauthorizedError → 401 status
   - DatabaseError → 500 status

2. **UUID Validation:**
   - Validni UUID format
   - Nevalidni UUID format
   - `requireValidUUID` helper funkcija

3. **Ownership Validation:**
   - `requireProjectOwnership` - postojeći projekt
   - `requireProjectOwnership` - nepostojeći projekt
   - `requireResourceOwnership` - validno vlasništvo
   - `requireResourceOwnership` - nevalidno vlasništvo

4. **Database Operation Wrapper:**
   - `handleDatabaseOperation` - uspješna operacija
   - `handleDatabaseOperation` - database greška

5. **JSON Parsing Errors:**
   - Nevaljan JSON u request body-ju

6. **Default Error Handling:**
   - Neočekivane greške → 500 status

## **Zadatak 1.8.5: Testovi za Validation**

**Datoteka:** `server/src/middleware/__tests__/validation.test.ts`

**Ključni testni scenariji:**

1. **validateBody Middleware:**
   - Validni request body
   - Nevalidni request body (Zod greške)
   - Prazan request body
   - Malformed JSON

2. **Zod Schema Validacija:**
   - `UpdateUserBodySchema` - svi scenariji
   - `CreateLocationBodySchema` - obavezna polja
   - `UpdateProjectBodySchema` - "at least one field" validacija
   - UUID validacija u `CreateSceneBodySchema`

3. **getValidatedBody Helper:**
   - Dohvaćanje validirane podatke iz context-a
   - Error handling kad nema validirane podatke

4. **Edge Cases:**
   - Prazni stringovi vs undefined
   - Whitespace handling (trim)
   - URL validacija za avatarUrl

## **Zadatak 1.8.6: Integration Testovi**

**Datoteka:** `server/src/__tests__/api.integration.test.ts`

**Top 3 najvažnija integration testa:**

1. **Authentication Flow Test:**
```typescript
describe('Authentication Integration', () => {
  it('should reject requests without valid Firebase token', async () => {
    const response = await request(app)
      .get('/api/user')
      .expect(401);
  });
  
  it('should accept requests with valid Firebase token', async () => {
    // Mock valid Firebase token
    const response = await request(app)
      .get('/api/user')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
  });
});
```

2. **Project CRUD with Error Handling:**
```typescript
describe('Project API Integration', () => {
  it('should create, update, and delete project with proper error handling', async () => {
    // Test cijeli lifecycle s error handling-om
  });
  
  it('should validate project ownership across operations', async () => {
    // Test ownership validacije
  });
});
```

3. **Zod Validation Integration:**
```typescript
describe('Request Validation Integration', () => {
  it('should validate all endpoint request bodies using Zod schemas', async () => {
    // Test svih endpoint-a s nevalidnim podacima
  });
  
  it('should return detailed validation error messages', async () => {
    // Test formatiranja Zod error poruka
  });
});
```

## **Zadatak 1.8.7: Test Skripte**

**Dodati u `server/package.json`:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:unit": "vitest run src/**/*.test.ts",
    "test:ci": "vitest run --coverage --reporter=verbose"
  }
}
```

**Objašnjenje skripti:**
- `test` - Pokreće sve testove jednom
- `test:ui` - Otvara Vitest web UI
- `test:coverage` - Pokreće testove s coverage reportom
- `test:watch` - Watch mode za development
- `test:integration` - Samo integration testovi
- `test:unit` - Samo unit testovi
- `test:ci` - Optimizirano za CI/CD pipeline

## **Dodatne Preporuke:**

1. **Test Setup File:** `server/src/test/setup.ts`
   - Global mock setup
   - Test database cleanup
   - Environment variables setup

2. **Mock Strategy:**
   - Mock `getDatabase` funkciju na module level
   - Mock Firebase Admin SDK
   - Koristiti MSW za vanjske API pozive

3. **Coverage Targets:**
   - 90%+ za error handling middleware
   - 85%+ za validation middleware  
   - 80%+ za API endpoint-e

4. **Test Organization:**
   - Unit testovi u `__tests__` folderima pored source koda
   - Integration testovi u `src/__tests__/`
   - Shared utilities u `src/test/`

Ovaj plan osigurava sveobuhvatan test suite koji pokriva sve ključne funkcionalnosti s fokusom na error handling i validation logiku koju ste implementirali u Fazama 1 i 2.
