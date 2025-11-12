import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Učitaj environment varijable
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// The lock file is in the project root
const PORT_LOCK_FILE = path.join(__dirname, '../../.volo-app-ports.json');

/**
 * Check if dev server is running and get its configuration
 */
function getDevServerConfig() {
  if (!existsSync(PORT_LOCK_FILE)) {
    return null;
  }

  try {
    const ports = JSON.parse(readFileSync(PORT_LOCK_FILE, 'utf-8'));
    return ports;
  } catch (error) {
    return null;
  }
}

async function setupPgVector() {
  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    process.exit(1);
  }

  // Check if dev server is running and override port if needed
  const devConfig = getDevServerConfig();
  if (devConfig && devConfig.postgres) {
    // Extract database name from existing URL
    const urlMatch = connectionString.match(/\/([^/?]+)(\?|$)/);
    const dbName = urlMatch && urlMatch[1] ? urlMatch[1] : 'postgres';
    
    // Override with dev server port
    connectionString = `postgresql://postgres:password@127.0.0.1:${devConfig.postgres}/${dbName}`;
    console.log(`🔄 Using active dev server database on 127.0.0.1:${devConfig.postgres}`);
    console.log(`📊 DATABASE_URL: ${connectionString.replace(/password@/, '***@')}`);
  }

  console.log('🔧 Connecting to database...');
  
  const sql = postgres(connectionString);
  const db = drizzle(sql);

  try {
    console.log('🔄 Ensuring pgvector is properly set up...');

    // 1. Prvo obriši staru ekstenziju (ako postoji)
    await sql`DROP EXTENSION IF EXISTS vector CASCADE`;
    console.log('🗑️  Dropped existing vector extension (if any)');

    // 2. Eksplicitno postavi search_path za trenutnu sesiju
    await sql`SET search_path TO public, "$user"`;
    console.log('✅ Set session search_path to include public');

    // 3. Kreiraj ekstenziju u public schemi
    await sql`CREATE EXTENSION vector WITH SCHEMA public`;
    console.log('✅ pgvector extension created in public schema');

    // 4. KRITIČNO: Postavi search_path za cijelu bazu i sve buduće konekcije
    await sql`ALTER DATABASE story_architect_lite_db SET search_path TO public, "$user"`;
    console.log('✅ Set default search_path for database "story_architect_lite_db"');

    // 5. Forsiraj da se promjena primijeni ODMAH za sve role
    await sql`ALTER ROLE postgres SET search_path TO public, "$user"`;
    console.log('✅ Set search_path for postgres role');

    // 6. Verificiraj da vector tip postoji
    const vectorCheck = await sql`
      SELECT 
        n.nspname as schema,
        t.typname as type,
        current_setting('search_path') as current_path
      FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'vector'
    `;

    if (vectorCheck.length > 0) {
      console.log('✅ Vector type verification:');
      console.log(`   Schema: ${vectorCheck[0].schema}`);
      console.log(`   Type: ${vectorCheck[0].type}`);
      console.log(`   Current search_path: ${vectorCheck[0].current_path}`);
    } else {
      throw new Error('Vector type not found after installation!');
    }

    // 7. Dodatna provjera - može li se kreirati vector kolona?
    await sql`
      CREATE TEMP TABLE test_vector (
        id serial PRIMARY KEY,
        embedding vector(3)
      )
    `;
    await sql`DROP TABLE test_vector`;
    console.log('✅ Successfully created test vector column');

  } catch (error: any) {
    console.error('❌ Error during pgvector setup:', error);
    if (error.code !== '42710') { // 42710 = duplicate_object
      process.exit(1);
    }
  } finally {
    await sql.end();
    console.log('🔒 Database connection closed');
  }
}

// Pokreni setup
setupPgVector().then(() => {
  console.log('✨ pgvector setup completed!');
  console.log('📝 Next step: Run Drizzle migrations to create the embeddings table');
}).catch((error) => {
  console.error('Failed to setup pgvector:', error);
  process.exit(1);
});
