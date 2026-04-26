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
import { characters } from '../schema/schema.js';
import { eq } from 'drizzle-orm';
import {
  CreateCharacterBodySchema,
  UpdateCharacterBodySchema,
} from '../schemas/validation.js';
import type {
  CreateCharacterBody,
  UpdateCharacterBody,
} from '../schemas/validation.js';
import type { DatabaseUpdateData } from '../types/api.js';

export const charactersRouter = new Hono();

charactersRouter.get('/projects/:projectId/characters', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireProjectOwnership(db, projectId, user.id);

  const projectCharacters = await handleDatabaseOperation(async () => {
    return await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId));
  });

  return c.json(projectCharacters);
});

charactersRouter.post('/projects/:projectId/characters', validateBody(CreateCharacterBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { name, role, motivation, goal, fear, backstory, arcStart, arcEnd } = getValidatedBody<CreateCharacterBody>(c);

  await requireProjectOwnership(db, projectId, user.id);

  const newCharacter = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(characters)
      .values({
        name,
        role: role || null,
        motivation: motivation || null,
        goal: goal || null,
        fear: fear || null,
        backstory: backstory || null,
        arcStart: arcStart || null,
        arcEnd: arcEnd || null,
        projectId,
      })
      .returning();

    return result;
  });

  return c.json(newCharacter, 201);
});

charactersRouter.put('/characters/:characterId', validateBody(UpdateCharacterBodySchema), async (c) => {
  const user = c.get('user');
  const characterId = c.req.param('characterId');

  requireValidUUID(characterId, 'character ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { name, role, motivation, goal, fear, backstory, arcStart, arcEnd } = getValidatedBody<UpdateCharacterBody>(c);

  await requireResourceOwnership(db, characters, characterId, user.id);

  const updateData: DatabaseUpdateData = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role || null;
  if (motivation !== undefined) updateData.motivation = motivation || null;
  if (goal !== undefined) updateData.goal = goal || null;
  if (fear !== undefined) updateData.fear = fear || null;
  if (backstory !== undefined) updateData.backstory = backstory || null;
  if (arcStart !== undefined) updateData.arcStart = arcStart || null;
  if (arcEnd !== undefined) updateData.arcEnd = arcEnd || null;

  const updatedCharacter = await handleDatabaseOperation(async () => {
    const [result] = await db
      .update(characters)
      .set(updateData)
      .where(eq(characters.id, characterId))
      .returning();

    return result;
  });

  return c.json(updatedCharacter);
});

charactersRouter.delete('/characters/:characterId', async (c) => {
  const user = c.get('user');
  const characterId = c.req.param('characterId');

  requireValidUUID(characterId, 'character ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireResourceOwnership(db, characters, characterId, user.id);

  await handleDatabaseOperation(async () => {
    await db
      .delete(characters)
      .where(eq(characters.id, characterId));
  });

  return c.json({ message: 'Character deleted successfully' });
});
