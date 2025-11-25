
import { getDatabase, closeConnectionPool } from './src/lib/db';
import * as schema from './src/schema/schema';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fs from 'fs';

async function checkData() {
    console.log('🔍 Checking database content...');

    try {
        const db = await getDatabase();

        // Check Users
        const users = await db.select().from(schema.users);
        const projects = await db.select().from(schema.projects);

        const dump = {
            users: users.map(u => ({ id: u.id, email: u.email })),
            projects: projects.map(p => ({ id: p.id, title: p.title, ownerId: p.userId }))
        };

        fs.writeFileSync('db_dump.json', JSON.stringify(dump, null, 2));
        console.log('✅ Data dumped to db_dump.json');

    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        await closeConnectionPool();
        process.exit(0);
    }
}

checkData();
