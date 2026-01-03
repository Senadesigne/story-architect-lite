
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set');
        process.exit(1);
    }

    console.log('🔌 Connecting to database...');

    // Use pg Pool for migrations (works with Neon/Postgres)
    const pool = new Pool({
        connectionString,
        // Add SSL for production (Neon requires it)
        ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
            ? false
            : { rejectUnauthorized: false }
    });

    const db = drizzle(pool);

    try {
        console.log('🚀 Running migrations...');

        // Path to migration folder
        const migrationsFolder = path.join(__dirname, '../drizzle');

        await migrate(db, { migrationsFolder });

        console.log('✅ Migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runMigration();
