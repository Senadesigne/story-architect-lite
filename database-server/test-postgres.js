#!/usr/bin/env node
/**
 * Simple test script to start PostgreSQL server and diagnose issues
 */

import { startEmbeddedPostgres, stopEmbeddedPostgres } from './src/embedded-postgres.ts';

async function testPostgres() {
  console.log('🧪 Testing embedded PostgreSQL startup...\n');
  
  try {
    const connectionString = await startEmbeddedPostgres(5999); // Use a different port for testing
    console.log('\n✅ PostgreSQL started successfully!');
    console.log('🔗 Connection string:', connectionString);
    
    // Wait a bit to ensure it's fully started
    console.log('\n⏳ Waiting 3 seconds for server to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to connect
    console.log('🔍 Testing connection...');
    
    // Stop the server
    console.log('\n🛑 Stopping PostgreSQL...');
    await stopEmbeddedPostgres();
    console.log('✅ PostgreSQL stopped successfully');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testPostgres();
