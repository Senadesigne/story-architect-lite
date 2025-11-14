import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';
import path from 'path';
import { getDatabase } from '../src/lib/db.js';
import { 
  projects, 
  characters, 
  locations, 
  scenes 
} from '../src/schema/schema.js';
import { 
  addDocumentsToVectorStore, 
  closeVectorStorePool 
} from '../src/services/ai/ai.retriever.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import * as dotenv from 'dotenv';

// ES module kompatibilnost
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Učitaj environment varijable
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Type definicije za Drizzle table types
type ProjectType = typeof projects.$inferSelect;
type CharacterType = typeof characters.$inferSelect;
type LocationType = typeof locations.$inferSelect;
type SceneType = typeof scenes.$inferSelect;

/**
 * Formatira projekt u Document objekt za vektorsku bazu
 */
function formatProjectDoc(project: ProjectType): Document {
  const contentParts: string[] = [];
  
  if (project.title) contentParts.push(`Naslov: ${project.title}`);
  if (project.logline) contentParts.push(`Logline: ${project.logline}`);
  if (project.premise) contentParts.push(`Premisa: ${project.premise}`);
  if (project.theme) contentParts.push(`Tema: ${project.theme}`);
  if (project.genre) contentParts.push(`Žanr: ${project.genre}`);
  if (project.audience) contentParts.push(`Publika: ${project.audience}`);
  if (project.brainstorming) contentParts.push(`Brainstorming: ${project.brainstorming}`);
  if (project.research) contentParts.push(`Istraživanje: ${project.research}`);
  if (project.rules_definition) contentParts.push(`Definicija pravila: ${project.rules_definition}`);
  if (project.culture_and_history) contentParts.push(`Kultura i povijest: ${project.culture_and_history}`);
  if (project.synopsis) contentParts.push(`Sinopsis: ${project.synopsis}`);
  if (project.outline_notes) contentParts.push(`Bilješke outline-a: ${project.outline_notes}`);
  if (project.point_of_view) contentParts.push(`Perspektiva: ${project.point_of_view}`);
  
  const pageContent = contentParts.join('\n\n');
  
  return new Document({
    pageContent,
    metadata: {
      docId: project.id,
      projectId: project.id,
      sourceType: 'project'
    }
  });
}

/**
 * Formatira lik u Document objekt za vektorsku bazu
 */
function formatCharacterDoc(character: CharacterType): Document {
  const contentParts: string[] = [];
  
  if (character.name) contentParts.push(`Ime: ${character.name}`);
  if (character.role) contentParts.push(`Uloga: ${character.role}`);
  if (character.motivation) contentParts.push(`Motivacija: ${character.motivation}`);
  if (character.goal) contentParts.push(`Cilj: ${character.goal}`);
  if (character.fear) contentParts.push(`Strah: ${character.fear}`);
  if (character.backstory) contentParts.push(`Pozadinska priča: ${character.backstory}`);
  if (character.arcStart) contentParts.push(`Početak luka: ${character.arcStart}`);
  if (character.arcEnd) contentParts.push(`Kraj luka: ${character.arcEnd}`);
  
  const pageContent = contentParts.join('\n\n');
  
  return new Document({
    pageContent,
    metadata: {
      docId: character.id,
      projectId: character.projectId,
      sourceType: 'character'
    }
  });
}

/**
 * Formatira lokaciju u Document objekt za vektorsku bazu
 */
function formatLocationDoc(location: LocationType): Document {
  const contentParts: string[] = [];
  
  if (location.name) contentParts.push(`Naziv: ${location.name}`);
  if (location.description) contentParts.push(`Opis: ${location.description}`);
  
  const pageContent = contentParts.join('\n\n');
  
  return new Document({
    pageContent,
    metadata: {
      docId: location.id,
      projectId: location.projectId,
      sourceType: 'location'
    }
  });
}

/**
 * Formatira scenu u Document objekt za vektorsku bazu
 */
function formatSceneDoc(scene: SceneType): Document {
  const contentParts: string[] = [];
  
  if (scene.title) contentParts.push(`Naslov: ${scene.title}`);
  if (scene.summary) contentParts.push(`Sažetak: ${scene.summary}`);
  
  const pageContent = contentParts.join('\n\n');
  
  return new Document({
    pageContent,
    metadata: {
      docId: scene.id,
      projectId: scene.projectId,
      sourceType: 'scene',
      order: scene.order
    }
  });
}

/**
 * Glavna funkcija koja dohvaća podatke iz baze i popunjava vektorsku bazu
 */
async function main(): Promise<void> {
  console.log('🚀 Pokretanje populate-embeddings skripte...\n');
  
  try {
    // Korak 1: Provjeri environment varijable
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set!');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set!');
    }
    
    console.log('✅ Environment varijable provjerene');
    
    // Korak 2: Dohvati database konekciju
    console.log('📊 Dohvaćanje podataka iz baze...');
    const db = await getDatabase();
    
    // Korak 3: Dohvati sve podatke paralelno
    const [
      allProjects,
      allCharacters,
      allLocations,
      allScenes
    ] = await Promise.all([
      db.select().from(projects),
      db.select().from(characters),
      db.select().from(locations),
      db.select().from(scenes)
    ]);
    
    console.log(`📈 Dohvaćeno:`);
    console.log(`   - ${allProjects.length} projekata`);
    console.log(`   - ${allCharacters.length} likova`);
    console.log(`   - ${allLocations.length} lokacija`);
    console.log(`   - ${allScenes.length} scena`);
    
    // Korak 4: Provjeri ima li podataka za procesiranje
    const totalDocuments = allProjects.length + allCharacters.length + allLocations.length + allScenes.length;
    if (totalDocuments === 0) {
      console.log('⚠️  Nema podataka za procesiranje. Baza je prazna.');
      return;
    }
    
    // Korak 5: Formatiranje u Document objekte
    console.log('🔄 Formatiranje dokumenata...');
    const rawDocuments: Document[] = [
      ...allProjects.map(formatProjectDoc),
      ...allCharacters.map(formatCharacterDoc),
      ...allLocations.map(formatLocationDoc),
      ...allScenes.map(formatSceneDoc)
    ];
    
    console.log(`📝 Formatirano ${rawDocuments.length} dokumenata`);
    
    // Korak 6: Text Splitting
    console.log('✂️  Cijepanje teksta na manje dijelove...');
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const splitDocuments = await textSplitter.splitDocuments(rawDocuments);
    
    // Dodaj chunkIndex u metadata
    const allChunks = splitDocuments.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        chunkIndex: index
      }
    }));
    
    console.log(`🧩 Kreirano ${allChunks.length} chunk-ova`);
    
    // Korak 7: Dodavanje u Vector Store
    console.log('💾 Dodavanje dokumenata u vektorsku bazu...');
    await addDocumentsToVectorStore(allChunks);
    
    console.log('✅ Uspješno dodano u vektorsku bazu!');
    console.log(`📊 Statistike:`);
    console.log(`   - Ukupno dokumenata: ${rawDocuments.length}`);
    console.log(`   - Ukupno chunk-ova: ${allChunks.length}`);
    console.log(`   - Prosječno chunk-ova po dokumentu: ${(allChunks.length / rawDocuments.length).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Greška tijekom izvršavanja skripte:', error);
    
    if (error instanceof Error) {
      console.error('💡 Detalji greške:', error.message);
      console.error('🔍 Stack trace:', error.stack);
    }
    
    process.exit(1);
  } finally {
    // Korak 8: Cleanup - zatvaranje pool-a
    console.log('🧹 Zatvaranje konekcija...');
    try {
      await closeVectorStorePool();
      console.log('✅ Konekcije uspješno zatvorene');
    } catch (cleanupError) {
      console.error('⚠️  Greška prilikom zatvaranja konekcija:', cleanupError);
    }
  }
}

// Pokretanje skripte
main().catch((error) => {
  console.error('💥 Neočekivana greška:', error);
  process.exit(1);
});
