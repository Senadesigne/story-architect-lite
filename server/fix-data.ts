
import { getDatabase, closeConnectionPool } from './src/lib/db';
import * as schema from './src/schema/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const OLD_UID = 'JEM7PWyIvrc4Tpv9xbLrvKpb9Aj2'; // test@test.com (Emulator)
const NEW_UID = 'VgXWFbNNpMSu5lZ6bTLtYvnInmI3'; // senad.dupljak@gmail.com (Production)

async function fixData() {
    console.log('🔧 Starting data migration...');
    console.log(`From: ${OLD_UID}`);
    console.log(`To:   ${NEW_UID}`);

    try {
        const db = await getDatabase();

        // Update projects
        const result = await db.update(schema.projects)
            .set({ userId: NEW_UID })
            .where(eq(schema.projects.userId, OLD_UID))
            .returning();

        console.log(`\n✅ Migrated ${result.length} projects.`);
        result.forEach(p => console.log(` - Moved "${p.title}" (${p.id})`));

    } catch (error) {
        console.error('❌ Error migrating data:', error);
    } finally {
        await closeConnectionPool();
        process.exit(0);
    }
}

fixData();
