import { Context, Next } from 'hono';

interface RateLimitOptions {
  windowMs: number;  // Vremenski okvir u ms
  max: number;       // Maksimalno zahtjeva po okviru
  keyGenerator?: (c: Context) => string;
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private options: RateLimitOptions) {}

  middleware() {
    return async (c: Context, next: Next) => {
      const key = this.options.keyGenerator 
        ? this.options.keyGenerator(c)
        : c.get('user')?.id || c.req.header('x-forwarded-for') || 'anonymous';

      const now = Date.now();
      const windowStart = now - this.options.windowMs;

      // Očisti stare zapise
      for (const [k, v] of this.requests.entries()) {
        if (v.resetTime < windowStart) {
          this.requests.delete(k);
        }
      }

      const current = this.requests.get(key) || { count: 0, resetTime: now + this.options.windowMs };

      if (current.count >= this.options.max) {
        return c.json({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        }, 429);
      }

      current.count++;
      this.requests.set(key, current);

      // Dodaj headers
      c.header('X-RateLimit-Limit', this.options.max.toString());
      c.header('X-RateLimit-Remaining', (this.options.max - current.count).toString());
      c.header('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());

      await next();
    };
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  return new RateLimiter(options);
}

// Preddefinirane konfiguracije
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minuta
  max: 10,              // 10 zahtjeva po minuti po korisniku
  keyGenerator: (c) => `ai:${c.get('user')?.id || 'anonymous'}`
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minuta
  max: 100                   // 100 zahtjeva po 15 minuta
});
