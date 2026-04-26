import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth.js';
import { performanceMonitor } from './middleware/performance.js';
import { requestTimeout } from './middleware/timeout.js';
import { errorHandler } from './middleware/errorHandler.js';
import sessions from './routes/sessions.js';
import debugRouter from './routes/debug.js';
import { editor } from './routes/editor.routes.js';
import { userRouter } from './routes/user.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { locationsRouter } from './routes/locations.routes.js';
import { charactersRouter } from './routes/characters.routes.js';
import { chaptersRouter } from './routes/chapters.routes.js';
import { scenesRouter } from './routes/scenes.routes.js';
import { aiRouter } from './routes/ai.routes.js';

const app = new Hono();

app.use('*', requestTimeout());
app.use('*', performanceMonitor());
app.use('*', cors());

app.onError(errorHandler);

app.get('/', (c) => c.json({ message: 'API is running' }));

app.use('/api/*', authMiddleware);

app.route('/api/sessions', sessions);
app.route('/', debugRouter);
app.route('/api/editor', editor);
app.route('/api', userRouter);
app.route('/api', projectsRouter);
app.route('/api', locationsRouter);
app.route('/api', charactersRouter);
app.route('/api', chaptersRouter);
app.route('/api', scenesRouter);
app.route('/api', aiRouter);

export default app;
