/**
 * Retry utility s exponential backoff-om
 * Implementacija prema planu oporavka koda - P2 zadatak 5
 */

import { isRetryableError, AIProviderError } from '../services/ai.errors';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter?: boolean; // Dodaj random jitter za smanjenje thundering herd problema
}

/**
 * Generička retry funkcija s exponential backoff-om
 * 
 * @param fn - Funkcija koju treba pozvati s retry logikom
 * @param options - Opcije za retry ponašanje
 * @returns Promise s rezultatom funkcije
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000, // 1 sekunda
    maxDelay: 10000, // 10 sekundi
    backoffFactor: 2, // Eksponencijalni rast: 1s, 2s, 4s, 8s...
    jitter: true,
    ...options
  };

  let lastError: Error;
  let attempt = 0;

  while (attempt <= config.maxRetries) {
    try {
      // Pokušaj izvršiti funkciju
      return await fn();
    } catch (error) {
      lastError = error as Error;
      attempt++;

      // Provjeri je li greška retryable koristeći našu helper funkciju
      if (error instanceof AIProviderError && !isRetryableError(error)) {
        console.log(`Non-retryable error encountered: ${error.name}. Not retrying.`);
        throw error;
      }

      // Ako je ovo zadnji pokušaj, baci grešku
      if (attempt > config.maxRetries) {
        console.log(`Max retries (${config.maxRetries}) exceeded. Throwing last error.`);
        throw lastError;
      }

      // Izračunaj delay s exponential backoff
      let delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      // Dodaj jitter (random varijaciju) ako je omogućen
      if (config.jitter) {
        // Dodaj ±25% random varijacije
        const jitterRange = delay * 0.25;
        const jitterOffset = (Math.random() - 0.5) * 2 * jitterRange;
        delay = Math.max(0, delay + jitterOffset);
      }

      console.log(
        `Retry attempt ${attempt}/${config.maxRetries} after ${Math.round(delay)}ms delay. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );

      // Čekaj prije sljedećeg pokušaja
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Ovo se neće nikad izvršiti zbog logike iznad, ali TypeScript traži return
  throw lastError!;
}

/**
 * Helper funkcija za kreiranje retry wrapper-a oko postojećih funkcija
 * 
 * @param originalFn - Originalna funkcija
 * @param retryOptions - Opcije za retry
 * @returns Nova funkcija s retry logikom
 */
export function withRetry<TArgs extends any[], TReturn>(
  originalFn: (...args: TArgs) => Promise<TReturn>,
  retryOptions: Partial<RetryOptions> = {}
) {
  return async (...args: TArgs): Promise<TReturn> => {
    return retryWithBackoff(() => originalFn(...args), retryOptions);
  };
}

/**
 * Preddefinirane retry konfiguracije za različite scenarije
 */
export const RetryConfigs = {
  // Za AI API pozive - umjereno agresivno
  AI_API: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 2,
    jitter: true
  } as RetryOptions,

  // Za brze operacije - manje čekanje
  FAST_OPERATION: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: true
  } as RetryOptions,

  // Za spore operacije - više strpljenja
  SLOW_OPERATION: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 1.5,
    jitter: true
  } as RetryOptions,

  // Za kritične operacije - vrlo agresivno
  CRITICAL_OPERATION: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 15000,
    backoffFactor: 2,
    jitter: true
  } as RetryOptions
};
