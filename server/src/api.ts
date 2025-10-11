import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { getDatabase } from './lib/db';
import { getDatabaseUrl } from './lib/env';
import { projects } from './schema/schema';
import { eq } from 'drizzle-orm';

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

export default app;

