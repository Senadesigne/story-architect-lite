/**
 * Testovi za retry utility funkcije
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff, RetryConfigs } from '../retry';
import { 
  AIProviderError, 
  AITimeoutError, 
  AIInvalidKeyError, 
  AIRateLimitError 
} from '../../services/ai.errors';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log da ne zagađuje test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should succeed on first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new AITimeoutError('anthropic', 5000))
      .mockRejectedValueOnce(new AIRateLimitError('anthropic', 60))
      .mockResolvedValue('success after retries');

    const result = await retryWithBackoff(mockFn, {
      maxRetries: 3,
      baseDelay: 10, // Kratki delay za testove
      jitter: false
    });

    expect(result).toBe('success after retries');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const nonRetryableError = new AIInvalidKeyError('anthropic');
    const mockFn = vi.fn().mockRejectedValue(nonRetryableError);

    await expect(retryWithBackoff(mockFn)).rejects.toThrow(AIInvalidKeyError);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries exceeded', async () => {
    const retryableError = new AITimeoutError('anthropic', 5000);
    const mockFn = vi.fn().mockRejectedValue(retryableError);

    await expect(
      retryWithBackoff(mockFn, {
        maxRetries: 2,
        baseDelay: 10,
        jitter: false
      })
    ).rejects.toThrow(AITimeoutError);

    expect(mockFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new AITimeoutError('anthropic', 5000))
      .mockRejectedValueOnce(new AITimeoutError('anthropic', 5000))
      .mockResolvedValue('success');

    const startTime = Date.now();
    
    await retryWithBackoff(mockFn, {
      maxRetries: 2,
      baseDelay: 100,
      backoffFactor: 2,
      jitter: false
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Trebalo bi biti barem 100ms (prvi retry) + 200ms (drugi retry) = 300ms
    expect(totalTime).toBeGreaterThan(250);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should handle regular errors as retryable', async () => {
    const regularError = new Error('Some network error');
    const mockFn = vi.fn()
      .mockRejectedValueOnce(regularError)
      .mockResolvedValue('success');

    const result = await retryWithBackoff(mockFn, {
      maxRetries: 1,
      baseDelay: 10,
      jitter: false
    });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should respect maxDelay setting', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new AITimeoutError('anthropic', 5000))
      .mockResolvedValue('success');

    await retryWithBackoff(mockFn, {
      maxRetries: 1,
      baseDelay: 1000,
      maxDelay: 500, // Manji od baseDelay
      backoffFactor: 2,
      jitter: false
    });

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('RetryConfigs', () => {
  it('should have predefined configurations', () => {
    expect(RetryConfigs.AI_API).toBeDefined();
    expect(RetryConfigs.FAST_OPERATION).toBeDefined();
    expect(RetryConfigs.SLOW_OPERATION).toBeDefined();
    expect(RetryConfigs.CRITICAL_OPERATION).toBeDefined();

    // Provjeri da AI_API config ima razumne vrijednosti
    expect(RetryConfigs.AI_API.maxRetries).toBe(3);
    expect(RetryConfigs.AI_API.baseDelay).toBe(1000);
    expect(RetryConfigs.AI_API.backoffFactor).toBe(2);
  });
});
