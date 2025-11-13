import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// ES module kompatibilnost
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Učitaj environment varijable
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface ValidationResult {
  success: boolean;
  message: string;
  details?: string;
}

async function validateDatabaseConfig(): Promise<ValidationResult> {
  console.log('🔍 Validating database configuration...\n');

  // 1. Provjeri postojanje DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      success: false,
      message: '❌ DATABASE_URL environment variable is not set!',
      details: 'Please add DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/story_architect_lite_db to your .env file'
    };
  }

  console.log(`✅ DATABASE_URL found: ${databaseUrl.replace(/:([^:@]+)@/, ':***@')}`);

  // 2. Provjeri format URL-a
  try {
    const url = new URL(databaseUrl);
    console.log(`📍 Host: ${url.hostname}`);
    console.log(`🔌 Port: ${url.port || '5432'}`);
    console.log(`🗄️  Database: ${url.pathname.slice(1)}`);
    
    // Provjeri da li je Docker baza
    const isDockerDb = (url.hostname === '127.0.0.1' || url.hostname === 'localhost') && 
                       (url.port === '5432' || !url.port);
    
    if (isDockerDb) {
      console.log('🐳 Detected Docker database configuration');
    } else {
      console.log('🌐 Detected external database configuration');
    }
  } catch (error) {
    return {
      success: false,
      message: '❌ Invalid DATABASE_URL format!',
      details: `Error parsing URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // 3. Testiraj konekciju
  console.log('\n🔗 Testing database connection...');
  
  let pool: Pool | null = null;
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5000, // 5 sekundi timeout
    });

    const client = await pool.connect();
    
    // Testiraj osnovnu konekciju
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`✅ Connection successful!`);
    console.log(`⏰ Server time: ${result.rows[0].current_time}`);
    console.log(`📦 PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]}`);

    // Provjeri pgvector ekstenziju
    try {
      const vectorCheck = await client.query(`
        SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector
      `);
      
      if (vectorCheck.rows[0].has_vector) {
        console.log('✅ pgvector extension is available');
      } else {
        console.log('⚠️  pgvector extension not found (will be created automatically)');
      }
    } catch (vectorError) {
      console.log('⚠️  Could not check pgvector extension');
    }

    client.release();
    
    return {
      success: true,
      message: '✅ Database configuration is valid and connection successful!'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('ECONNREFUSED')) {
      return {
        success: false,
        message: '❌ Connection refused - Database server is not running!',
        details: 'Please start your Docker database container or check if the database server is running on the specified port.'
      };
    }
    
    if (errorMessage.includes('password authentication failed')) {
      return {
        success: false,
        message: '❌ Authentication failed!',
        details: 'Please check your database username and password in DATABASE_URL.'
      };
    }

    return {
      success: false,
      message: '❌ Database connection failed!',
      details: errorMessage
    };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Pokreni validaciju
async function main() {
  console.log('🔧 Database Configuration Validator\n');
  
  try {
    const result = await validateDatabaseConfig();
    
    console.log(`\n${result.message}`);
    if (result.details) {
      console.log(`💡 ${result.details}`);
    }
    
    if (!result.success) {
      console.log('\n📋 Quick fix checklist:');
      console.log('   1. Check if Docker container is running: docker ps');
      console.log('   2. Check .env file exists and contains DATABASE_URL');
      console.log('   3. Verify DATABASE_URL format: postgresql://postgres:password@127.0.0.1:5432/story_architect_lite_db');
      console.log('   4. Test Docker connection: docker exec -it <container_name> psql -U postgres');
      
      process.exit(1);
    }
    
    console.log('\n🎉 All checks passed! Your database configuration is ready.');
    
  } catch (error) {
    console.error('💥 Unexpected error during validation:', error);
    process.exit(1);
  }
}

main();
