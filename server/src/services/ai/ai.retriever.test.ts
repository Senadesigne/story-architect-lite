import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRelevantContext } from './ai.retriever';

// Mock environment variables
vi.mock('../../lib/db', () => ({
  getDatabase: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue({
      rows: [{ exists: false }] // Mock da tablica ne postoji
    })
  })
}));

// Mock process.env
const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { 
    ...originalEnv, 
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test' 
  };
});

describe('AI Retriever', () => {
  describe('getRelevantContext', () => {
    it('should return warning message when vector table does not exist', async () => {
      const result = await getRelevantContext('test query');
      
      expect(result).toBe('Vektorska baza još nije konfigurirana. Molimo pokrenite postavljanje vektorske baze.');
    });

    it('should handle query parameter correctly', async () => {
      const testQuery = 'Tko je glavni lik u priči?';
      const result = await getRelevantContext(testQuery);
      
      // Trebao bi vratiti poruku o konfiguraciji jer tablica ne postoji
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle k parameter for number of results', async () => {
      const result = await getRelevantContext('test query', 3);
      
      // Trebao bi vratiti poruku o konfiguraciji
      expect(result).toBe('Vektorska baza još nije konfigurirana. Molimo pokrenite postavljanje vektorske baze.');
    });
  });
});
