
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users, projects, chapters, scenes } from './schema/schema';
import { getDatabaseUrl } from './lib/env';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

async function verifyStage1() {
    console.log('🚀 Starting Stage 1 Verification...');

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not found in environment variables.');
        process.exit(1);
    }

    console.log(`🔌 Connecting to database...`);

    const client = postgres(databaseUrl);
    const db = drizzle(client);

    try {
        // 1. Create Test User
        const testUserId = 'verify-stage1-user-' + Date.now();
        console.log(`👤 Creating test user: ${testUserId}`);
        await db.insert(users).values({
            id: testUserId,
            email: `test-${Date.now()}@example.com`,
            displayName: 'Test User',
        });

        // 2. Create Test Project
        console.log(`📁 Creating test project...`);
        const [project] = await db.insert(projects).values({
            title: 'Verification Project',
            userId: testUserId,
        }).returning();
        console.log(`   ✅ Project created: ${project.id}`);

        // 3. Create Chapter
        console.log(`📖 Creating chapter...`);
        const [chapter] = await db.insert(chapters).values({
            title: 'Chapter 1: The Beginning',
            phase: 'setup',
            order: 1,
            projectId: project.id,
        }).returning();
        console.log(`   ✅ Chapter created: ${chapter.id} (Title: ${chapter.title})`);

        // 4. Create Scene linked to Chapter
        console.log(`🎬 Creating scene linked to chapter...`);
        const [scene] = await db.insert(scenes).values({
            title: 'Scene 1',
            summary: 'Intro scene',
            order: 1,
            projectId: project.id,
            chapterId: chapter.id,
        }).returning();
        console.log(`   ✅ Scene created: ${scene.id} (ChapterID: ${scene.chapterId})`);

        // 5. Verify Relations
        console.log(`🔍 Verifying relations...`);
        const fetchedScene = await db.select().from(scenes).where(eq(scenes.id, scene.id));

        if (fetchedScene[0].chapterId === chapter.id) {
            console.log(`   ✅ Scene is correctly linked to Chapter ${chapter.id}`);
        } else {
            console.error(`   ❌ Scene linkage failed! Expected ${chapter.id}, got ${fetchedScene[0].chapterId}`);
        }

        // 6. Cleanup
        console.log(`🧹 Cleaning up test data...`);
        await db.delete(projects).where(eq(projects.id, project.id));
        await db.delete(users).where(eq(users.id, testUserId));
        console.log(`   ✅ Cleanup complete.`);

        console.log('🎉 Stage 1 Verification PASSED!');

    } catch (error) {
        console.error('❌ Verification FAILED:', error);
    } finally {
        await client.end();
    }
}

verifyStage1();
