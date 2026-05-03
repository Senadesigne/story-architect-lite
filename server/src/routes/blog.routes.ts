import { Hono } from 'hono';
import { validateBody, getValidatedBody } from '../middleware/validation.js';
import {
  requireValidUUID,
  handleDatabaseOperation,
  NotFoundError,
} from '../middleware/errorHandler.js';
import { getDatabase } from '../lib/db.js';
import { getDatabaseUrl } from '../lib/env.js';
import { blogArticles, blogResearchDossiers } from '../schema/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import {
  CreateBlogArticleBodySchema,
  UpdateBlogArticleBodySchema,
} from '../schemas/validation.js';
import type {
  CreateBlogArticleBody,
  UpdateBlogArticleBody,
} from '../schemas/validation.js';
import type { DatabaseUpdateData } from '../types/api.js';
import { runBlogPipeline } from '../services/ai/blog/blog.graph.js';

export const blogRouter = new Hono();

blogRouter.get('/blog', async (c) => {
  const user = c.get('user');

  try {
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const articles = await handleDatabaseOperation(async () => {
      return await db
        .select({
          id: blogArticles.id,
          title: blogArticles.title,
          topic: blogArticles.topic,
          audience: blogArticles.audience,
          status: blogArticles.status,
          createdAt: blogArticles.createdAt,
          updatedAt: blogArticles.updatedAt,
        })
        .from(blogArticles)
        .where(eq(blogArticles.userId, user.id))
        .orderBy(desc(blogArticles.createdAt));
    });

    return c.json(articles || []);
  } catch (error) {
    console.error('[GET /api/blog] Error fetching articles:', error);
    return c.json([], 200);
  }
});

blogRouter.post('/blog', validateBody(CreateBlogArticleBodySchema), async (c) => {
  const user = c.get('user');
  const { title, topic, audience } = getValidatedBody<CreateBlogArticleBody>(c);

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const newArticle = await handleDatabaseOperation(async () => {
    const [result] = await db
      .insert(blogArticles)
      .values({
        userId: user.id,
        title,
        topic,
        audience,
        status: 'draft',
      })
      .returning();

    return result;
  });

  return c.json(newArticle, 201);
});

blogRouter.get('/blog/:id', async (c) => {
  const user = c.get('user');
  const articleId = c.req.param('id');

  requireValidUUID(articleId, 'article ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const [article] = await db
    .select()
    .from(blogArticles)
    .where(and(eq(blogArticles.id, articleId), eq(blogArticles.userId, user.id)))
    .limit(1);

  if (!article) {
    throw new NotFoundError('Blog article not found');
  }

  const dossiers = await handleDatabaseOperation(async () => {
    return await db
      .select()
      .from(blogResearchDossiers)
      .where(eq(blogResearchDossiers.articleId, articleId));
  });

  return c.json({ ...article, dossiers });
});

blogRouter.patch('/blog/:id', validateBody(UpdateBlogArticleBodySchema), async (c) => {
  const user = c.get('user');
  const articleId = c.req.param('id');

  requireValidUUID(articleId, 'article ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const { title, topic, audience, content, metaTitle, metaDescription, status } =
    getValidatedBody<UpdateBlogArticleBody>(c);

  const updateData: DatabaseUpdateData = { updatedAt: new Date() };
  if (title !== undefined) updateData.title = title;
  if (topic !== undefined) updateData.topic = topic;
  if (audience !== undefined) updateData.audience = audience;
  if (content !== undefined) updateData.content = content;
  if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
  if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
  if (status !== undefined) updateData.status = status;

  const updatedArticle = await handleDatabaseOperation(async () => {
    const [result] = await db
      .update(blogArticles)
      .set(updateData)
      .where(and(eq(blogArticles.id, articleId), eq(blogArticles.userId, user.id)))
      .returning();

    return result;
  });

  if (!updatedArticle) {
    throw new NotFoundError('Blog article not found');
  }

  return c.json(updatedArticle);
});

blogRouter.post('/blog/:id/plan', async (c) => {
  const user = c.get('user');
  const articleId = c.req.param('id');

  requireValidUUID(articleId, 'article ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const [article] = await db
    .select()
    .from(blogArticles)
    .where(and(eq(blogArticles.id, articleId), eq(blogArticles.userId, user.id)))
    .limit(1);

  if (!article) {
    throw new NotFoundError('Blog article not found');
  }

  if (article.status !== 'draft') {
    return c.json({ error: 'Planning is only allowed for articles with draft status' }, 400);
  }

  const pipelineResult = await runBlogPipeline({
    articleId,
    topic: article.topic,
    audience: article.audience ?? '',
  });

  const newStatus = pipelineResult.currentPhase === 'failed' ? 'failed' : 'planning';

  const updatedArticle = await handleDatabaseOperation(async () => {
    const [row] = await db
      .update(blogArticles)
      .set({
        status: newStatus,
        researchPlan: pipelineResult.researchPlan ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(blogArticles.id, articleId))
      .returning();
    return row;
  });

  return c.json(updatedArticle);
});

blogRouter.delete('/blog/:id', async (c) => {
  const user = c.get('user');
  const articleId = c.req.param('id');

  requireValidUUID(articleId, 'article ID');

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const [exists] = await db
    .select({ id: blogArticles.id })
    .from(blogArticles)
    .where(and(eq(blogArticles.id, articleId), eq(blogArticles.userId, user.id)))
    .limit(1);

  if (!exists) {
    throw new NotFoundError('Blog article not found');
  }

  await handleDatabaseOperation(async () => {
    await db
      .delete(blogArticles)
      .where(eq(blogArticles.id, articleId));
  });

  return c.json({ success: true });
});
