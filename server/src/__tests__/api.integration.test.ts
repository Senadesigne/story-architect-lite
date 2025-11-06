import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '@/api'; // Naša Hono aplikacija
import { getDatabase } from '@/lib/db';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { createMockUser, createMockProject } from '@test/helpers';

// Cast mockove kao vi.Mock funkcije za kontrolu
const mockGetDatabase = getDatabase as vi.Mock;
const mockVerifyFirebaseToken = verifyFirebaseToken as vi.Mock;

describe('API Integration Tests', () => {
  let globalMockDb: any;
  let currentTable: any;
  let mockUser: any;
  
  beforeEach(() => {
    // Reset svih mockova prije svakog testa
    vi.clearAllMocks();
    
    // Postavi osnovni "uspješan" auth state
    mockUser = createMockUser({ id: 'user-123' });
    mockVerifyFirebaseToken.mockResolvedValue(mockUser);
    
    // Kreiraj pametan mock database koji razlikuje pozive
    currentTable = null;
    
    // Stvori thenable objekt koji implementira promise interface
    const createThenable = (result: any) => ({
      then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
      catch: (reject: any) => Promise.resolve(result).catch(reject),
      finally: (fn: any) => Promise.resolve(result).finally(fn)
    });
    
    // Mock rezultati prema tablici i kontekstu
    let selectFields: any = null;
    let whereConditions: any = null;
    
    globalMockDb = {
      select: vi.fn().mockImplementation((fields) => {
        selectFields = fields;
        const chainableObj = {
          from: vi.fn().mockImplementation((table) => {
            currentTable = table;
            const whereObj = {
              where: vi.fn().mockImplementation((conditions) => {
                whereConditions = conditions;
                const limitObj = {
                  limit: vi.fn().mockImplementation(() => {
                    // Auth middleware traži korisnika po emailu
                    if (currentTable?.name === 'users') {
                      return createThenable([mockUser]);
                    }
                    // requireProjectOwnership traži projekt po ID i userId
                    if (currentTable?.name === 'projects' && selectFields?.id) {
                      // Vraćaj projekt samo ako postoji i pripada korisniku
                      // Ovo će se prilagoditi u pojedinim testovima
                      return createThenable([{ id: 'default-project-id' }]);
                    }
                    // GET /api/projects/:id traži cijeli projekt
                    if (currentTable?.name === 'projects') {
                      return createThenable([]);
                    }
                    return createThenable([]);
                  }),
                  // Direktan pristup bez limit
                  ...createThenable(currentTable?.name === 'users' ? [mockUser] : [])
                };
                return limitObj;
              }),
              limit: vi.fn().mockImplementation(() => {
                // Direktan from().limit() bez where
                if (currentTable?.name === 'projects') {
                  return createThenable([]);
                }
                return createThenable([]);
              }),
              // Direktan pristup bez where
              ...createThenable(currentTable?.name === 'users' ? [mockUser] : [])
            };
            return whereObj;
          })
        };
        return chainableObj;
      }),
      from: vi.fn().mockImplementation((table) => {
        currentTable = table;
        return globalMockDb;
      }),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      having: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
      prepare: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
    };
    
    // Ensure all chainable methods return the same mockDb instance
    Object.keys(globalMockDb).forEach(key => {
      if (typeof globalMockDb[key] === 'function' && 
          key !== 'select' && // ne mijenjaj select - ima posebnu implementaciju
          key !== 'returning' && 
          key !== 'execute' && 
          key !== 'all' && 
          key !== 'get') {
        globalMockDb[key].mockReturnValue(globalMockDb);
      }
    });
    
    // Postavi default response za auth middleware - korisnik već postoji
    globalMockDb.returning.mockResolvedValue([mockUser]);
    
    // Eksplicitno postavi mock implementaciju
    mockGetDatabase.mockImplementation(async (url) => {
      return globalMockDb;
    });
  });

  describe('Scenarij 1: Authentication Flow', () => {
    it('trebao bi vratiti 401 ako Authorization header nije poslan', async () => {
      const response = await app.request('/api/projects', {
        method: 'GET'
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Authorization header is required'
      });
    });

    it('trebao bi vratiti 401 ako verifyFirebaseToken baci grešku', async () => {
      // Mockaj da verifyFirebaseToken baci grešku
      mockVerifyFirebaseToken.mockRejectedValue(new Error('Invalid token'));

      const response = await app.request('/api/projects', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    });

    it('trebao bi vratiti 200 ako je Authorization header poslan i verifyFirebaseToken uspješno vrati korisnika', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      mockVerifyFirebaseToken.mockResolvedValue(mockUser);
      
      // Mock će automatski vratiti [] za projects tablicu

      const response = await app.request('/api/projects', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual([]);
      expect(mockVerifyFirebaseToken).toHaveBeenCalledWith('valid-token', 'test-project');
    });
  });

  describe('Scenarij 2: Zod Validation', () => {
    beforeEach(() => {
      // Osiguraj da auth prođe za validation testove
      const mockUser = createMockUser({ id: 'user-123' });
      mockVerifyFirebaseToken.mockResolvedValue(mockUser);
    });

    it('trebao bi vratiti 201 za POST /api/projects s važećim body-jem', async () => {
      const mockProject = createMockProject({ 
        id: 'new-project-id',
        title: 'Novi Testni Projekt',
        userId: 'user-123' 
      });
      
      // Mock database insert operaciju
      globalMockDb.returning.mockResolvedValue([mockProject]);

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Novi Testni Projekt' })
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      // Ignoriraj Date objekte u poređenju
      expect(body.title).toBe('Novi Testni Projekt');
      expect(body.userId).toBe('user-123');
    });

    it('trebao bi vratiti 400 za POST /api/projects s nevaljanim body-jem', async () => {
      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 123 }) // Nevaljan tip
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Validation failed');
      expect(body.error).toContain('expected string, received number');
    });

    it('trebao bi vratiti 400 za POST /api/projects s praznim imenom', async () => {
      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: '' }) // Prazno ime
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Validation failed');
      expect(body.error).toContain('Name is required');
    });

    it('trebao bi vratiti 400 za POST /api/projects bez body-ja', async () => {
      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Nema name polja
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Validation failed');
      expect(body.error).toContain('expected string, received undefined');
    });
  });

  describe('Scenarij 3: Ownership & Error Handling', () => {
    beforeEach(() => {
      // Osiguraj da auth prođe s korisnikom id: 'user-123'
      const mockUser = createMockUser({ id: 'user-123' });
      mockVerifyFirebaseToken.mockResolvedValue(mockUser);
    });

    it('trebao bi vratiti 400 za nevaljan UUID format', async () => {
      const response = await app.request('/api/projects/invalid-uuid', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Invalid project ID format'
      });
    });

    it('trebao bi vratiti 200 ako projekt postoji i pripada korisniku', async () => {
      // Koristi valjan UUID
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const mockProject = createMockProject({ 
        id: validUUID,
        userId: 'user-123' 
      });
      
      // Override select mock za ovaj test
      let callCount = 0;
      globalMockDb.select.mockImplementation((fields = undefined) => {
        callCount++;
        
        // Svaki poziv select() dobiva svoj kontekst
        const callContext = {
          callNumber: callCount,
          fields: fields,
          table: null as any
        };
        
        const chainableObj = {
          from: vi.fn().mockImplementation((table) => {
            callContext.table = table;
            // Tablica može biti Drizzle table objekt ili undefined
            const tableName = table?.[Symbol.for('drizzle:Name')] || table?.name || 'unknown';
            
            const whereObj = {
              where: vi.fn().mockImplementation((conditions) => {
                const limitObj = {
                  limit: vi.fn().mockImplementation((num) => {
                    const actualTableName = callContext.table?.[Symbol.for('drizzle:Name')] || callContext.table?.name;
                    
                    // Auth middleware traži korisnika po email-u
                    if (actualTableName === 'users') {
                      return Promise.resolve([mockUser]);
                    }
                    
                    // requireProjectOwnership traži projekt sa select({ id: ... })
                    if (actualTableName === 'projects' && callContext.fields !== undefined) {
                      return Promise.resolve([{ id: validUUID }]);
                    }
                    
                    // GET /api/projects/:id traži cijeli projekt - select() bez argumenata
                    if (actualTableName === 'projects' && callContext.fields === undefined) {
                      return Promise.resolve([mockProject]);
                    }
                    
                    return Promise.resolve([]);
                  })
                };
                return limitObj;
              })
            };
            return whereObj;
          })
        };
        return chainableObj;
      });

      const response = await app.request(`/api/projects/${validUUID}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(validUUID);
      expect(body.userId).toBe('user-123');
    });

    it('trebao bi vratiti 404 ako projekt ne postoji ili ne pripada korisniku', async () => {
      // Koristi valjan UUID ali projekt ne postoji
      const validUUID = '123e4567-e89b-12d3-a456-426614174001';
      
      // Override select mock za ovaj test - projekt ne postoji
      globalMockDb.select.mockImplementation((fields) => {
        const chainableObj = {
          from: vi.fn().mockImplementation((table) => {
            const whereObj = {
              where: vi.fn().mockImplementation(() => {
                const limitObj = {
                  limit: vi.fn().mockImplementation(() => {
                    // Auth middleware traži korisnika
                    if (table?.name === 'users') {
                      return Promise.resolve([mockUser]);
                    }
                    // requireProjectOwnership ne pronalazi projekt
                    if (table?.name === 'projects') {
                      return Promise.resolve([]); // Prazan niz - projekt ne postoji
                    }
                    return Promise.resolve([]);
                  })
                };
                return limitObj;
              })
            };
            return whereObj;
          })
        };
        return chainableObj;
      });

      const response = await app.request(`/api/projects/${validUUID}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Project not found'
      });
    });
  });

  describe('Dodatni Edge Case Testovi', () => {
    it('trebao bi vratiti 200 za health check endpoint', async () => {
      const response = await app.request('/', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        message: 'API is running'
      });
    });

    it('trebao bi vratiti 200 za /api/user endpoint s važećim tokenom', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      mockVerifyFirebaseToken.mockResolvedValue(mockUser);

      const response = await app.request('/api/user', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe('user-123');
      expect(body.email).toBe('test@example.com');
      expect(body.displayName).toBe('Test User');
    });

    it('trebao bi vratiti 401 za /api/user endpoint bez tokena', async () => {
      const response = await app.request('/api/user', {
        method: 'GET'
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Authorization header is required'
      });
    });
  });
});
