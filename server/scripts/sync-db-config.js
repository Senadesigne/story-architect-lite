#!/usr/bin/env node
/**
 * Synchronizes database configuration from the running dev server
 * This ensures db:push and other database commands use the same ports
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT_LOCK_FILE = path.join(__dirname, '../../.volo-app-ports.json');
const ENV_FILE = path.join(__dirname, '../.env');
const ENV_BACKUP = path.join(__dirname, '../.env.backup');

/**
 * Get the current active ports from the lock file
 */
function getActivePorts() {
  if (!existsSync(PORT_LOCK_FILE)) {
    console.error('❌ No active dev server found. Please run "pnpm run dev" first.');
    process.exit(1);
  }

  try {
    const ports = JSON.parse(readFileSync(PORT_LOCK_FILE, 'utf-8'));
    return ports;
  } catch (error) {
    console.error('❌ Failed to read port configuration:', error.message);
    process.exit(1);
  }
}

/**
 * Update .env file with the active database port
 */
function updateEnvWithPort(port) {
  if (!existsSync(ENV_FILE)) {
    console.error('❌ No .env file found in server directory.');
    process.exit(1);
  }

  try {
    // Create backup
    const envContent = readFileSync(ENV_FILE, 'utf-8');
    writeFileSync(ENV_BACKUP, envContent);

    // Update DATABASE_URL with the active port
    const updatedContent = envContent.replace(
      /DATABASE_URL=postgresql:\/\/postgres:password@localhost:\d+\/postgres/,
      `DATABASE_URL=postgresql://postgres:password@localhost:${port}/postgres`
    );

    // Also replace 127.0.0.1 variant if present
    const finalContent = updatedContent.replace(
      /DATABASE_URL=postgresql:\/\/postgres:password@127\.0\.0\.1:\d+\/postgres/,
      `DATABASE_URL=postgresql://postgres:password@localhost:${port}/postgres`
    );

    writeFileSync(ENV_FILE, finalContent);
    console.log(`✅ Updated DATABASE_URL to use port ${port}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    return false;
  }
}

/**
 * Restore the original .env file
 */
function restoreEnv() {
  if (existsSync(ENV_BACKUP)) {
    try {
      const backupContent = readFileSync(ENV_BACKUP, 'utf-8');
      writeFileSync(ENV_FILE, backupContent);
      console.log('✅ Restored original .env file');
    } catch (error) {
      console.error('⚠️ Failed to restore .env file:', error.message);
    }
  }
}

// Main execution
const ports = getActivePorts();
console.log(`🔄 Synchronizing with active dev server on port ${ports.postgres}...`);

if (updateEnvWithPort(ports.postgres)) {
  console.log('📝 Configuration synchronized. You can now run database commands.');
  console.log('   The .env file will be restored automatically when the dev server stops.');
} else {
  process.exit(1);
}
