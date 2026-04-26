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
import { locations } from '../schema/schema.js';
import { eq } from 'drizzle-orm';
import {
  CreateLocationBodySchema,
  UpdateLocationBodySchema,
} from '../schemas/validation.js';
import type {
  CreateLocationBody,
  UpdateLocationBody,
} from '../schemas/validation.js';
import type { DatabaseUpdateData } from '../types/api.js';

export const locationsRouter = new Hono();

locationsRouter.get('/projects/:projectId/locations', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireProjectOwnership(db, projectId, user.id);

  const projectLocations = await handleDatabaseOperation(async () => {
    return await db
      .select()
      .from(locations)
      .where(eq(locations.projectId, projectId));
  });

  return c.json(projectLocations);
});

locationsRouter.post('/projects/:projectId/locations', validateBody(CreateLocationBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { name, description } = getValidatedBody<CreateLocationBody>(c);

  await requireProjectOwnership(db, projectId, user.id);

  const newLocation = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(locations)
      .values({
        name,
        description: description || null,
        projectId,
      })
      .returning();

    return result;
  });

  return c.json(newLocation, 201);
});

locationsRouter.put('/locations/:locationId', validateBody(UpdateLocationBodySchema), async (c) => {
  const user = c.get('user');
  const locationId = c.req.param('locationId');

  requireValidUUID(locationId, 'location ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { name, description } = getValidatedBody<UpdateLocationBody>(c);

  await requireResourceOwnership(db, locations, locationId, user.id);

  const updateData: DatabaseUpdateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description || null;

  const updatedLocation = await handleDatabaseOperation(async () => {
    const [result] = await db
      .update(locations)
      .set(updateData)
      .where(eq(locations.id, locationId))
      .returning();

    return result;
  });

  return c.json(updatedLocation);
});

locationsRouter.delete('/locations/:locationId', async (c) => {
  const user = c.get('user');
  const locationId = c.req.param('locationId');

  requireValidUUID(locationId, 'location ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireResourceOwnership(db, locations, locationId, user.id);

  await handleDatabaseOperation(async () => {
    await db
      .delete(locations)
      .where(eq(locations.id, locationId));
  });

  return c.json({ message: 'Location deleted successfully' });
});
