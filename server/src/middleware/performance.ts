import type { MiddlewareHandler } from 'hono';

/**
 * Performance monitoring middleware za Hono
 * Mjeri trajanje izvršavanja zahtjeva i logira performanse
 */
export const performanceMonitor = (): MiddlewareHandler => {
  return async (c, next) => {
    const startTime = Date.now();
    
    await next();
    
    const duration = Date.now() - startTime;
    
    // Logiraj trajanje za sve zahtjeve
    console.log(`[PERF] ${c.req.method} ${c.req.path} - ${duration}ms`);
    
    // Upozorenje za spore zahtjeve (> 1 sekunda)
    if (duration > 1000) {
      console.warn(`[SLOW] ${c.req.method} ${c.req.path} - ${duration}ms`);
    }
  };
};
