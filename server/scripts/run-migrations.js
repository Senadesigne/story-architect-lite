#!/usr/bin/env node
/**
 * Script to run Drizzle migrations
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { getDatabaseUrl } from '../src/lib/env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const dbUrl = getDatabaseUrl() || 'postgresql://postgres:password@127.0.0.1:5432/postgres';
  
  console.log('🔄 Running database migrations...');
  console.log(`📊 Database URL: ${dbUrl.replace(/password@/, '***@')}`);
  
  const sql = postgres(dbUrl, { max: 1 });
  const db = drizzle(sql);
  
  try {
    await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
