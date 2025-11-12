import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { readFileSync, existsSync } from 'fs';

// --- Početak .env logike (kopirano iz setup-pgvector.ts) ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
}

console.log(`📊 DATABASE_URL: ${connectionString.replace(/password@/, '***@')}`);

// --- Kraj .env logike ---

async function checkMigrationState() {
  let client;
  let db;
  
  try {
    client = postgres(connectionString);
    db = drizzle(client);

    console.log('🔧 Connecting to database to check migration state...');

    // Pokušaj pročitati tablicu
    const result = await client`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at`;

    console.log('✅ Drizzle Migration State:');
    console.log('📋 Found migrations in drizzle.__drizzle_migrations table:');
    console.table(result);
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total migrations: ${result.length}`);
    
    if (result.length > 0) {
      console.log(`   Latest migration: ${result[result.length - 1].hash}`);
      console.log(`   Created at: ${result[result.length - 1].created_at}`);
    }

  } catch (error: any) {
    if (error.code === '42P01') { // 42P01 = undefined_table
      console.log('✅ Drizzle migration table (drizzle.__drizzle_migrations) does not exist. Baza je čista.');
    } else {
      console.error('❌ Error checking migration state:', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
    }
  } finally {
    if (client) {
      await client.end();
      console.log('🔒 Database connection closed');
    }
  }
}

checkMigrationState();
