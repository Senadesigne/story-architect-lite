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
    console.log(`[AuthMiddleware] Processing request: ${c.req.method} ${c.req.url}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[AuthMiddleware] Missing or invalid Authorization header');
      return c.json({ error: 'Unauthorized', message: 'Authorization header is required' }, 401);
    }

    const token = authHeader.split('Bearer ')[1];
    console.log(`[AuthMiddleware] Token received (length: ${token.length}, prefix: ${token.substring(0, 10)}...)`);

    const firebaseProjectId = getFirebaseProjectId();
    console.log(`[AuthMiddleware] Using Firebase Project ID: ${firebaseProjectId}`);

    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseToken(token, firebaseProjectId);
      console.log(`[AuthMiddleware] Token verified for user: ${firebaseUser.email} (${firebaseUser.id})`);
    } catch (tokenError) {
      console.error('[AuthMiddleware] Token verification failed:', tokenError);
      throw new Error(`Token verification failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Prvo pokušaj pronaći korisnika po email-u
    let [user] = await db.select()
      .from(users)
      .where(eq(users.email, firebaseUser.email!))
      .limit(1);

    // Ako korisnik ne postoji, stvori ga
    if (!user) {
      console.log(`[AuthMiddleware] User not found in DB, creating: ${firebaseUser.email}`);
      const insertResult = await db.insert(users)
        .values({
          id: firebaseUser.id,
          email: firebaseUser.email!,
        })
        .returning();

      user = insertResult[0];
    }

    if (!user) {
      console.error('[AuthMiddleware] Failed to create/retrieve user in DB');
      throw new Error('Failed to create or retrieve user');
    }

    c.set('user', user);
    await next();
  } catch (error) {
    console.error('[AuthMiddleware] Auth error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return c.json({ error: 'Unauthorized', message }, 401);
  }
};

