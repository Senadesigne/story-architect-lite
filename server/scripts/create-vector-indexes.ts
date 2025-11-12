import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync } from 'fs';

// Definiraj __dirname za ES Module
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

async function createVectorIndexes() {
  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is not set!");
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

  console.log('🔧 Connecting to database to create vector indexes...');
  const db = postgres(connectionString);
  
  try {
    console.log('📦 Creating IVFFLAT index for vector cosine operations...');
    // Kreiranje IVFFLAT indeksa za cosine distance
    await db`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_story_architect_embeddings_vector_cosine 
      ON story_architect_embeddings 
      USING ivfflat (vector vector_cosine_ops) 
      WITH (lists = 100)
    `;
    
    console.log('📦 Creating JSON index for metadata projectId filtering...');
    // Kreiranje indeksa za JSON metadata polje (Drizzle ne može ovo generirati ispravno)
    await db`
      CREATE INDEX IF NOT EXISTS idx_embeddings_metadata_project_id 
      ON story_architect_embeddings 
      USING btree ((metadata->>'projectId'))
    `;
    
    console.log('✅ All indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating vector indexes:', error);
  } finally {
    await db.end();
    console.log('🔒 Database connection closed');
  }
}

createVectorIndexes();
