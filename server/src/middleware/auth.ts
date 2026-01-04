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

    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseToken(token, firebaseProjectId);
    } catch (tokenError) {
      console.error('[AuthMiddleware] Token verification failed:', tokenError);
      throw new Error(`Token verification failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Atomic Upsert: Create or Update user to prevent race conditions
    const [user] = await db.insert(users)
      .values({
        id: firebaseUser.id,
        email: firebaseUser.email!,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: firebaseUser.email!,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!user) {
      console.error('[AuthMiddleware] Failed to create/retrieve user in DB');
      throw new Error('Failed to create or retrieve user');
    }

    c.set('user', user);
    await next();
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [AuthMiddleware] CRITICAL FAILURE:', errorMsg);
    if (error.stack) console.error(error.stack);

    // Return detailed error in development/debug
    return c.json({
      error: 'Unauthorized',
      message: errorMsg,
      details: 'Check server terminal for stack trace'
    }, 401);
  }
}

