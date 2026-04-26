import { Hono } from 'hono';
import { validateBody, getValidatedBody } from '../middleware/validation.js';
import { handleDatabaseOperation } from '../middleware/errorHandler.js';
import { getDatabase } from '../lib/db.js';
import { getDatabaseUrl } from '../lib/env.js';
import { users } from '../schema/schema.js';
import { eq } from 'drizzle-orm';
import { UpdateUserBodySchema } from '../schemas/validation.js';
import type { UpdateUserBody } from '../schemas/validation.js';

export const userRouter = new Hono();

userRouter.get('/user', (c) => {
  const user = c.get('user');
  return c.json(user);
});

userRouter.put('/user', validateBody(UpdateUserBodySchema), async (c) => {
  const user = c.get('user');
  const { displayName, avatarUrl } = getValidatedBody<UpdateUserBody>(c);

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const updatedUser = await handleDatabaseOperation(async () => {
    const [result] = await db
      .update(users)
      .set({
        displayName: displayName || null,
        avatarUrl: avatarUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return result;
  });

  return c.json(updatedUser);
});

userRouter.delete('/user', async (c) => {
  const user = c.get('user');
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await handleDatabaseOperation(async () => {
    await db.delete(users).where(eq(users.id, user.id));
  });

  return c.json({ message: 'User deleted successfully' });
});
