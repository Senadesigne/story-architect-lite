import { MiddlewareHandler } from 'hono';
import { verifyFirebaseToken } from '../lib/firebase-auth';
import { getDatabase } from '../lib/db';
import { eq } from 'drizzle-orm';
import { users } from '../schema/schema'; 
import { getFirebaseProjectId, getDatabaseUrl } from '../lib/env';

declare module 'hono' {
  interface ContextVariableMap {
    user: typeof users.$inferSelect;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized', message: 'Authorization header is required' }, 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const firebaseProjectId = getFirebaseProjectId();
    const firebaseUser = await verifyFirebaseToken(token, firebaseProjectId);

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    console.log('🔍 DEBUG: firebaseUser.id:', firebaseUser.id);
    console.log('🔍 DEBUG: firebaseUser.email:', firebaseUser.email);
    
    // Prvo pokušaj pronaći korisnika po email-u
    let [user] = await db.select()
      .from(users)
      .where(eq(users.email, firebaseUser.email!))
      .limit(1);
      
    console.log('🔍 DEBUG: Existing user by email:', user);
    
    // Ako korisnik ne postoji, stvori ga
    if (!user) {
      const insertResult = await db.insert(users)
        .values({
          id: firebaseUser.id,
          email: firebaseUser.email!,
        })
        .returning();
        
      console.log('🔍 DEBUG: Insert result:', insertResult);
      user = insertResult[0];
    }

    console.log('🔍 DEBUG: Final user:', user);

    if (!user) {
      throw new Error('Failed to create or retrieve user');
    }

    c.set('user', user);
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return c.json({ error: 'Unauthorized', message }, 401);
  }
};

