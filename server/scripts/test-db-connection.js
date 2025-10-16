#!/usr/bin/env node
/**
 * Test database connection to help diagnose connection issues
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import { execSync } from 'child_process';

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

async function testTcpConnection(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
    
    socket.on('error', (err) => {
      reject(err);
    });
    
    socket.connect(port, host);
  });
}

async function testDatabaseConnection(connectionString) {
  try {
    // Dynamically import pg after ensuring it's installed
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    
    await client.connect();
    const result = await client.query('SELECT NOW()');
    await client.end();
    return { success: true, time: result.rows[0].now };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🔍 Database Connection Diagnostics\n');
  
  const port = getActivePort();
  
  if (!port) {
    console.log('❌ No active dev server found (.volo-app-ports.json missing)');
    console.log('   Run "pnpm run dev" in another terminal first');
    return;
  }
  
  console.log(`📍 Active PostgreSQL port: ${port}\n`);
  
  // Test 1: TCP connection to localhost
  console.log('1️⃣ Testing TCP connection to localhost:' + port);
  try {
    await testTcpConnection('localhost', port);
    console.log('   ✅ TCP connection successful\n');
  } catch (error) {
    console.log(`   ❌ TCP connection failed: ${error.message}\n`);
  }
  
  // Test 2: TCP connection to 127.0.0.1
  console.log('2️⃣ Testing TCP connection to 127.0.0.1:' + port);
  try {
    await testTcpConnection('127.0.0.1', port);
    console.log('   ✅ TCP connection successful\n');
  } catch (error) {
    console.log(`   ❌ TCP connection failed: ${error.message}\n`);
  }
  
  // Test 3: PostgreSQL connection with localhost
  console.log('3️⃣ Testing PostgreSQL connection with localhost');
  const localhostUrl = `postgresql://postgres:password@localhost:${port}/postgres`;
  const localhostResult = await testDatabaseConnection(localhostUrl);
  if (localhostResult.success) {
    console.log(`   ✅ Connection successful: ${localhostResult.time}\n`);
  } else {
    console.log(`   ❌ Connection failed: ${localhostResult.error}\n`);
  }
  
  // Test 4: PostgreSQL connection with 127.0.0.1
  console.log('4️⃣ Testing PostgreSQL connection with 127.0.0.1');
  const ipv4Url = `postgresql://postgres:password@127.0.0.1:${port}/postgres`;
  const ipv4Result = await testDatabaseConnection(ipv4Url);
  if (ipv4Result.success) {
    console.log(`   ✅ Connection successful: ${ipv4Result.time}\n`);
  } else {
    console.log(`   ❌ Connection failed: ${ipv4Result.error}\n`);
  }
  
  // Summary
  console.log('📊 Summary:');
  if (ipv4Result.success) {
    console.log('   ✅ Database is accessible via 127.0.0.1 (IPv4)');
    console.log('   🔧 Use this connection string in your configuration:');
    console.log(`      postgresql://postgres:password@127.0.0.1:${port}/postgres`);
  } else {
    console.log('   ❌ Database is not accessible');
    console.log('   🔧 Possible solutions:');
    console.log('      1. Check if PostgreSQL is actually running');
    console.log('      2. Check Windows Firewall settings');
    console.log('      3. Run the firewall setup script as Administrator');
  }
}

// Install pg package if not available and run tests
async function main() {
  try {
    await import('pg');
  } catch (error) {
    console.log('📦 Installing pg package for testing...');
    try {
      execSync('pnpm add -D pg', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      console.log('✅ pg package installed successfully\n');
    } catch (installError) {
      console.error('❌ Failed to install pg package:', installError.message);
      console.log('💡 Please run: pnpm add -D pg');
      return;
    }
  }
  
  await runTests();
}

main().catch(console.error);
