import { Context, Next } from 'hono';
import { z, ZodSchema } from 'zod';
import { ValidationError } from './errorHandler';

/**
 * Middleware za validaciju request body-ja koristeći Zod sheme
 * @param schema - Zod shema za validaciju
 * @returns Hono middleware funkcija
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      // Parsiranje JSON tijela zahtjeva
      const body = await c.req.json();
      
      // Validacija pomoću Zod sheme
      const validatedData = schema.parse(body);
      
      // Spremanje validirane podatke u context za korištenje u endpoint-u
      c.set('validatedBody', validatedData);
      
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Formatiranje Zod grešaka u čitljivu poruku
        const errorMessages = error.issues?.map(err => {
          const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
          return `${path}${err.message}`;
        }) || ['Unknown validation error'];
        
        throw new ValidationError(`Validation failed: ${errorMessages.join(', ')}`);
      }
      
      // Ponovno bacanje drugih grešaka
      throw error;
    }
  };
}

/**
 * Helper funkcija za dohvaćanje validirane podatke iz context-a
 * @param c - Hono context
 * @returns Validirane podatke
 */
export function getValidatedBody<T>(c: Context): T {
  return c.get('validatedBody') as T;
}

