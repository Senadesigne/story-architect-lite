import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { getDatabase } from './lib/db';
import { getDatabaseUrl } from './lib/env';
import { projects } from './schema/schema';
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
    const { logline, premise, theme } = body;
    
    // Validacija da je barem jedno polje poslano
    if (logline === undefined && premise === undefined && theme === undefined) {
      return c.json({ error: 'At least one field (logline, premise, theme) must be provided' }, 400);
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
    
    if (logline !== undefined) updateData.logline = logline;
    if (premise !== undefined) updateData.premise = premise;
    if (theme !== undefined) updateData.theme = theme;
    
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

export default app;

