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
import { scenes } from '../schema/schema.js';
import { eq } from 'drizzle-orm';
import {
  CreateSceneBodySchema,
  UpdateSceneBodySchema,
} from '../schemas/validation.js';
import type {
  CreateSceneBody,
  UpdateSceneBody,
} from '../schemas/validation.js';
import type { DatabaseUpdateData } from '../types/api.js';

export const scenesRouter = new Hono();

scenesRouter.get('/projects/:projectId/scenes', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireProjectOwnership(db, projectId, user.id);

  const projectScenes = await handleDatabaseOperation(async () => {
    return await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(scenes.order);
  });

  return c.json(projectScenes);
});

scenesRouter.post('/projects/:projectId/scenes', validateBody(CreateSceneBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { title, summary, content, order, locationId, chapterId } = getValidatedBody<CreateSceneBody>(c);

  await requireProjectOwnership(db, projectId, user.id);

  const newScene = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(scenes)
      .values({
        title,
        summary: summary || null,
        content: content || null,
        order: order || 0,
        locationId: locationId || null,
        chapterId: chapterId || null,
        projectId,
      })
      .returning();

    return result;
  });

  return c.json(newScene, 201);
});

scenesRouter.put('/scenes/:sceneId', validateBody(UpdateSceneBodySchema), async (c) => {
  const user = c.get('user');
  const sceneId = c.req.param('sceneId');

  requireValidUUID(sceneId, 'scene ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { title, summary, content, order, locationId, chapterId } = getValidatedBody<UpdateSceneBody>(c);

  await requireResourceOwnership(db, scenes, sceneId, user.id);

  const updateData: DatabaseUpdateData = {};
  if (title !== undefined) updateData.title = title;
  if (summary !== undefined) updateData.summary = summary || null;
  if (content !== undefined) updateData.content = content || null;
  if (order !== undefined) updateData.order = order;
  if (locationId !== undefined) updateData.locationId = locationId || null;
  if (chapterId !== undefined) updateData.chapterId = chapterId || null;

  const updatedScene = await handleDatabaseOperation(async () => {
    const [result] = await db
      .update(scenes)
      .set(updateData)
      .where(eq(scenes.id, sceneId))
      .returning();

    return result;
  });

  return c.json(updatedScene);
});

scenesRouter.delete('/scenes/:sceneId', async (c) => {
  const user = c.get('user');
  const sceneId = c.req.param('sceneId');

  requireValidUUID(sceneId, 'scene ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireResourceOwnership(db, scenes, sceneId, user.id);

  await handleDatabaseOperation(async () => {
    await db
      .delete(scenes)
      .where(eq(scenes.id, sceneId));
  });

  return c.json({ message: 'Scene deleted successfully' });
});
