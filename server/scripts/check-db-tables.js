#!/usr/bin/env node
/**
 * Check what tables exist in the database
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT_LOCK_FILE = path.join(__dirname, '../../.volo-app-ports.json');

function getActivePort() {
  if (!existsSync(PORT_LOCK_FILE)) {
    return null;
  }
  
  try {
    const ports = JSON.parse(readFileSync(PORT_LOCK_FILE, 'utf-8'));
    return ports.postgres;
  } catch (error) {
    return null;
  }
}

async function checkTables() {
  const port = getActivePort() || 5432;
  const connectionString = `postgresql://postgres:password@127.0.0.1:${port}/postgres`;
  
  console.log(`🔍 Checking database tables on port ${port}...\n`);
  
  try {
    // Dynamically import pg
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    
    await client.connect();
    
    // Check for tables in public schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables in public schema:');
    if (tablesResult.rows.length === 0) {
      console.log('   (No tables found - database is empty)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
    }
    
    // Check for drizzle schema
    const drizzleSchemaResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'drizzle';
    `);
    
    if (drizzleSchemaResult.rows.length > 0) {
      console.log('\n📦 Drizzle schema exists');
      
      // Check tables in drizzle schema
      const drizzleTablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        ORDER BY table_name;
      `);
      
      console.log('📋 Tables in drizzle schema:');
      if (drizzleTablesResult.rows.length === 0) {
        console.log('   (No tables found)');
      } else {
        drizzleTablesResult.rows.forEach(row => {
          console.log(`   • ${row.table_name}`);
        });
      }
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  }
}

checkTables().catch(console.error);
