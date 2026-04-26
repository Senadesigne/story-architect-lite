import { Hono } from 'hono';
import { validateBody, getValidatedBody } from '../middleware/validation.js';
import {
  requireValidUUID,
  requireProjectOwnership,
  handleDatabaseOperation
} from '../middleware/errorHandler.js';
import { getDatabase } from '../lib/db.js';
import { getDatabaseUrl } from '../lib/env.js';
import { projects, storyArchitectEmbeddings } from '../schema/schema.js';
import { eq, sql } from 'drizzle-orm';
import {
  CreateProjectBodySchema,
  UpdateProjectBodySchema,
} from '../schemas/validation.js';
import type {
  CreateProjectBody,
  UpdateProjectBody,
} from '../schemas/validation.js';
import type { DatabaseUpdateData } from '../types/api.js';

export const projectsRouter = new Hono();

projectsRouter.get('/projects', async (c) => {
  const user = c.get('user');

  try {
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const userProjects = await handleDatabaseOperation(async () => {
      return await db
        .select()
        .from(projects)
        .where(eq(projects.userId, user.id));
    });

    return c.json(userProjects || []);
  } catch (error) {
    console.error('[GET /api/projects] Error fetching projects:', error);
    return c.json([], 200);
  }
});

projectsRouter.post('/projects', validateBody(CreateProjectBodySchema), async (c) => {
  const user = c.get('user');
  const { name } = getValidatedBody<CreateProjectBody>(c);
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const newProject = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(projects)
      .values({
        title: name,
        userId: user.id,
      })
      .returning();

    return result;
  });

  return c.json(newProject, 201);
});

projectsRouter.get('/projects/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireProjectOwnership(db, projectId, user.id);

  const project = await handleDatabaseOperation(async () => {
    const [result] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return result;
  });

  return c.json(project);
});

projectsRouter.put('/projects/:projectId', validateBody(UpdateProjectBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const {
    story_idea, premise, theme, genre, audience,
    brainstorming, research, rules_definition, culture_and_history,
    synopsis, outline_notes, point_of_view,
  } = getValidatedBody<UpdateProjectBody>(c);

  await requireProjectOwnership(db, projectId, user.id);

  const updateData: DatabaseUpdateData = { updatedAt: new Date() };

  if (story_idea !== undefined) updateData.story_idea = story_idea;
  if (premise !== undefined) updateData.premise = premise;
  if (theme !== undefined) updateData.theme = theme;
  if (genre !== undefined) updateData.genre = genre;
  if (audience !== undefined) updateData.audience = audience;
  if (brainstorming !== undefined) updateData.brainstorming = brainstorming;
  if (research !== undefined) updateData.research = research;
  if (rules_definition !== undefined) updateData.rules_definition = rules_definition;
  if (culture_and_history !== undefined) updateData.culture_and_history = culture_and_history;
  if (synopsis !== undefined) updateData.synopsis = synopsis;
  if (outline_notes !== undefined) updateData.outline_notes = outline_notes;
  if (point_of_view !== undefined) updateData.point_of_view = point_of_view;

  const updatedProject = await handleDatabaseOperation(async () => {
    const [result] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    return result;
  });

  return c.json(updatedProject);
});

projectsRouter.delete('/projects/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  requireValidUUID(projectId, 'project ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  await requireProjectOwnership(db, projectId, user.id);

  await handleDatabaseOperation(async () => {
    await db
      .delete(storyArchitectEmbeddings)
      .where(sql`${storyArchitectEmbeddings.metadata}->>'projectId' = ${projectId}`);

    await db
      .delete(projects)
      .where(eq(projects.id, projectId));
  });

  return c.json({ message: 'Project deleted successfully' });
});
