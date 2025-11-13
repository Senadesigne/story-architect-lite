#!/usr/bin/env node
/**
 * Wrapper for drizzle-kit commands that ensures proper database configuration
 * Automatically syncs with the running dev server's port configuration
 * 
 * CRITICAL: This script MUST set DATABASE_URL before ANY module imports
 * that might use it, otherwise Node.js will cache the wrong value.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Učitaj environment varijable iz .env datoteke
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// The lock file is in the project root, two levels up from server/scripts
const PORT_LOCK_FILE = path.join(__dirname, '../../.volo-app-ports.json');
// The server root is one level up from server/scripts
const SERVER_ROOT = path.resolve(__dirname, '..');

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

// CRITICAL: Set DATABASE_URL IMMEDIATELY before any imports
const devConfig = getDevServerConfig();
if (devConfig && devConfig.postgres) {
  // Check if there's an existing DATABASE_URL to get the database name
  const existingDbUrl = process.env.DATABASE_URL;
  let dbName = 'postgres'; // default fallback
  
  if (existingDbUrl) {
    // Extract database name from existing URL
    const urlMatch = existingDbUrl.match(/\/([^/?]+)(\?|$)/);
    if (urlMatch && urlMatch[1]) {
      dbName = urlMatch[1];
    }
  }
  
  // Override DATABASE_URL with the active dev server port and correct database name
  // CRITICAL: Always use 127.0.0.1 instead of localhost to avoid Windows IPv6/IPv4 issues
  const dbUrl = `postgresql://postgres:password@127.0.0.1:${devConfig.postgres}/${dbName}`;
  process.env.DATABASE_URL = dbUrl;
  console.log(`🔄 Using active dev server database on 127.0.0.1:${devConfig.postgres}`);
  console.log(`📊 DATABASE_URL set to: ${dbUrl.replace(/password@/, '***@')}`);
} else {
  console.log('ℹ️  No active dev server found, using default configuration');
  if (process.env.DATABASE_URL) {
    console.log(`📊 Using existing DATABASE_URL: ${process.env.DATABASE_URL.replace(/password@/, '***@')}`);
  }
}

// Now we can import spawn - AFTER setting DATABASE_URL
import { spawn } from 'child_process';

/**
 * Run drizzle-kit command with proper environment
 */
function runDrizzleCommand() {
  const args = process.argv.slice(2);
  
  // Prepare environment variables - they're already set in process.env
  const env = { ...process.env };
  
  // Explicitly tell drizzle-kit where to find its config
  const drizzleArgs = [
    'drizzle-kit', 
    ...args, 
    '--config=drizzle.config.ts'
  ];
  
  console.log(`🔧 Running: pnpm ${drizzleArgs.join(' ')}`);
  console.log(`📁 Working directory: ${SERVER_ROOT}`);
  
  // Run drizzle-kit with the modified environment
  const child = spawn('pnpm', drizzleArgs, {
    env,
    stdio: 'inherit',
    shell: true,
    cwd: SERVER_ROOT 
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to run drizzle-kit:', error.message);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

// Main execution
console.log('🚀 Drizzle Kit Wrapper v1.1\n');
runDrizzleCommand();