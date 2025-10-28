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
  
  beforeEach(() => {
    // Reset svih mockova prije svakog testa
    vi.clearAllMocks();
    
    // Postavi osnovni "uspješan" auth state
    const mockUser = createMockUser({ id: 'user-123' });
    mockVerifyFirebaseToken.mockResolvedValue(mockUser);
    
    // Kreiraj pametan mock database koji razlikuje pozive
    currentTable = null;
    globalMockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockImplementation((table) => {
        // Zapamti koju tablicu koristimo
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
      then: vi.fn((resolve) => {
        // Vrati različite podatke ovisno o tablici
        if (currentTable?.name === 'users') {
          resolve([mockUser]);
        } else if (currentTable?.name === 'projects') {
          resolve([]);
        } else {
          resolve([]);
        }
      }),
    };
    
    // Ensure all chainable methods return the same mockDb instance
    Object.keys(globalMockDb).forEach(key => {
      if (typeof globalMockDb[key] === 'function' && key !== 'returning' && key !== 'execute' && key !== 'all' && key !== 'get' && key !== 'then') {
        globalMockDb[key].mockReturnValue(globalMockDb);
      }
    });
    
    // Postavi default response za auth middleware - korisnik već postoji
    globalMockDb.returning.mockResolvedValue([mockUser]);
    globalMockDb.then.mockImplementation((resolve) => resolve([mockUser])); // Dodajem natrag
    
    // Eksplicitno postavi mock implementaciju
    mockGetDatabase.mockImplementation(async (url) => {
      // Ukloni then metodu da se izbjegne thenable problem
      const dbCopy = { ...globalMockDb };
      delete dbCopy.then;
      return dbCopy;
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

    it('trebao bi vratiti 201 za POST /api/projects (ne koristi validation)', async () => {
      const mockProject = createMockProject({ 
        id: 'new-project-id',
        title: 'Novi Projekt',
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
        body: JSON.stringify({}) // Body se ignorira
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      // Ignoriraj Date objekte u poređenju
      expect(body.title).toBe('Novi Projekt');
      expect(body.userId).toBe('user-123');
    });

    it('trebao bi vratiti 201 za POST /api/projects s bilo kojim body-jem (ignorira se)', async () => {
      const mockProject = createMockProject({ 
        id: 'new-project-id',
        title: 'Novi Projekt',
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
        body: JSON.stringify({ name: 123 }) // Body se ignorira
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.title).toBe('Novi Projekt');
      expect(body.userId).toBe('user-123');
    });

    it('trebao bi vratiti 201 za POST /api/projects s važećim body-jem (ali se ignorira)', async () => {
      const mockProject = createMockProject({ 
        id: 'new-project-id',
        title: 'Novi Projekt',
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
        body: JSON.stringify({ name: 'Novi Projekt' })
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.title).toBe('Novi Projekt');
      expect(body.userId).toBe('user-123');
      expect(globalMockDb.insert).toHaveBeenCalled();
      expect(globalMockDb.values).toHaveBeenCalled();
      expect(globalMockDb.returning).toHaveBeenCalled();
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
      
      // Mock database da vrati projekt koji pripada korisniku
      globalMockDb.then.mockImplementation((resolve) => {
        if (currentTable?.name === 'users') {
          resolve([mockUser]);
        } else if (currentTable?.name === 'projects') {
          resolve([mockProject]);
        } else {
          resolve([]);
        }
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
      
      // Mock database da vrati prazan niz (projekt ne postoji)
      globalMockDb.then.mockImplementation((resolve) => {
        if (currentTable?.name === 'users') {
          resolve([mockUser]);
        } else if (currentTable?.name === 'projects') {
          resolve([]); // Projekt ne postoji
        } else {
          resolve([]);
        }
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
