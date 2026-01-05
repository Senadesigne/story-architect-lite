import { Hono } from 'hono';
// Force git update
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth.js';
import { performanceMonitor } from './middleware/performance.js';
import {
  errorHandler,
  requireValidUUID,
  requireProjectOwnership,
  requireResourceOwnership,
  handleDatabaseOperation
} from './middleware/errorHandler.js';
import { validateBody, getValidatedBody } from './middleware/validation.js';
import { getDatabase } from './lib/db.js';
import { getDatabaseUrl } from './lib/env.js';
import { users, projects, locations, characters, scenes, chapters, storyArchitectEmbeddings, chatMessages } from './schema/schema.js';
import sessions from './routes/sessions.js';
import { eq, sql } from 'drizzle-orm';
import type {
  DatabaseUpdateData
} from './types/api.js';
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
  CreateChapterBodySchema,
  UpdateChapterBodySchema,
  GenerateSceneSynopsisBodySchema,
  ChatRequestBodySchema
} from './schemas/validation.js';
import type {
  UpdateUserBody,
  CreateProjectBody,
  UpdateProjectBody,
  CreateLocationBody,
  UpdateLocationBody,
  CreateCharacterBody,
  UpdateCharacterBody,
  CreateSceneBody,
  UpdateSceneBody,
  CreateChapterBody,
  UpdateChapterBody,
  GenerateSceneSynopsisBody,
  ChatRequestBody
} from './schemas/validation.js';
import { createDefaultAIProvider } from './services/ai.service.js';
import { ContextBuilder } from './services/context.builder.js';
import { PromptService } from './services/prompt.service.js';
import { aiRateLimiter } from './middleware/rateLimiter.js';
import { getRelevantContext } from './services/ai/ai.retriever.js';
import { runStoryArchitectGraph, createStoryArchitectGraph, createInitialState } from './services/ai/graph/graph.js';
import { HumanMessage, AIMessage } from "@langchain/core/messages";

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

  } catch (error: unknown) {
    console.error('AI /test endpoint error:', error);
    // Ovdje još ne koristimo globalni error handler, ali bismo trebali
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ error: errorMessage }, 500);
  }
});

// GET /api/ai/test-rag
// Test endpoint za RAG funkcionalnost - ne zahtijeva autentifikaciju
app.get('/api/ai/test-rag', async (c) => {
  try {
    // Dohvati query parametar
    const query = c.req.query('query') || 'test query';

    console.log('Testing RAG with query:', query);

    // Pozovi getRelevantContext funkciju
    const result = await getRelevantContext(query);

    return c.json({
      status: 'success',
      query: query,
      result: result,
      timestamp: new Date().toISOString(),
      message: 'RAG test completed successfully'
    });

  } catch (error) {
    console.error('RAG test endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({
      status: 'error',
      error: 'RAG test failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// GET /api/ai/test-graph
// Test endpoint za testiranje cijelog AI grafa (Zadaci 3.8 i 3.9) - ne zahtijeva autentifikaciju
app.get('/api/ai/test-graph', async (c) => {
  try {
    // Dohvati query parametar
    const query = c.req.query('query') || 'Napiši kratku scenu gdje se glavni lik suočava s dilemom';

    console.log('Testing Graph with query:', query);

    // Postavljamo prazan storyContext kako bi se AI oslanjao isključivo na RAG kontekst iz vektorske baze
    const initialState = createInitialState(query, "");

    console.log('Created initial state:', {
      userInput: initialState.userInput,
      storyContext: initialState.storyContext.substring(0, 100) + '...',
      draftCount: initialState.draftCount
    });

    // Kreiraj i kompajliraj graf
    const graph = createStoryArchitectGraph();
    const compiledGraph = graph.compile();

    console.log('Graph compiled successfully, invoking...');

    // Pozovi graf
    const startTime = Date.now();
    const finalState = await compiledGraph.invoke(initialState);
    const executionTime = Date.now() - startTime;

    console.log('Graph execution completed in', executionTime, 'ms');

    // Vrati cijeli finalState objekt kao JSON odgovor
    return c.json({
      status: 'success',
      query: query,
      executionTime: executionTime,
      timestamp: new Date().toISOString(),
      finalState: finalState,
      message: 'Graph test completed successfully'
    });

  } catch (error) {
    console.error('Graph test endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return c.json({
      status: 'error',
      error: 'Graph test failed',
      details: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// POST /api/ai/test-agent
// Ova ruta služi za testiranje cijelog AI grafa (Zadatak 3.11)
app.post('/api/ai/test-agent', authMiddleware, async (c) => {
  try {
    // Korisnik je potreban za auth, ali ga ne koristimo u logici
    c.get('user'); // Samo da se provjeri da je autenticiran
    const body = await c.req.json();
    const { userInput, storyContext } = body;

    if (!userInput) {
      return c.json({ error: 'userInput je obavezan' }, 400);
    }

    console.log("--- POKRETANJE AI AGENTA (Test) ---", { userInput, storyContext });

    // Pokreni graf koristeći novi runStoryArchitectGraph
    const finalState = await runStoryArchitectGraph(
      userInput,
      storyContext || "Nema pruženog globalnog konteksta priče."
    );

    console.log("--- AI AGENT ZAVRŠIO (Test) ---", finalState);

    // Vrati *cijeli* finalni state da ga možemo analizirati
    return c.json(finalState);

  } catch (error: unknown) {
    console.error('Greška u AI Agent testu:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Test Agenta nije uspio', details: errorMessage }, 500);
  }
});
// ---------------------------------------------

import { editor } from './routes/editor.routes.js';

// Protected routes
app.use('/api/*', authMiddleware);

// Mount sessions route
app.route('/api/sessions', sessions);

// Mount editor route
app.route('/api/editor', editor);

// User endpoint
app.get('/api/user', (c) => {
  const user = c.get('user');
  return c.json(user);
});

// Update user profile
app.put('/api/user', validateBody(UpdateUserBodySchema), async (c) => {
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

  try {
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const userProjects = await handleDatabaseOperation(async () => {
      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, user.id));
      return result;
    });

    // Ensure we always return an array
    return c.json(userProjects || []);

  } catch (error) {
    console.error('[GET /api/projects] Error fetching projects:', error);

    // In case of error, return empty array to prevent UI crash
    return c.json([], 200);
  }
});

// Projects endpoint - Nova ruta za kreiranje novog projekta
app.post('/api/projects', validateBody(CreateProjectBodySchema), async (c) => {
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
  const { story_idea, premise, theme, genre, audience, brainstorming, research, rules_definition, culture_and_history, synopsis, outline_notes, point_of_view } = getValidatedBody<UpdateProjectBody>(c);

  await requireProjectOwnership(db, projectId, user.id);

  // Priprema podataka za ažuriranje
  const updateData: DatabaseUpdateData = {
    updatedAt: new Date(),
  };

  // Nova polja (Faza 0)
  if (story_idea !== undefined) updateData.story_idea = story_idea;

  // Postojeća polja (Faza 1)
  // logline removed
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
    // 1. Obriši embeddings povezane s projektom (Manual Cleanup jer nema FK)
    // Koristimo SQL operator za pristup JSONB polju
    await db
      .delete(storyArchitectEmbeddings)
      .where(sql`${storyArchitectEmbeddings.metadata}->>'projectId' = ${projectId}`);

    // 2. Brisanje projekta (cascade će obrisati sve ostale povezane entitete: characters, scenes, locations)
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
  const { name, description } = getValidatedBody<CreateLocationBody>(c);

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
  const { name, description } = getValidatedBody<UpdateLocationBody>(c);

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
  const { name, role, motivation, goal, fear, backstory, arcStart, arcEnd } = getValidatedBody<CreateCharacterBody>(c);

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
  const { name, role, motivation, goal, fear, backstory, arcStart, arcEnd } = getValidatedBody<UpdateCharacterBody>(c);

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

// ========== CHAPTERS API ==========

// GET /api/projects/:projectId/chapters
app.get('/api/projects/:projectId/chapters', async (c) => {
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

// POST /api/projects/:projectId/chapters
app.post('/api/projects/:projectId/chapters', validateBody(CreateChapterBodySchema), async (c) => {
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
        title: title,
        phase: phase,
        order: order || 0,
        projectId: projectId,
      })
      .returning();

    return result;
  });

  return c.json(newChapter, 201);
});

// PUT /api/chapters/:chapterId
app.put('/api/chapters/:chapterId', validateBody(UpdateChapterBodySchema), async (c) => {
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

// DELETE /api/chapters/:chapterId
app.delete('/api/chapters/:chapterId', async (c) => {
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
  const { title, summary, order, locationId, chapterId } = getValidatedBody<CreateSceneBody>(c);

  await requireProjectOwnership(db, projectId, user.id);

  const newScene = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(scenes)
      .values({
        title: title,
        summary: summary || null,
        order: order || 0,
        locationId: locationId || null,
        chapterId: chapterId || null,
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
  const { title, summary, order, locationId, chapterId } = getValidatedBody<UpdateSceneBody>(c);

  await requireResourceOwnership(db, scenes, sceneId, user.id);

  // Priprema podataka za ažuriranje
  const updateData: DatabaseUpdateData = {};
  if (title !== undefined) updateData.title = title;
  if (summary !== undefined) updateData.summary = summary || null;
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
    const { sceneId } = getValidatedBody<GenerateSceneSynopsisBody>(c);

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

// --- Chat API (Zadatak C.1) ---
app.post(
  '/api/projects/:projectId/chat',
  aiRateLimiter.middleware(),
  validateBody(ChatRequestBodySchema),
  async (c) => {
    const user = c.get('user');
    const { projectId } = c.req.param();
    const { userInput, plannerContext, messages, mode, editorContent, selection, sessionId } = getValidatedBody<ChatRequestBody>(c);

    requireValidUUID(projectId, 'project ID');

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    await requireProjectOwnership(db, projectId, user.id);

    // Logiranje ulaznih parametara za debugging
    console.log("📥 Chat API poziv:", {
      projectId,
      sessionId,
      hasPlannerContext: !!plannerContext,
      plannerContext: plannerContext || "none",
      mode: mode || "planner (default)",
      hasMessages: !!messages,
      messagesCount: messages?.length || 0,
      userInputLength: userInput.length,
      hasEditorContent: !!editorContent,
      selectionLength: selection?.length || 0
    });

    // 1. Save User Message if sessionId is provided
    if (sessionId) {
      await handleDatabaseOperation(async () => {
        await db.insert(chatMessages).values({
          sessionId,
          role: 'user',
          content: userInput,
          metadata: { mode },
        });
      });
    }

    // AI Graf Integracija
    const finalState = await handleDatabaseOperation(async () => {
      const projectContext = await ContextBuilder.buildProjectContext(projectId, db);
      const storyContext = ContextBuilder.formatProjectContextToString(projectContext);

      // Mapiranje poruka u LangChain format
      const langChainMessages = messages?.map(m =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      ) || [];

      const state = await runStoryArchitectGraph(userInput, storyContext, plannerContext, mode, editorContent, langChainMessages, selection);
      return state;
    });

    // 2. Save Assistant Message if sessionId is provided and we have output
    if (sessionId && finalState.finalOutput) {
      await handleDatabaseOperation(async () => {
        await db.insert(chatMessages).values({
          sessionId,
          role: 'assistant',
          content: finalState.finalOutput!,
          metadata: {
            mode,
            draftCount: finalState.draftCount,
            routingDecision: finalState.routingDecision
          },
        });
      });
    }

    // Dijagnostički logovi za provjeru izlaza
    console.log("🔄 Backend šalje finalState (iz api.ts):", finalState);
    console.log("🔍 Sadrži 'finalOutput' polje:", finalState.hasOwnProperty('finalOutput'));
    console.log("🔍 Vrijednost 'finalOutput' (skraćeno):", finalState.finalOutput ? finalState.finalOutput.substring(0, 100) + '...' : finalState.finalOutput);

    return c.json(finalState);
  }
);
// --------------------------------------------------

export default app;

