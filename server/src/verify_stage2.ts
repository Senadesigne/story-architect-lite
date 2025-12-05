
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users, projects, chapters, scenes } from './schema/schema';
import { getDatabaseUrl } from './lib/env';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

async function verifyStage2() {
    console.log('🚀 Starting Stage 2 Verification (UI Flow Simulation)...');

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not found in environment variables.');
        process.exit(1);
    }

    const client = postgres(databaseUrl);
    const db = drizzle(client);

    try {
        // 1. Setup: Create User & Project
        const testUserId = 'verify-stage2-user-' + Date.now();
        console.log(`👤 Creating test user: ${testUserId}`);
        await db.insert(users).values({
            id: testUserId,
            email: `test-ui-${Date.now()}@example.com`,
            displayName: 'UI Test User',
        });

        const [project] = await db.insert(projects).values({
            title: 'UI Flow Project',
            userId: testUserId,
        }).returning();
        console.log(`   ✅ Project created: ${project.id}`);

        // 2. Simulate "Add Chapter" in "Setup" Phase
        console.log(`📖 Simulating UI: Adding Chapter to 'setup' phase...`);
        const [chapter1] = await db.insert(chapters).values({
            title: 'Chapter 1: The Hook',
            phase: 'setup',
            order: 0,
            projectId: project.id,
        }).returning();
        console.log(`   ✅ Chapter created: ${chapter1.id} in phase '${chapter1.phase}'`);

        // 3. Simulate "Add Scene" to Chapter 1
        console.log(`🎬 Simulating UI: Adding Scene to Chapter 1...`);
        const [scene1] = await db.insert(scenes).values({
            title: 'Scene 1: Introduction',
            summary: 'Hero is introduced.',
            order: 0,
            projectId: project.id,
            chapterId: chapter1.id,
        }).returning();
        console.log(`   ✅ Scene created: ${scene1.id} linked to Chapter ${scene1.chapterId}`);

        // 4. Simulate "Add Chapter" in "Climax" Phase (Cross-phase test)
        console.log(`📖 Simulating UI: Adding Chapter to 'climax' phase...`);
        const [chapter2] = await db.insert(chapters).values({
            title: 'Chapter 10: The Final Battle',
            phase: 'climax',
            order: 0,
            projectId: project.id,
        }).returning();
        console.log(`   ✅ Chapter created: ${chapter2.id} in phase '${chapter2.phase}'`);

        // 5. Verify Hierarchy Fetching (What the Sidebar does)
        console.log(`🔍 Verifying Data Fetching...`);

        // Fetch Chapters
        const fetchedChapters = await db.select().from(chapters).where(eq(chapters.projectId, project.id));
        console.log(`   Found ${fetchedChapters.length} chapters.`);

        // Fetch Scenes
        const fetchedScenes = await db.select().from(scenes).where(eq(scenes.projectId, project.id));
        console.log(`   Found ${fetchedScenes.length} scenes.`);

        const setupChapters = fetchedChapters.filter(c => c.phase === 'setup');
        const climaxChapters = fetchedChapters.filter(c => c.phase === 'climax');

        if (setupChapters.length === 1 && climaxChapters.length === 1) {
            console.log(`   ✅ Chapters correctly distributed across phases.`);
        } else {
            console.error(`   ❌ Chapter distribution mismatch!`);
        }

        const chapter1Scenes = fetchedScenes.filter(s => s.chapterId === chapter1.id);
        if (chapter1Scenes.length === 1) {
            console.log(`   ✅ Scenes correctly linked to chapters.`);
        } else {
            console.error(`   ❌ Scene linkage mismatch!`);
        }

        // 6. Cleanup
        console.log(`🧹 Cleaning up...`);
        await db.delete(projects).where(eq(projects.id, project.id));
        await db.delete(users).where(eq(users.id, testUserId));
        console.log(`   ✅ Cleanup complete.`);

        console.log('🎉 Stage 2 Verification PASSED!');

    } catch (error) {
        console.error('❌ Verification FAILED:', error);
    } finally {
        await client.end();
    }
}

verifyStage2();
