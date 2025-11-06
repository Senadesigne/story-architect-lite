import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../ai.service';

// Mock Anthropic SDK
const mockAnthropicClient = {
  messages: {
    create: vi.fn()
  }
};

vi.mock('@anthropic-ai/sdk', () => ({
  default: function MockAnthropic() {
    return mockAnthropicClient;
  }
}));

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockClient: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Use the global mock client
    mockClient = mockAnthropicClient;
    
    // Create provider instance
    provider = new AnthropicProvider('test-api-key');
  });

  describe('getProviderName', () => {
    it('should return "anthropic"', () => {
      expect(provider.getProviderName()).toBe('anthropic');
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      // Arrange
      const mockResponse = {
        content: [{ type: 'text', text: 'Generated text response' }]
      };
      mockClient.messages.create.mockResolvedValue(mockResponse);

      // Act
      const result = await provider.generateText('Test prompt');

      // Assert
      expect(result).toBe('Generated text response');
      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 1024,
        temperature: 0.7
      });
    });

    it('should use custom options when provided', async () => {
      // Arrange
      const mockResponse = {
        content: [{ type: 'text', text: 'Custom response' }]
      };
      mockClient.messages.create.mockResolvedValue(mockResponse);

      const options = {
        maxTokens: 500,
        temperature: 0.5
      };

      // Act
      const result = await provider.generateText('Test prompt', options);

      // Assert
      expect(result).toBe('Custom response');
      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 500,
        temperature: 0.5
      });
    });

    it('should handle API errors', async () => {
      // Arrange
      const apiError = new Error('API Error');
      mockClient.messages.create.mockRejectedValue(apiError);

      // Act & Assert
      await expect(provider.generateText('Test prompt'))
        .rejects.toThrow('AI generation failed: API Error');
    });

    it('should handle empty response content', async () => {
      // Arrange
      mockClient.messages.create.mockResolvedValue({ content: [] });

      // Act & Assert
      await expect(provider.generateText('Test prompt'))
        .rejects.toThrow('No valid text content received from Anthropic');
    });

    it('should handle response with no text content', async () => {
      // Arrange
      const mockResponse = {
        content: [{ type: 'image', data: 'some-image-data' }]
      };
      mockClient.messages.create.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(provider.generateText('Test prompt'))
        .rejects.toThrow('No valid text content received from Anthropic');
    });

    it('should handle undefined content', async () => {
      // Arrange
      mockClient.messages.create.mockResolvedValue({ content: undefined });

      // Act & Assert
      await expect(provider.generateText('Test prompt'))
        .rejects.toThrow('No valid text content received from Anthropic');
    });
  });

  describe('validateConnection', () => {
    it('should return true for valid connection', async () => {
      // Arrange
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test' }]
      });

      // Act
      const result = await provider.validateConnection();

      // Assert
      expect(result).toBe(true);
      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10
      });
    });

    it('should return false for invalid connection', async () => {
      // Arrange
      const apiError = new Error('Invalid API key');
      mockClient.messages.create.mockRejectedValue(apiError);

      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await provider.validateConnection();

      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Anthropic connection validation failed:', apiError);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should return false for network errors', async () => {
      // Arrange
      const networkError = new Error('Network timeout');
      mockClient.messages.create.mockRejectedValue(networkError);

      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await provider.validateConnection();

      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Anthropic connection validation failed:', networkError);

      // Cleanup
      consoleSpy.mockRestore();
    });
  });
});
