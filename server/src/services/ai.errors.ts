/**
 * Custom Error klase za AI providere
 * Implementacija prema planu oporavka koda - P2 zadatak
 */

// Bazna klasa za sve AI provider greške
export class AIProviderError extends Error {
  constructor(
    message: string, 
    public providerName: string, 
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AIProviderError';
    
    // Osiguraj da se stack trace pravilno postavlja
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIProviderError);
    }
  }
}

// Greška za timeout situacije
export class AITimeoutError extends AIProviderError {
  constructor(providerName: string, public timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`, providerName);
    this.name = 'AITimeoutError';
  }
}

// Greška za prekoračenje kvote
export class AIQuotaExceededError extends AIProviderError {
  constructor(providerName: string, public retryAfter?: number) {
    super('AI provider quota exceeded', providerName);
    this.name = 'AIQuotaExceededError';
  }
}

// Greška za nevažeći API ključ
export class AIInvalidKeyError extends AIProviderError {
  constructor(providerName: string) {
    super('Invalid API key for AI provider', providerName);
    this.name = 'AIInvalidKeyError';
  }
}

// Greška za nevažeći odgovor od providera
export class AIInvalidResponseError extends AIProviderError {
  constructor(providerName: string, reason: string) {
    super(`Invalid response from AI provider: ${reason}`, providerName);
    this.name = 'AIInvalidResponseError';
  }
}

// Greška za rate limiting
export class AIRateLimitError extends AIProviderError {
  constructor(providerName: string, public retryAfter?: number) {
    super('AI provider rate limit exceeded', providerName);
    this.name = 'AIRateLimitError';
  }
}

// Greška za nedostupnost servisa
export class AIServiceUnavailableError extends AIProviderError {
  constructor(providerName: string) {
    super('AI provider service temporarily unavailable', providerName);
    this.name = 'AIServiceUnavailableError';
  }
}

/**
 * Helper funkcija za mapiranje grešaka od različitih AI providera
 * u naše standardizirane custom error klase
 */
export function mapAIError(error: any, providerName: string): AIProviderError {
  // Timeout greške
  if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
    return new AITimeoutError(providerName, 30000);
  }
  
  // Anthropic specifične greške
  if (error.type === 'authentication_error' || error.status === 401) {
    return new AIInvalidKeyError(providerName);
  }
  
  if (error.type === 'rate_limit_error' || error.status === 429) {
    const retryAfter = error.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) : undefined;
    return new AIRateLimitError(providerName, retryAfter);
  }
  
  if (error.type === 'overloaded_error' || error.status === 529) {
    return new AIServiceUnavailableError(providerName);
  }
  
  // Kvota greške (različiti provideri koriste različite kodove)
  if (
    error.code === 'insufficient_quota' || 
    error.message?.includes('quota') ||
    error.message?.includes('billing') ||
    error.status === 402
  ) {
    return new AIQuotaExceededError(providerName);
  }
  
  // Server greške (5xx)
  if (error.status >= 500 && error.status < 600) {
    return new AIServiceUnavailableError(providerName);
  }
  
  // Fallback - generička AI provider greška
  return new AIProviderError(
    `AI generation failed: ${error.message || 'Unknown error'}`, 
    providerName, 
    error
  );
}

/**
 * Type guard funkcije za lakše provjere tipova grešaka
 */
export function isRetryableError(error: AIProviderError): boolean {
  return (
    error instanceof AITimeoutError ||
    error instanceof AIRateLimitError ||
    error instanceof AIServiceUnavailableError ||
    error instanceof AIQuotaExceededError
  );
}

export function isAuthenticationError(error: AIProviderError): boolean {
  return error instanceof AIInvalidKeyError;
}

export function hasRetryAfter(error: AIProviderError): number | undefined {
  if (error instanceof AIRateLimitError || error instanceof AIQuotaExceededError) {
    return error.retryAfter;
  }
  return undefined;
}
