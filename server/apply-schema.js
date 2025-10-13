// Alternativna skripta za kreiranje tablica koristeći postgres paket
const postgres = require('postgres');

async function applySchema() {
  console.log('🔍 Applying database schema...');
  
  // Pokušaj različite connection stringove
  const connectionAttempts = [
    'postgresql://postgres:password@127.0.0.1:5502/postgres',
    'postgresql://postgres:password@localhost:5502/postgres',
    'postgres://postgres:password@127.0.0.1:5502/postgres',
    'postgres://postgres:password@localhost:5502/postgres'
  ];
  
  let sql = null;
  let successfulConnection = null;
  
  // Pokušaj svaku konekciju
  for (const connString of connectionAttempts) {
    try {
      console.log(`   Trying: ${connString}`);
      sql = postgres(connString);
      await sql`SELECT 1`;
      successfulConnection = connString;
      console.log(`✅ Connected successfully with: ${connString}`);
      break;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      if (sql) await sql.end();
      sql = null;
    }
  }
  
  if (!sql) {
    console.error('❌ Could not connect to database with any connection string');
    process.exit(1);
  }
  
  try {
    // Korisnici
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE
      );
    `;
    console.log('✅ Table "users" created');

    // Projekti
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(256) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        logline TEXT,
        premise TEXT,
        theme TEXT
      );
    `;
    console.log('✅ Table "projects" created');

    // Likovi
    await sql`
      CREATE TABLE IF NOT EXISTS characters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(256) NOT NULL,
        role TEXT,
        motivation TEXT,
        arc_start TEXT,
        arc_end TEXT,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
      );
    `;
    console.log('✅ Table "characters" created');

    // Lokacije
    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(256) NOT NULL,
        description TEXT,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
      );
    `;
    console.log('✅ Table "locations" created');

    // Scene
    await sql`
      CREATE TABLE IF NOT EXISTS scenes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(256) NOT NULL,
        summary TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id)
      );
    `;
    console.log('✅ Table "scenes" created');

    // Vezna tablica
    await sql`
      CREATE TABLE IF NOT EXISTS characters_to_scenes (
        character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
        PRIMARY KEY (character_id, scene_id)
      );
    `;
    console.log('✅ Table "characters_to_scenes" created');

    // Lista tablica
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\n📋 All tables in database:');
    tables.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n🎉 Schema applied successfully!');
    console.log(`   Connection used: ${successfulConnection}`);
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applySchema();
