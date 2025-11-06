import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../api';

// Mock AI service
vi.mock('../services/ai.service', () => ({
  AnthropicProvider: function MockAnthropicProvider() {
    return {
      validateConnection: vi.fn().mockResolvedValue(true),
      generateText: vi.fn().mockResolvedValue('Mocked AI response'),
      getProviderName: vi.fn().mockReturnValue('anthropic')
    };
  }
}));

// Mock config
vi.mock('../lib/config', () => ({
  getAIConfig: vi.fn().mockReturnValue({
    anthropicApiKey: 'test-key'
  })
}));

// Mock context builder and prompt service for the scene synopsis endpoint
vi.mock('../services/context.builder', () => ({
  ContextBuilder: {
    buildSceneContext: vi.fn().mockResolvedValue({
      scene: { id: 'scene-1', title: 'Test Scene' },
      characters: [{ id: 'char-1', name: 'Test Character' }],
      location: { id: 'loc-1', name: 'Test Location' }
    })
  }
}));

vi.mock('../services/prompt.service', () => ({
  PromptService: {
    buildSceneSynopsisPrompt: vi.fn().mockReturnValue('Mocked prompt for scene synopsis')
  }
}));

// Mock rate limiter to avoid rate limiting in tests
vi.mock('../middleware/rateLimiter', () => ({
  aiRateLimiter: {
    middleware: vi.fn().mockReturnValue((c: any, next: any) => next())
  }
}));

// Mock database and auth for protected routes
vi.mock('../lib/db', () => ({
  getDatabase: vi.fn().mockResolvedValue({
    query: {
      scenes: {
        findFirst: vi.fn().mockResolvedValue({ id: 'scene-1', projectId: 'project-1' })
      }
    }
  })
}));

vi.mock('../middleware/errorHandler', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireValidUUID: vi.fn(),
    requireProjectOwnership: vi.fn().mockResolvedValue(true),
    handleDatabaseOperation: vi.fn().mockImplementation((fn) => fn())
  };
});

vi.mock('../middleware/auth', () => ({
  authMiddleware: vi.fn().mockImplementation((c, next) => {
    // Mock authenticated user
    c.set('user', { id: 'test-user-id', email: 'test@example.com' });
    return next();
  })
}));

vi.mock('../middleware/validation', () => ({
  validateBody: vi.fn().mockImplementation(() => (c: any, next: any) => {
    // Mock validated body using c.set() to match real implementation
    c.set('validatedBody', { sceneId: 'test-scene-id' });
    return next();
  }),
  getValidatedBody: vi.fn().mockImplementation((c: any) => {
    return c.get('validatedBody') || { sceneId: 'test-scene-id' };
  })
}));

describe('AI Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai/test', () => {
    it('should return AI response for valid request', async () => {
      // Act
      const response = await app.request('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Test prompt' })
      });

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        status: 'success',
        prompt: 'Test prompt',
        response: 'Mocked AI response'
      });
    });

    it('should use default prompt when none provided', async () => {
      // Act
      const response = await app.request('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.prompt).toBe('Hello, Claude!');
      expect(body.response).toBe('Mocked AI response');
    });

    it('should handle invalid JSON gracefully', async () => {
      // Act
      const response = await app.request('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.prompt).toBe('Hello, Claude!'); // Should use default
    });

    it('should handle AI provider validation failure', async () => {
      // Arrange
      const { AnthropicProvider } = await import('../services/ai.service');
      const mockProvider = vi.mocked(AnthropicProvider);
      mockProvider.mockImplementationOnce(() => ({
        validateConnection: vi.fn().mockResolvedValue(false),
        generateText: vi.fn(),
        getProviderName: vi.fn().mockReturnValue('anthropic')
      }) as any);

      // Act
      const response = await app.request('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Test prompt' })
      });

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('AI provider connection failed. Check API key.');
    });

    it('should handle AI generation errors', async () => {
      // Arrange
      const { AnthropicProvider } = await import('../services/ai.service');
      const mockProvider = vi.mocked(AnthropicProvider);
      mockProvider.mockImplementationOnce(() => ({
        validateConnection: vi.fn().mockResolvedValue(true),
        generateText: vi.fn().mockRejectedValue(new Error('AI generation failed')),
        getProviderName: vi.fn().mockReturnValue('anthropic')
      }) as any);

      // Act
      const response = await app.request('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Test prompt' })
      });

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('AI generation failed');
    });
  });

  describe('POST /api/projects/:projectId/ai/generate-scene-synopsis', () => {
    const projectId = 'test-project-id';
    const sceneId = 'test-scene-id';

    it('should generate scene synopsis successfully', async () => {
      // Act
      const response = await app.request(`/api/projects/${projectId}/ai/generate-scene-synopsis`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ sceneId })
      });

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        status: 'success',
        synopsis: 'Mocked AI response'
      });
    });

    it('should validate project ownership', async () => {
      // Arrange
      const { requireProjectOwnership } = await import('../middleware/errorHandler');
      const mockRequireProjectOwnership = vi.mocked(requireProjectOwnership);
      mockRequireProjectOwnership.mockRejectedValueOnce(new Error('Access denied'));

      // Act
      const response = await app.request(`/api/projects/${projectId}/ai/generate-scene-synopsis`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ sceneId })
      });

      // Assert
      expect(response.status).toBe(500);
    });

    it('should handle context building errors', async () => {
      // Arrange
      const { ContextBuilder } = await import('../services/context.builder');
      const mockContextBuilder = vi.mocked(ContextBuilder);
      mockContextBuilder.buildSceneContext.mockRejectedValueOnce(new Error('Scene not found'));

      // Act
      const response = await app.request(`/api/projects/${projectId}/ai/generate-scene-synopsis`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ sceneId })
      });

      // Assert
      expect(response.status).toBe(500);
    });

    it('should handle AI generation errors in scene synopsis', async () => {
      // Arrange
      const { AnthropicProvider } = await import('../services/ai.service');
      const mockProvider = vi.mocked(AnthropicProvider);
      mockProvider.mockImplementationOnce(() => ({
        validateConnection: vi.fn().mockResolvedValue(true),
        generateText: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
        getProviderName: vi.fn().mockReturnValue('anthropic')
      }) as any);

      // Act
      const response = await app.request(`/api/projects/${projectId}/ai/generate-scene-synopsis`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ sceneId })
      });

      // Assert
      expect(response.status).toBe(500);
    });

    it('should call ContextBuilder with correct parameters', async () => {
      // Arrange
      const { ContextBuilder } = await import('../services/context.builder');
      const mockContextBuilder = vi.mocked(ContextBuilder);

      // Act
      await app.request(`/api/projects/${projectId}/ai/generate-scene-synopsis`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ sceneId })
      });

      // Assert
      expect(mockContextBuilder.buildSceneContext).toHaveBeenCalledWith(
        sceneId,
        expect.anything(), // database instance
        projectId
      );
    });

    it('should call PromptService with context', async () => {
      // Arrange
      const { PromptService } = await import('../services/prompt.service');
      const mockPromptService = vi.mocked(PromptService);

      // Act
      await app.request(`/api/projects/${projectId}/ai/generate-scene-synopsis`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ sceneId })
      });

      // Assert
      expect(mockPromptService.buildSceneSynopsisPrompt).toHaveBeenCalledWith({
        scene: { id: 'scene-1', title: 'Test Scene' },
        characters: [{ id: 'char-1', name: 'Test Character' }],
        location: { id: 'loc-1', name: 'Test Location' }
      });
    });

    it('should call AI provider with correct parameters', async () => {
      // Arrange
      const { AnthropicProvider } = await import('../services/ai.service');
      const mockProvider = vi.mocked(AnthropicProvider);
      const mockGenerateText = vi.fn().mockResolvedValue('Generated synopsis');
      
      mockProvider.mockImplementationOnce(() => ({
        validateConnection: vi.fn().mockResolvedValue(true),
        generateText: mockGenerateText,
        getProviderName: vi.fn().mockReturnValue('anthropic')
      }) as any);

      // Act
      await app.request(`/api/projects/${projectId}/ai/generate-scene-synopsis`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ sceneId })
      });

      // Assert
      expect(mockGenerateText).toHaveBeenCalledWith(
        'Mocked prompt for scene synopsis',
        { maxTokens: 500 }
      );
    });
  });
});