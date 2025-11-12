#!/usr/bin/env node

/**
 * Script to run Drizzle migrations MANUALLY
 * Bypasses the Drizzle migrator which ignores search_path
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readdirSync, readFileSync, existsSync } from 'fs';
import postgres from 'postgres';
import { getDatabaseUrl } from '../src/lib/env';

// Definiraj __dirname za ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Učitaj environment varijable
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// The lock file is in the project root
const PORT_LOCK_FILE = path.join(__dirname, '../../.volo-app-ports.json');
const MIGRATIONS_FOLDER = path.join(__dirname, '../drizzle');

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

async function runManualMigrations() {
  let connectionString = getDatabaseUrl();
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    process.exit(1);
  }

  // Check if dev server is running and override port if needed
  const devConfig = getDevServerConfig();
  if (devConfig && devConfig.postgres) {
    const urlMatch = connectionString.match(/\/([^/?]+)(\?|$)/);
    const dbName = urlMatch && urlMatch[1] ? urlMatch[1] : 'postgres';
    
    // Override with dev server port AND force search_path
    connectionString = `postgresql://postgres:password@127.0.0.1:${devConfig.postgres}/${dbName}?options=--search_path%3Dpublic`;
    console.log(`🔄 Using active dev server database on 127.0.0.1:${devConfig.postgres}`);
  }
  
  console.log('🔄 Running database migrations MANUALLY...');
  console.log(`📊 Database URL: ${connectionString.replace(/password@/, '***@')}`);
  
  const sql = postgres(connectionString, { max: 1 });

  try {
    // 1. Ensure drizzle migrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `;
    console.log('✅ "__drizzle_migrations" table ensured');

    // 2. Get completed migrations from DB
    const completedMigrations = await sql`SELECT hash FROM "__drizzle_migrations"`;
    const completedHashes = new Set(completedMigrations.map(m => m.hash));
    console.log(`📈 Found ${completedHashes.size} completed migrations in DB`);

    // 3. Get pending migrations from folder
    const migrationFiles = readdirSync(MIGRATIONS_FOLDER)
      .filter(file => file.endsWith('.sql'))
      .sort();
      
    if (migrationFiles.length === 0) {
      console.log('✅ No migration files found. Database is up to date.');
      await sql.end();
      return;
    }

    console.log(`📂 Found ${migrationFiles.length} migration files in folder`);

    let migrationsRun = 0;
    
    // 4. Run pending migrations
    for (const file of migrationFiles) {
      const hash = file.split('_')[1].replace('.sql', ''); // e.g., 0000_hash.sql -> hash
      
      if (completedHashes.has(hash)) {
        continue; // Skip this migration
      }

      console.log(`🚀 Applying migration: ${file}...`);
      
      // Manually set search_path for this session just in case
      await sql`SET search_path TO public`;
      
      const filePath = path.join(MIGRATIONS_FOLDER, file);
      
      // Use sql.file to execute the migration
      await sql.file(filePath);

      // 5. Log migration to DB
      await sql`INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (${hash}, ${Math.floor(Date.now() / 1000)})`;
      
      console.log(`✅ Successfully applied and logged ${file}`);
      migrationsRun++;
    }

    if (migrationsRun === 0) {
      console.log('✅ Database is already up to date.');
    } else {
      console.log(`✨ All ${migrationsRun} new migrations completed successfully!`);
    }
    
  } catch (error) {
    console.error('❌ Manual migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runManualMigrations();