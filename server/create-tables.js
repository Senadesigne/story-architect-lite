// Node.js skripta za kreiranje tablica
// Pokreni: node create-tables.js

const { Client } = require('pg');

async function createTables() {
  const client = new Client({
    host: 'localhost',
    port: 5502,
    user: 'postgres',
    password: 'password',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ Povezan na PostgreSQL');

    // Korisnici
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE
      );
    `);
    console.log('✅ Tablica "users" stvorena');

    // Projekti
    await client.query(`
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
    `);
    console.log('✅ Tablica "projects" stvorena');

    // Likovi
    await client.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(256) NOT NULL,
        role TEXT,
        motivation TEXT,
        arc_start TEXT,
        arc_end TEXT,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tablica "characters" stvorena');

    // Lokacije
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(256) NOT NULL,
        description TEXT,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tablica "locations" stvorena');

    // Scene
    await client.query(`
      CREATE TABLE IF NOT EXISTS scenes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(256) NOT NULL,
        summary TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id)
      );
    `);
    console.log('✅ Tablica "scenes" stvorena');

    // Vezna tablica
    await client.query(`
      CREATE TABLE IF NOT EXISTS characters_to_scenes (
        character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
        PRIMARY KEY (character_id, scene_id)
      );
    `);
    console.log('✅ Tablica "characters_to_scenes" stvorena');

    // Provjeri tablice
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Stvorene tablice:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n🎉 Sve tablice su uspješno stvorene!');
    
  } catch (error) {
    console.error('❌ Greška:', error.message);
  } finally {
    await client.end();
  }
}

createTables();
