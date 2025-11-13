import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock dependencies
vi.mock('../services/ai/ai.retriever', () => ({
  getRelevantContext: vi.fn().mockResolvedValue('Vektorska baza još nije konfigurirana. Molimo pokrenite postavljanje vektorske baze.')
}));

vi.mock('../lib/db', () => ({
  getDatabase: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue({
      rows: [{ exists: false }]
    })
  })
}));

// Import after mocking
import { getRelevantContext } from '../services/ai/ai.retriever';

// Create a minimal app for testing
const app = new Hono();

// Add the test endpoint
app.get('/api/ai/test-rag', async (c) => {
  try {
    const query = c.req.query('query') || 'test query';
    console.log('Testing RAG with query:', query);
    
    const result = await getRelevantContext(query);
    
    return c.json({
      status: 'success',
      query: query,
      result: result,
      timestamp: new Date().toISOString(),
      message: 'RAG test completed successfully'
    });
    
  } catch (error) {
    console.error('RAG test endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      status: 'error',
      error: 'RAG test failed', 
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

describe('RAG Test Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ai/test-rag', () => {
    it('should return success response with default query', async () => {
      const response = await app.request('/api/ai/test-rag');
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body).toMatchObject({
        status: 'success',
        query: 'test query',
        result: 'Vektorska baza još nije konfigurirana. Molimo pokrenite postavljanje vektorske baze.',
        message: 'RAG test completed successfully'
      });
      expect(body.timestamp).toBeDefined();
      expect(getRelevantContext).toHaveBeenCalledWith('test query');
    });

    it('should use custom query parameter', async () => {
      const customQuery = 'Tko je glavni lik?';
      const response = await app.request(`/api/ai/test-rag?query=${encodeURIComponent(customQuery)}`);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.query).toBe(customQuery);
      expect(getRelevantContext).toHaveBeenCalledWith(customQuery);
    });

    it('should handle errors gracefully', async () => {
      // Mock error
      vi.mocked(getRelevantContext).mockRejectedValueOnce(new Error('Database connection failed'));
      
      const response = await app.request('/api/ai/test-rag');
      
      expect(response.status).toBe(500);
      const body = await response.json();
      
      expect(body).toMatchObject({
        status: 'error',
        error: 'RAG test failed',
        details: 'Database connection failed'
      });
      expect(body.timestamp).toBeDefined();
    });
  });
});
