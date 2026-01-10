import { Hono } from 'hono';
import { neon } from '@neondatabase/serverless';

const debugRouter = new Hono();

debugRouter.get('/debug-db', async (c) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sekundi limit

    try {
        const sql = neon(process.env.DATABASE_URL!, {
            fetchOptions: { signal: controller.signal }
        });

        console.log('🚀 Debug: Kucam na vrata Neona...');
        const result = await sql`SELECT NOW() as time, 'Vercel-Neon-Link-OK' as status`;

        clearTimeout(timeoutId);
        return c.json({ success: true, data: result[0] });

    } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('❌ Debug Error:', err.name, err.message);
        return c.json({
            success: false,
            error: err.name === 'AbortError' ? 'Timeout nakon 5s' : err.message
        }, 500);
    }
});

export default debugRouter;
