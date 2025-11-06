import { describe, it, expect } from 'vitest';
import {
  AIProviderError,
  AITimeoutError,
  AIQuotaExceededError,
  AIInvalidKeyError,
  AIInvalidResponseError,
  AIRateLimitError,
  AIServiceUnavailableError,
  mapAIError,
  isRetryableError,
  isAuthenticationError,
  hasRetryAfter
} from '../ai.errors';

describe('AI Error Classes', () => {
  describe('AIProviderError', () => {
    it('should create base error with provider name', () => {
      const error = new AIProviderError('Test message', 'anthropic');
      
      expect(error.message).toBe('Test message');
      expect(error.providerName).toBe('anthropic');
      expect(error.name).toBe('AIProviderError');
      expect(error.originalError).toBeUndefined();
    });

    it('should store original error when provided', () => {
      const originalError = new Error('Original');
      const error = new AIProviderError('Test message', 'anthropic', originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('Specific Error Types', () => {
    it('should create AITimeoutError with timeout info', () => {
      const error = new AITimeoutError('anthropic', 30000);
      
      expect(error.message).toBe('AI request timed out after 30000ms');
      expect(error.providerName).toBe('anthropic');
      expect(error.timeoutMs).toBe(30000);
      expect(error.name).toBe('AITimeoutError');
    });

    it('should create AIInvalidKeyError', () => {
      const error = new AIInvalidKeyError('anthropic');
      
      expect(error.message).toBe('Invalid API key for AI provider');
      expect(error.providerName).toBe('anthropic');
      expect(error.name).toBe('AIInvalidKeyError');
    });

    it('should create AIRateLimitError with retry info', () => {
      const error = new AIRateLimitError('anthropic', 60);
      
      expect(error.message).toBe('AI provider rate limit exceeded');
      expect(error.providerName).toBe('anthropic');
      expect(error.retryAfter).toBe(60);
      expect(error.name).toBe('AIRateLimitError');
    });
  });

  describe('mapAIError', () => {
    it('should map authentication errors', () => {
      const authError = { type: 'authentication_error', message: 'Invalid key' };
      const mapped = mapAIError(authError, 'anthropic');
      
      expect(mapped).toBeInstanceOf(AIInvalidKeyError);
      expect(mapped.providerName).toBe('anthropic');
    });

    it('should map rate limit errors', () => {
      const rateLimitError = { type: 'rate_limit_error', status: 429 };
      const mapped = mapAIError(rateLimitError, 'anthropic');
      
      expect(mapped).toBeInstanceOf(AIRateLimitError);
      expect(mapped.providerName).toBe('anthropic');
    });

    it('should map timeout errors', () => {
      const timeoutError = { name: 'AbortError' };
      const mapped = mapAIError(timeoutError, 'anthropic');
      
      expect(mapped).toBeInstanceOf(AITimeoutError);
      expect(mapped.providerName).toBe('anthropic');
    });

    it('should map quota errors', () => {
      const quotaError = { code: 'insufficient_quota' };
      const mapped = mapAIError(quotaError, 'anthropic');
      
      expect(mapped).toBeInstanceOf(AIQuotaExceededError);
      expect(mapped.providerName).toBe('anthropic');
    });

    it('should map service unavailable errors', () => {
      const serviceError = { status: 503 };
      const mapped = mapAIError(serviceError, 'anthropic');
      
      expect(mapped).toBeInstanceOf(AIServiceUnavailableError);
      expect(mapped.providerName).toBe('anthropic');
    });

    it('should fallback to generic error', () => {
      const genericError = { message: 'Unknown error' };
      const mapped = mapAIError(genericError, 'anthropic');
      
      expect(mapped).toBeInstanceOf(AIProviderError);
      expect(mapped.message).toBe('AI generation failed: Unknown error');
      expect(mapped.providerName).toBe('anthropic');
    });
  });

  describe('Helper Functions', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError(new AITimeoutError('anthropic', 30000))).toBe(true);
      expect(isRetryableError(new AIRateLimitError('anthropic'))).toBe(true);
      expect(isRetryableError(new AIServiceUnavailableError('anthropic'))).toBe(true);
      expect(isRetryableError(new AIQuotaExceededError('anthropic'))).toBe(true);
      expect(isRetryableError(new AIInvalidKeyError('anthropic'))).toBe(false);
    });

    it('should identify authentication errors', () => {
      expect(isAuthenticationError(new AIInvalidKeyError('anthropic'))).toBe(true);
      expect(isAuthenticationError(new AITimeoutError('anthropic', 30000))).toBe(false);
    });

    it('should extract retry after values', () => {
      expect(hasRetryAfter(new AIRateLimitError('anthropic', 60))).toBe(60);
      expect(hasRetryAfter(new AIQuotaExceededError('anthropic', 3600))).toBe(3600);
      expect(hasRetryAfter(new AITimeoutError('anthropic', 30000))).toBeUndefined();
    });
  });
});
