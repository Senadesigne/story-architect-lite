import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { getDatabase } from './lib/db';
import { getDatabaseUrl } from './lib/env';
import { projects, locations, characters, scenes } from './schema/schema';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

// CORS middleware
app.use('*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json({ message: 'API is running' });
});

// Protected routes
app.use('/api/*', authMiddleware);

// User endpoint
app.get('/api/user', (c) => {
  const user = c.get('user');
  return c.json(user);
});

// Projects endpoint - Nova ruta za dohvaćanje korisnikovih projekata
app.get('/api/projects', async (c) => {
  const user = c.get('user');
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));
  
  return c.json(userProjects);
});

// Projects endpoint - Nova ruta za kreiranje novog projekta
app.post('/api/projects', async (c) => {
  try {
    const user = c.get('user');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    const [newProject] = await db
      .insert(projects)
      .values({
        title: 'Novi Projekt',
        userId: user.id,
      })
      .returning();
    
    return c.json(newProject, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

// Projects endpoint - Nova ruta za dohvaćanje pojedinog projekta
app.get('/api/projects/:projectId', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json({ error: 'Invalid project ID format' }, 400);
    }
    
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    return c.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({ error: 'Failed to fetch project' }, 500);
  }
});

// Projects endpoint - Nova ruta za ažuriranje projekta (PUT)
app.put('/api/projects/:projectId', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json({ error: 'Invalid project ID format' }, 400);
    }
    
    // Parsiranje tijela zahtjeva
    const body = await c.req.json();
    const { logline, premise, theme, genre, audience, brainstorming, research, rules_definition, culture_and_history, synopsis, outline_notes, point_of_view } = body;
    
    // Validacija da je barem jedno polje poslano
    if (logline === undefined && premise === undefined && theme === undefined && 
        genre === undefined && audience === undefined && 
        brainstorming === undefined && research === undefined &&
        rules_definition === undefined && culture_and_history === undefined &&
        synopsis === undefined && outline_notes === undefined &&
        point_of_view === undefined) {
      return c.json({ 
        error: 'At least one field must be provided' 
      }, 400);
    }
    
    // Provjera da projekt postoji i pripada korisniku
    const [existingProject] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!existingProject) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Priprema podataka za ažuriranje
    const updateData: any = {
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
    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .returning();
    
    return c.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return c.json({ error: 'Failed to update project' }, 500);
  }
});

// GET /api/projects/:projectId/locations
app.get('/api/projects/:projectId/locations', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json({ error: 'Invalid project ID format' }, 400);
    }
    
    // Provjeri da projekt pripada korisniku
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Dohvati lokacije
    const projectLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.projectId, projectId));
    
    return c.json(projectLocations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return c.json({ error: 'Failed to fetch locations' }, 500);
  }
});

// POST /api/projects/:projectId/locations
app.post('/api/projects/:projectId/locations', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json({ error: 'Invalid project ID format' }, 400);
    }
    
    // Parsiranje tijela zahtjeva
    const body = await c.req.json();
    const { name, description } = body;
    
    if (!name || name.trim() === '') {
      return c.json({ error: 'Name is required' }, 400);
    }
    
    // Provjeri da projekt pripada korisniku
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Stvori novu lokaciju
    const [newLocation] = await db
      .insert(locations)
      .values({
        name: name.trim(),
        description: description || null,
        projectId: projectId,
      })
      .returning();
    
    return c.json(newLocation, 201);
  } catch (error) {
    console.error('Error creating location:', error);
    return c.json({ error: 'Failed to create location' }, 500);
  }
});

// PUT /api/locations/:locationId
app.put('/api/locations/:locationId', async (c) => {
  try {
    const user = c.get('user');
    const locationId = c.req.param('locationId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(locationId)) {
      return c.json({ error: 'Invalid location ID format' }, 400);
    }
    
    // Parsiranje tijela zahtjeva
    const body = await c.req.json();
    const { name, description } = body;
    
    if (name !== undefined && (!name || name.trim() === '')) {
      return c.json({ error: 'Name cannot be empty' }, 400);
    }
    
    // Provjeri da lokacija postoji i pripada korisniku
    const [existingLocation] = await db
      .select({
        id: locations.id,
        projectId: locations.projectId,
        userId: projects.userId
      })
      .from(locations)
      .innerJoin(projects, eq(locations.projectId, projects.id))
      .where(and(eq(locations.id, locationId), eq(projects.userId, user.id)));
    
    if (!existingLocation) {
      return c.json({ error: 'Location not found' }, 404);
    }
    
    // Priprema podataka za ažuriranje
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    
    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'At least one field (name, description) must be provided' }, 400);
    }
    
    // Ažuriraj lokaciju
    const [updatedLocation] = await db
      .update(locations)
      .set(updateData)
      .where(eq(locations.id, locationId))
      .returning();
    
    return c.json(updatedLocation);
  } catch (error) {
    console.error('Error updating location:', error);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// DELETE /api/locations/:locationId
app.delete('/api/locations/:locationId', async (c) => {
  try {
    const user = c.get('user');
    const locationId = c.req.param('locationId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(locationId)) {
      return c.json({ error: 'Invalid location ID format' }, 400);
    }
    
    // Provjeri da lokacija postoji i pripada korisniku
    const [existingLocation] = await db
      .select({
        id: locations.id,
        projectId: locations.projectId,
        userId: projects.userId
      })
      .from(locations)
      .innerJoin(projects, eq(locations.projectId, projects.id))
      .where(and(eq(locations.id, locationId), eq(projects.userId, user.id)));
    
    if (!existingLocation) {
      return c.json({ error: 'Location not found' }, 404);
    }
    
    // Obriši lokaciju
    await db
      .delete(locations)
      .where(eq(locations.id, locationId));
    
    return c.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    return c.json({ error: 'Failed to delete location' }, 500);
  }
});

// ========== CHARACTERS API ==========

// GET /api/projects/:projectId/characters
app.get('/api/projects/:projectId/characters', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json({ error: 'Invalid project ID format' }, 400);
    }
    
    // Provjeri da projekt pripada korisniku
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Dohvati likove
    const projectCharacters = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId));
    
    return c.json(projectCharacters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    return c.json({ error: 'Failed to fetch characters' }, 500);
  }
});

// POST /api/projects/:projectId/characters
app.post('/api/projects/:projectId/characters', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json({ error: 'Invalid project ID format' }, 400);
    }
    
    // Parsiranje tijela zahtjeva
    const body = await c.req.json();
    const { name, role, motivation, goal, fear, backstory, arcStart, arcEnd } = body;
    
    if (!name || name.trim() === '') {
      return c.json({ error: 'Name is required' }, 400);
    }
    
    // Provjeri da projekt pripada korisniku
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Stvori novog lika
    const [newCharacter] = await db
      .insert(characters)
      .values({
        name: name.trim(),
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
    
    return c.json(newCharacter, 201);
  } catch (error) {
    console.error('Error creating character:', error);
    return c.json({ error: 'Failed to create character' }, 500);
  }
});

// PUT /api/characters/:characterId
app.put('/api/characters/:characterId', async (c) => {
  try {
    const user = c.get('user');
    const characterId = c.req.param('characterId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(characterId)) {
      return c.json({ error: 'Invalid character ID format' }, 400);
    }
    
    // Parsiranje tijela zahtjeva
    const body = await c.req.json();
    const { name, role, motivation, goal, fear, backstory, arcStart, arcEnd } = body;
    
    if (name !== undefined && (!name || name.trim() === '')) {
      return c.json({ error: 'Name cannot be empty' }, 400);
    }
    
    // Provjeri da lik postoji i pripada korisniku
    const [existingCharacter] = await db
      .select({
        id: characters.id,
        projectId: characters.projectId,
        userId: projects.userId
      })
      .from(characters)
      .innerJoin(projects, eq(characters.projectId, projects.id))
      .where(and(eq(characters.id, characterId), eq(projects.userId, user.id)));
    
    if (!existingCharacter) {
      return c.json({ error: 'Character not found' }, 404);
    }
    
    // Priprema podataka za ažuriranje
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (role !== undefined) updateData.role = role || null;
    if (motivation !== undefined) updateData.motivation = motivation || null;
    if (goal !== undefined) updateData.goal = goal || null;
    if (fear !== undefined) updateData.fear = fear || null;
    if (backstory !== undefined) updateData.backstory = backstory || null;
    if (arcStart !== undefined) updateData.arcStart = arcStart || null;
    if (arcEnd !== undefined) updateData.arcEnd = arcEnd || null;
    
    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'At least one field must be provided' }, 400);
    }
    
    // Ažuriraj lika
    const [updatedCharacter] = await db
      .update(characters)
      .set(updateData)
      .where(eq(characters.id, characterId))
      .returning();
    
    return c.json(updatedCharacter);
  } catch (error) {
    console.error('Error updating character:', error);
    return c.json({ error: 'Failed to update character' }, 500);
  }
});

// DELETE /api/characters/:characterId
app.delete('/api/characters/:characterId', async (c) => {
  try {
    const user = c.get('user');
    const characterId = c.req.param('characterId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(characterId)) {
      return c.json({ error: 'Invalid character ID format' }, 400);
    }
    
    // Provjeri da lik postoji i pripada korisniku
    const [existingCharacter] = await db
      .select({
        id: characters.id,
        projectId: characters.projectId,
        userId: projects.userId
      })
      .from(characters)
      .innerJoin(projects, eq(characters.projectId, projects.id))
      .where(and(eq(characters.id, characterId), eq(projects.userId, user.id)));
    
    if (!existingCharacter) {
      return c.json({ error: 'Character not found' }, 404);
    }
    
    // Obriši lika
    await db
      .delete(characters)
      .where(eq(characters.id, characterId));
    
    return c.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting character:', error);
    return c.json({ error: 'Failed to delete character' }, 500);
  }
});

// ========== SCENES API ==========

// GET /api/projects/:projectId/scenes
app.get('/api/projects/:projectId/scenes', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json({ error: 'Invalid project ID format' }, 400);
    }
    
    // Provjeri da projekt pripada korisniku
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Dohvati scene sortirane po redoslijed
    const projectScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(scenes.order);
    
    return c.json(projectScenes);
  } catch (error) {
    console.error('Error fetching scenes:', error);
    return c.json({ error: 'Failed to fetch scenes' }, 500);
  }
});

// POST /api/projects/:projectId/scenes
app.post('/api/projects/:projectId/scenes', async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json({ error: 'Invalid project ID format' }, 400);
    }
    
    // Parsiranje tijela zahtjeva
    const body = await c.req.json();
    const { title, summary, order, locationId } = body;
    
    if (!title || title.trim() === '') {
      return c.json({ error: 'Title is required' }, 400);
    }
    
    // Provjeri da projekt pripada korisniku
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Stvori novu scenu
    const [newScene] = await db
      .insert(scenes)
      .values({
        title: title.trim(),
        summary: summary || null,
        order: order || 0,
        locationId: locationId || null,
        projectId: projectId,
      })
      .returning();
    
    return c.json(newScene, 201);
  } catch (error) {
    console.error('Error creating scene:', error);
    return c.json({ error: 'Failed to create scene' }, 500);
  }
});

// PUT /api/scenes/:sceneId
app.put('/api/scenes/:sceneId', async (c) => {
  try {
    const user = c.get('user');
    const sceneId = c.req.param('sceneId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sceneId)) {
      return c.json({ error: 'Invalid scene ID format' }, 400);
    }
    
    // Parsiranje tijela zahtjeva
    const body = await c.req.json();
    const { title, summary, order, locationId } = body;
    
    if (title !== undefined && (!title || title.trim() === '')) {
      return c.json({ error: 'Title cannot be empty' }, 400);
    }
    
    // Provjeri da scena postoji i pripada korisniku
    const [existingScene] = await db
      .select({
        id: scenes.id,
        projectId: scenes.projectId,
        userId: projects.userId
      })
      .from(scenes)
      .innerJoin(projects, eq(scenes.projectId, projects.id))
      .where(and(eq(scenes.id, sceneId), eq(projects.userId, user.id)));
    
    if (!existingScene) {
      return c.json({ error: 'Scene not found' }, 404);
    }
    
    // Priprema podataka za ažuriranje
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (summary !== undefined) updateData.summary = summary || null;
    if (order !== undefined) updateData.order = order;
    if (locationId !== undefined) updateData.locationId = locationId || null;
    
    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'At least one field must be provided' }, 400);
    }
    
    // Ažuriraj scenu
    const [updatedScene] = await db
      .update(scenes)
      .set(updateData)
      .where(eq(scenes.id, sceneId))
      .returning();
    
    return c.json(updatedScene);
  } catch (error) {
    console.error('Error updating scene:', error);
    return c.json({ error: 'Failed to update scene' }, 500);
  }
});

// DELETE /api/scenes/:sceneId
app.delete('/api/scenes/:sceneId', async (c) => {
  try {
    const user = c.get('user');
    const sceneId = c.req.param('sceneId');
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);
    
    // Validacija UUID formata
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sceneId)) {
      return c.json({ error: 'Invalid scene ID format' }, 400);
    }
    
    // Provjeri da scena postoji i pripada korisniku
    const [existingScene] = await db
      .select({
        id: scenes.id,
        projectId: scenes.projectId,
        userId: projects.userId
      })
      .from(scenes)
      .innerJoin(projects, eq(scenes.projectId, projects.id))
      .where(and(eq(scenes.id, sceneId), eq(projects.userId, user.id)));
    
    if (!existingScene) {
      return c.json({ error: 'Scene not found' }, 404);
    }
    
    // Obriši scenu
    await db
      .delete(scenes)
      .where(eq(scenes.id, sceneId));
    
    return c.json({ message: 'Scene deleted successfully' });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return c.json({ error: 'Failed to delete scene' }, 500);
  }
});

export default app;

