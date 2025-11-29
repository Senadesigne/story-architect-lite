import { Hono } from 'hono';
import { getDatabase } from '../lib/db';
import { getDatabaseUrl } from '../lib/env';
import { chatSessions, chatMessages } from '../schema/schema';
import { eq, desc, and } from 'drizzle-orm';
import { requireValidUUID, handleDatabaseOperation, requireProjectOwnership } from '../middleware/errorHandler';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { z } from 'zod';

const sessions = new Hono();

// Schema for creating a session
const CreateSessionSchema = z.object({
    projectId: z.string().uuid(),
    name: z.string().min(1),
    mode: z.enum(['planner', 'studio']),
});

// GET /?projectId=...
sessions.get('/', async (c) => {
    const user = c.get('user');
    const projectId = c.req.query('projectId');

    if (!projectId) return c.json({ error: 'Project ID required' }, 400);
    requireValidUUID(projectId, 'project ID');

    const db = await getDatabase(getDatabaseUrl());
    await requireProjectOwnership(db, projectId, user.id);

    const result = await handleDatabaseOperation(async () => {
        return await db
            .select()
            .from(chatSessions)
            .where(and(
                eq(chatSessions.projectId, projectId),
                eq(chatSessions.userId, user.id) // Extra safety
            ))
            .orderBy(desc(chatSessions.updatedAt));
    });

    return c.json(result);
});

// POST /
sessions.post('/', validateBody(CreateSessionSchema), async (c) => {
    const user = c.get('user');
    const { projectId, name, mode } = getValidatedBody<z.infer<typeof CreateSessionSchema>>(c);

    const db = await getDatabase(getDatabaseUrl());
    await requireProjectOwnership(db, projectId, user.id);

    const newSession = await handleDatabaseOperation(async () => {
        const [result] = await db
            .insert(chatSessions)
            .values({
                userId: user.id,
                projectId,
                name,
                mode,
            })
            .returning();
        return result;
    });

    return c.json(newSession, 201);
});

// GET /:sessionId
sessions.get('/:sessionId', async (c) => {
    const user = c.get('user');
    const sessionId = c.req.param('sessionId');
    requireValidUUID(sessionId, 'session ID');

    const db = await getDatabase(getDatabaseUrl());

    // Verify ownership via session -> project -> user
    // Simplified: just check if session belongs to user (since userId is on session)
    const session = await handleDatabaseOperation(async () => {
        const [s] = await db
            .select()
            .from(chatSessions)
            .where(and(
                eq(chatSessions.id, sessionId),
                eq(chatSessions.userId, user.id)
            ));
        return s;
    });

    if (!session) return c.json({ error: 'Session not found' }, 404);

    const messages = await handleDatabaseOperation(async () => {
        return await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, sessionId))
            .orderBy(chatMessages.createdAt);
    });

    return c.json({ session, messages });
});

// DELETE /:sessionId
sessions.delete('/:sessionId', async (c) => {
    const user = c.get('user');
    const sessionId = c.req.param('sessionId');
    requireValidUUID(sessionId, 'session ID');

    const db = await getDatabase(getDatabaseUrl());

    await handleDatabaseOperation(async () => {
        await db
            .delete(chatSessions)
            .where(and(
                eq(chatSessions.id, sessionId),
                eq(chatSessions.userId, user.id)
            ));
    });

    return c.json({ message: 'Session deleted' });
});

export default sessions;
