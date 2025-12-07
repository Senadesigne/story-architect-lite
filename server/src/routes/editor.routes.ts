
import { Hono } from 'hono';
import { VertexAIService } from '../services/ai/VertexAIService';
import { getDatabase } from '../lib/db';
import { editorAnalyses } from '../schema/schema';
import { eq, desc } from 'drizzle-orm';

const editor = new Hono();
const vertexService = new VertexAIService();

// 1. Run Analysis
editor.post('/analyze', async (c) => {
    const { projectId, prompt, userId } = await c.req.json();

    if (!projectId || !prompt || !userId) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    try {
        const analysis = await vertexService.runAnalysis(projectId, userId, prompt);
        return c.json({ success: true, content: analysis });
    } catch (error: any) {
        console.error('Analysis failed:', error);
        return c.json({ error: error.message || 'Analysis failed' }, 500);
    }
});

// 2. Get Analysis History
editor.get('/history/:projectId', async (c) => {
    const projectId = c.req.param('projectId');
    const db = await getDatabase();

    try {
        const history = await db.query.editorAnalyses.findMany({
            where: eq(editorAnalyses.projectId, projectId),
            orderBy: [desc(editorAnalyses.createdAt)],
        });
        return c.json({ success: true, history });
    } catch (error: any) {
        console.error('Failed to fetch history:', error);
        return c.json({ error: 'Failed to fetch history' }, 500);
    }
});

// 3. Delete Analysis
editor.delete('/analysis/:id', async (c) => {
    const id = c.req.param('id');
    const db = await getDatabase();

    try {
        await db.delete(editorAnalyses).where(eq(editorAnalyses.id, id));
        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: 'Failed to delete analysis' }, 500);
    }
});

export { editor };
