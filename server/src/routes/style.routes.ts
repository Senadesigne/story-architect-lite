import { Hono } from 'hono';
import { handleDatabaseOperation } from '../middleware/errorHandler.js';
import { getDatabase } from '../lib/db.js';
import { getDatabaseUrl } from '../lib/env.js';
import { userWritingSamples, userStyleFingerprints } from '../schema/schema.js';
import { eq, desc } from 'drizzle-orm';

export const styleRouter = new Hono();

// GET /api/users/writing-samples — lista samplea (bez teksta, samo meta)
styleRouter.get('/users/writing-samples', async (c) => {
  const user = c.get('user');
  const db = await getDatabase(getDatabaseUrl());

  const samples = await handleDatabaseOperation(async () =>
    db.query.userWritingSamples.findMany({
      where: eq(userWritingSamples.userId, user.id),
      orderBy: [desc(userWritingSamples.createdAt)],
      columns: { id: true, wordCount: true, createdAt: true },
    })
  );

  return c.json(samples);
});

// POST /api/users/writing-samples — upload jednog samplea
styleRouter.post('/users/writing-samples', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const { text } = body as { text?: string };

  if (!text || typeof text !== 'string') {
    return c.json({ error: 'Polje "text" je obavezno' }, 400);
  }
  if (text.trim().length < 100) {
    return c.json({ error: 'Sample mora imati minimalno 100 znakova' }, 400);
  }
  if (text.length > 5000) {
    return c.json({ error: 'Sample može imati maksimalno 5000 znakova' }, 400);
  }

  const db = await getDatabase(getDatabaseUrl());
  const wordCount = text.trim().split(/\s+/).length;

  const [inserted] = await handleDatabaseOperation(async () =>
    db.insert(userWritingSamples)
      .values({ userId: user.id, text: text.trim(), wordCount })
      .returning()
  );

  return c.json({ id: inserted.id, wordCount: inserted.wordCount, createdAt: inserted.createdAt }, 201);
});

// DELETE /api/users/writing-samples/:id — brisanje samplea
styleRouter.delete('/users/writing-samples/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = await getDatabase(getDatabaseUrl());

  const existing = await db.query.userWritingSamples.findFirst({
    where: eq(userWritingSamples.id, id),
    columns: { userId: true },
  });

  if (!existing || existing.userId !== user.id) {
    return c.json({ error: 'Sample nije pronađen' }, 404);
  }

  await handleDatabaseOperation(async () =>
    db.delete(userWritingSamples).where(eq(userWritingSamples.id, id))
  );

  return c.json({ status: 'deleted' });
});

// GET /api/users/style-fingerprint — dohvati fingerprint (ili null)
styleRouter.get('/users/style-fingerprint', async (c) => {
  const user = c.get('user');
  const db = await getDatabase(getDatabaseUrl());

  const fingerprint = await handleDatabaseOperation(async () =>
    db.query.userStyleFingerprints.findFirst({
      where: eq(userStyleFingerprints.userId, user.id),
    })
  );

  return c.json(fingerprint ?? null);
});

// POST /api/users/style-fingerprint/analyze — stub (implementira se u Koraku 7 kad je HPE #1 dostupan)
styleRouter.post('/users/style-fingerprint/analyze', async (c) => {
  return c.json(
    { error: 'Analiza stila zahtijeva HPE #1 server (Ollama/Qwen). Implementirano u Koraku 7.' },
    503
  );
});
