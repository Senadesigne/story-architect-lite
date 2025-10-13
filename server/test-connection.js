const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 Testing PostgreSQL connection...');
  
  const connectionString = 'postgresql://postgres:password@localhost:5502/postgres';
  console.log('   Connection string:', connectionString);
  
  const client = new Client({ connectionString });
  
  try {
    console.log('   Attempting to connect...');
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    const result = await client.query('SELECT NOW()');
    console.log('   Current time from DB:', result.rows[0].now);
    
    await client.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error details:', error);
  }
}

testConnection();
