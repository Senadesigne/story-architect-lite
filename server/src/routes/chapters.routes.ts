import { Hono } from 'hono';
import { validateBody, getValidatedBody } from '../middleware/validation.js';
import {
  requireValidUUID,
  requireProjectOwnership,
  requireResourceOwnership,
  handleDatabaseOperation
} from '../middleware/errorHandler.js';
import { getDatabase } from '../lib/db.js';
import { getDatabaseUrl } from '../lib/env.js';
import { chapters } from '../schema/schema.js';
import { eq } from 'drizzle-orm';
import {
  CreateChapterBodySchema,
  UpdateChapterBodySchema,
} from '../schemas/validation.js';
import type {
  CreateChapterBody,
  UpdateChapterBody,
} from '../schemas/validation.js';
import type { DatabaseUpdateData } from '../types/api.js';

export const chaptersRouter = new Hono();

chaptersRouter.get('/projects/:projectId/chapters', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireProjectOwnership(db, projectId, user.id);

  const projectChapters = await handleDatabaseOperation(async () => {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .orderBy(chapters.order);
  });

  return c.json(projectChapters);
});

chaptersRouter.post('/projects/:projectId/chapters', validateBody(CreateChapterBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { title, phase, order } = getValidatedBody<CreateChapterBody>(c);

  await requireProjectOwnership(db, projectId, user.id);

  const newChapter = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(chapters)
      .values({
        title,
        phase,
        order: order || 0,
        projectId,
      })
      .returning();

    return result;
  });

  return c.json(newChapter, 201);
});

chaptersRouter.put('/chapters/:chapterId', validateBody(UpdateChapterBodySchema), async (c) => {
  const user = c.get('user');
  const chapterId = c.req.param('chapterId');

  requireValidUUID(chapterId, 'chapter ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { title, phase, order } = getValidatedBody<UpdateChapterBody>(c);

  await requireResourceOwnership(db, chapters, chapterId, user.id);

  const updateData: DatabaseUpdateData = {};
  if (title !== undefined) updateData.title = title;
  if (phase !== undefined) updateData.phase = phase;
  if (order !== undefined) updateData.order = order;

  const updatedChapter = await handleDatabaseOperation(async () => {
    const [result] = await db
      .update(chapters)
      .set(updateData)
      .where(eq(chapters.id, chapterId))
      .returning();

    return result;
  });

  return c.json(updatedChapter);
});

chaptersRouter.delete('/chapters/:chapterId', async (c) => {
  const user = c.get('user');
  const chapterId = c.req.param('chapterId');

  requireValidUUID(chapterId, 'chapter ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireResourceOwnership(db, chapters, chapterId, user.id);

  await handleDatabaseOperation(async () => {
    await db
      .delete(chapters)
      .where(eq(chapters.id, chapterId));
  });

  return c.json({ message: 'Chapter deleted successfully' });
});
