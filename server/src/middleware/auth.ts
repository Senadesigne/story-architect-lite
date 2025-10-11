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
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const firebaseProjectId = getFirebaseProjectId();
    const firebaseUser = await verifyFirebaseToken(token, firebaseProjectId);

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    await db.insert(users)
      .values({
        id: firebaseUser.id,
        email: firebaseUser.email!,
      })
      .onConflictDoNothing();
      
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, firebaseUser.id))
      .limit(1);

    if (!user) {
      throw new Error('Failed to create or retrieve user');
    }

    c.set('user', user);
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

