import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { performanceMonitor } from './middleware/performance';
import { 
  errorHandler, 
  requireValidUUID, 
  requireProjectOwnership,
  requireResourceOwnership,
  handleDatabaseOperation 
} from './middleware/errorHandler';
import { validateBody, getValidatedBody } from './middleware/validation';
import { getDatabase } from './lib/db';
import { getDatabaseUrl } from './lib/env';
import { users, projects, locations, characters, scenes } from './schema/schema';
import { eq } from 'drizzle-orm';
import type {
  DatabaseUpdateData
} from './types/api';
import {
  UpdateUserBodySchema,
  CreateProjectBodySchema,
  UpdateProjectBodySchema,
  CreateLocationBodySchema,
  UpdateLocationBodySchema,
  CreateCharacterBodySchema,
  UpdateCharacterBodySchema,
  CreateSceneBodySchema,
  UpdateSceneBodySchema,
  GenerateSceneSynopsisBodySchema
} from './schemas/validation';
import { createDefaultAIProvider } from './services/ai.service';
import { ContextBuilder } from './services/context.builder';
import { PromptService } from './services/prompt.service';
import { aiRateLimiter } from './middleware/rateLimiter';

const app = new Hono();

// Performance monitoring middleware (registriran globalno)
app.use('*', performanceMonitor());

// CORS middleware
app.use('*', cors());

// Register error handler
app.onError(errorHandler);

// Health check endpoint
app.get('/', (c) => {
  return c.json({ message: 'API is running' });
});

// --- AI Test Route (Zadatak 3.4.3 i 3.4.4) ---
// Ova ruta je ZASAD izvan /projects i ne zahtijeva auth
// Služi samo za brzi "Proof of Concept" da AI servis radi.
app.post('/api/ai/test', aiRateLimiter.middleware(), async (c) => {
  try {
    // 1. Kreiraj AI providera pomoću factory funkcije
    const aiProvider = await createDefaultAIProvider();
    
    // 2. Opcionalno: Provjeri validnost ključa (dobra praksa)
    const isValid = await aiProvider.validateConnection();
    if (!isValid) {
      return c.json({ error: 'AI provider connection failed. Check API key.' }, 500);
    }

    // 3. Dohvati prompt iz body-ja (ili koristi default)
    const body = await c.req.json().catch(() => ({}));
    const prompt = body.prompt || 'Hello, Claude!';

    // 4. Generiraj tekst
    const aiResponse = await aiProvider.generateText(prompt, { maxTokens: 100 });

    return c.json({
      status: 'success',
      prompt: prompt,
      response: aiResponse,
    });

  } catch (error) {
    console.error('AI /test endpoint error:', error);
    // Ovdje još ne koristimo globalni error handler, ali bismo trebali
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});
// ---------------------------------------------

// Protected routes
app.use('/api/*', authMiddleware);

// User endpoint
app.get('/api/user', (c) => {
  const user = c.get('user');
  return c.json(user);
});

// Update user profile
app.put('/api/user', validateBody(UpdateUserBodySchema), async (c) => {
  const user = c.get('user');
  const { displayName, avatarUrl } = getValidatedBody(c);
  
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

// Delete user account
app.delete('/api/user', async (c) => {
  const user = c.get('user');
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  await handleDatabaseOperation(async () => {
    // Brisanje korisnika (cascade će obrisati sve projekte)
    await db.delete(users).where(eq(users.id, user.id));
  });
  
  return c.json({ message: 'User deleted successfully' });
});

// Projects endpoint - Nova ruta za dohvaćanje korisnikovih projekata
app.get('/api/projects', async (c) => {
  const user = c.get('user');
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  const userProjects = await handleDatabaseOperation(async () => {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id));
  });
  
  return c.json(userProjects);
});

// Projects endpoint - Nova ruta za kreiranje novog projekta
app.post('/api/projects', validateBody(CreateProjectBodySchema), async (c) => {
  const user = c.get('user');
  const { name } = getValidatedBody(c);
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

// Projects endpoint - Nova ruta za dohvaćanje pojedinog projekta
app.get('/api/projects/:projectId', async (c) => {
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

// Projects endpoint - Nova ruta za ažuriranje projekta (PUT)
app.put('/api/projects/:projectId', validateBody(UpdateProjectBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  
  requireValidUUID(projectId, 'project ID');
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  // Dohvaćanje validirane podatke
  const { logline, premise, theme, genre, audience, brainstorming, research, rules_definition, culture_and_history, synopsis, outline_notes, point_of_view } = getValidatedBody(c);
  
  await requireProjectOwnership(db, projectId, user.id);
  
  // Priprema podataka za ažuriranje
  const updateData: DatabaseUpdateData = {
    updatedAt: new Date(),
  };
  
  // Postojeća polja (Faza 1)
  if (logline !== undefined) updateData.logline = logline;
  if (premise !== undefined) updateData.premise = premise;
  if (theme !== undefined) updateData.theme = theme;
  if (genre !== undefined) updateData.genre = genre;
  if (audience !== undefined) updateData.audience = audience;
  
  // Nova polja (Faza 2)
  if (brainstorming !== undefined) updateData.brainstorming = brainstorming;
  if (research !== undefined) updateData.research = research;
  
  // Nova polja (Faza 3)
  if (rules_definition !== undefined) updateData.rules_definition = rules_definition;
  if (culture_and_history !== undefined) updateData.culture_and_history = culture_and_history;
  
  // Nova polja (Faza 5)
  if (synopsis !== undefined) updateData.synopsis = synopsis;
  if (outline_notes !== undefined) updateData.outline_notes = outline_notes;
  
  // Nova polja (Faza 6)
  if (point_of_view !== undefined) updateData.point_of_view = point_of_view;
  
  // Ažuriranje projekta
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

// Projects endpoint - DELETE ruta za brisanje projekta
app.delete('/api/projects/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  
  requireValidUUID(projectId, 'project ID');
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  await requireProjectOwnership(db, projectId, user.id);
  
  await handleDatabaseOperation(async () => {
    // Brisanje projekta (cascade će obrisati sve povezane entitete)
    await db
      .delete(projects)
      .where(eq(projects.id, projectId));
  });
  
  return c.json({ message: 'Project deleted successfully' });
});

// GET /api/projects/:projectId/locations
app.get('/api/projects/:projectId/locations', async (c) => {
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

// POST /api/projects/:projectId/locations
app.post('/api/projects/:projectId/locations', validateBody(CreateLocationBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  
  requireValidUUID(projectId, 'project ID');
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  // Dohvaćanje validirane podatke
  const { name, description } = getValidatedBody(c);
  
  await requireProjectOwnership(db, projectId, user.id);
  
  const newLocation = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(locations)
      .values({
        name: name,
        description: description || null,
        projectId: projectId,
      })
      .returning();
    
    return result;
  });
  
  return c.json(newLocation, 201);
});

// PUT /api/locations/:locationId
app.put('/api/locations/:locationId', validateBody(UpdateLocationBodySchema), async (c) => {
  const user = c.get('user');
  const locationId = c.req.param('locationId');
  
  requireValidUUID(locationId, 'location ID');
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  // Dohvaćanje validirane podatke
  const { name, description } = getValidatedBody(c);
  
  await requireResourceOwnership(db, locations, locationId, user.id);
  
  // Priprema podataka za ažuriranje
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

// DELETE /api/locations/:locationId
app.delete('/api/locations/:locationId', async (c) => {
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

// ========== CHARACTERS API ==========

// GET /api/projects/:projectId/characters
app.get('/api/projects/:projectId/characters', async (c) => {
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

// POST /api/projects/:projectId/characters
app.post('/api/projects/:projectId/characters', validateBody(CreateCharacterBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  
  requireValidUUID(projectId, 'project ID');
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  // Dohvaćanje validirane podatke
  const { name, role, motivation, goal, fear, backstory, arcStart, arcEnd } = getValidatedBody(c);
  
  await requireProjectOwnership(db, projectId, user.id);
  
  const newCharacter = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(characters)
      .values({
        name: name,
        role: role || null,
        motivation: motivation || null,
        goal: goal || null,
        fear: fear || null,
        backstory: backstory || null,
        arcStart: arcStart || null,
        arcEnd: arcEnd || null,
        projectId: projectId,
      })
      .returning();
    
    return result;
  });
  
  return c.json(newCharacter, 201);
});

// PUT /api/characters/:characterId
app.put('/api/characters/:characterId', validateBody(UpdateCharacterBodySchema), async (c) => {
  const user = c.get('user');
  const characterId = c.req.param('characterId');
  
  requireValidUUID(characterId, 'character ID');
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  // Dohvaćanje validirane podatke
  const { name, role, motivation, goal, fear, backstory, arcStart, arcEnd } = getValidatedBody(c);
  
  await requireResourceOwnership(db, characters, characterId, user.id);
  
  // Priprema podataka za ažuriranje
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

// DELETE /api/characters/:characterId
app.delete('/api/characters/:characterId', async (c) => {
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

// ========== SCENES API ==========

// GET /api/projects/:projectId/scenes
app.get('/api/projects/:projectId/scenes', async (c) => {
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

// POST /api/projects/:projectId/scenes
app.post('/api/projects/:projectId/scenes', validateBody(CreateSceneBodySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  
  requireValidUUID(projectId, 'project ID');
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  // Dohvaćanje validirane podatke
  const { title, summary, order, locationId } = getValidatedBody(c);
  
  await requireProjectOwnership(db, projectId, user.id);
  
  const newScene = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(scenes)
      .values({
        title: title,
        summary: summary || null,
        order: order || 0,
        locationId: locationId || null,
        projectId: projectId,
      })
      .returning();
    
    return result;
  });
  
  return c.json(newScene, 201);
});

// PUT /api/scenes/:sceneId
app.put('/api/scenes/:sceneId', validateBody(UpdateSceneBodySchema), async (c) => {
  const user = c.get('user');
  const sceneId = c.req.param('sceneId');
  
  requireValidUUID(sceneId, 'scene ID');
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  // Dohvaćanje validirane podatke
  const { title, summary, order, locationId } = getValidatedBody(c);
  
  await requireResourceOwnership(db, scenes, sceneId, user.id);
  
  // Priprema podataka za ažuriranje
  const updateData: DatabaseUpdateData = {};
  if (title !== undefined) updateData.title = title;
  if (summary !== undefined) updateData.summary = summary || null;
  if (order !== undefined) updateData.order = order;
  if (locationId !== undefined) updateData.locationId = locationId || null;
  
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

// DELETE /api/scenes/:sceneId
app.delete('/api/scenes/:sceneId', async (c) => {
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

// ========== AI ENDPOINTS ==========

// --- AI: Generate Scene Synopsis (Zadatak 3.3) ---
app.post(
  '/api/projects/:projectId/ai/generate-scene-synopsis',
  aiRateLimiter.middleware(),
  validateBody(GenerateSceneSynopsisBodySchema), // (Zadatak 3.3.7)
  async (c) => {
    const user = c.get('user');
    const { projectId } = c.req.param();
    const { sceneId } = getValidatedBody(c);
    
    requireValidUUID(projectId, 'project ID');
    requireValidUUID(sceneId, 'scene ID');
    
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Provjeri vlasništvo projekta
    await requireProjectOwnership(db, projectId, user.id);

    // 1. Kreiraj AI Providera pomoću factory funkcije
    const aiProvider = await createDefaultAIProvider();

    // 3. Sastavi Kontekst (Zadatak 3.3.8)
    const context = await ContextBuilder.buildSceneContext(
      sceneId,
      db,
      projectId,
    );

    // 4. Generiraj Prompt (Zadatak 3.3.8)
    const prompt = PromptService.buildSceneSynopsisPrompt(context);

    // 5. Pozovi AI (Zadatak 3.3.9)
    const synopsis = await aiProvider.generateText(prompt, {
      maxTokens: 500, // Malo više za sinopsis
    });

    // 6. Vrati odgovor (Zadatak 3.3.10)
    return c.json({
      status: 'success',
      synopsis: synopsis,
    });
  },
);
// --------------------------------------------------

export default app;

