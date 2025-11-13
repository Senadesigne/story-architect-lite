import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { sql } from 'drizzle-orm';
import { getDatabase } from '../../lib/db';
import { Pool, PoolConfig } from 'pg';
import { registerType } from 'pgvector/pg';

// 1. Postavi Drizzle klijenta koristeći postojeću infrastrukturu
// Povući ćemo DATABASE_URL iz environmenta kada je potrebno
const getConnectionString = (): string => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set! " +
      "Please ensure your .env file contains: DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/story_architect_lite_db"
    );
  }
  return connectionString;
};

// Singleton Pool instanca s registriranim pgvector tipovima
let pgPool: Pool | null = null;
let typesRegistered = false;

const getPgPool = async (): Promise<Pool> => {
  if (!pgPool) {
    const connectionString = getConnectionString();
    
    // Kreiraj Pool konfiguraciju
    const poolConfig: PoolConfig = {
      connectionString,
      max: 20, // maksimalno 20 konekcija u pool-u
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    
    pgPool = new Pool(poolConfig);
    
    // Registriraj pgvector tipove jednom
    if (!typesRegistered) {
      try {
        const client = await pgPool.connect();
        
        // Self-Healing: Osiguraj postojanje vector ekstenzije prije registracije tipova
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log('Ensured vector extension exists in database');
        
        await registerType(client);
        client.release();
        typesRegistered = true;
        console.log('Successfully registered pgvector types');
      } catch (error) {
        console.error('Error registering pgvector types:', error);
        throw error;
      }
    }
  }
  
  return pgPool;
};

// 2. Konfiguriraj Embeddings model
const getEmbeddings = (): OpenAIEmbeddings => {
  return new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY, // Morat ćemo dodati OPENAI_API_KEY u .env
    model: "text-embedding-3-small"
  });
};

// 3. Konfiguriraj Vektorsku Bazu
let vectorStore: PGVectorStore | null = null;

const getVectorStore = async (): Promise<PGVectorStore> => {
  if (!vectorStore) {
    const pool = await getPgPool();
    const embeddings = getEmbeddings();
    
    vectorStore = new PGVectorStore(embeddings, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pool: pool as any, // Koristi konfigurirani pool s registriranim tipovima
      tableName: "story_architect_embeddings", // Ime tablice za vektore
      columns: {
        idColumnName: "id",
        vectorColumnName: "vector",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
    });
  }
  return vectorStore;
};

/**
 * Provjerava postoji li tablica u bazi podataka
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.execute(sql`SELECT to_regclass('public.${sql.raw(tableName)}')`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result.rows[0] as any)?.to_regclass !== null;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Dohvaća relevantne dokumente iz vektorske baze.
 * @param query - Upit (npr. "transformirani upit" od AI Mentora)
 * @param k - Broj dokumenata za dohvat (default 5)
 * @returns String koji sadrži spojeni kontekst.
 */
export async function getRelevantContext(query: string, k: number = 5): Promise<string> {
  try {
    // Provjeri postoji li tablica prije pokušaja dohvaćanja
    const tableExists = await checkTableExists('story_architect_embeddings');
    if (!tableExists) {
      console.warn('Vector table not found. Please run setup-pgvector.ts and db:push');
      return "Vektorska baza još nije konfigurirana. Molimo pokrenite postavljanje vektorske baze.";
    }

    // Postojeći kod za dohvaćanje...
    const store = await getVectorStore();
    const results = await store.similaritySearch(query, k);

    if (results.length === 0) {
      return "Nema pronađenog relevantnog konteksta.";
    }

    return results
      .map((doc) => doc.pageContent)
      .join("\n\n---\n\n");

  } catch (error) {
    console.error("Error during RAG retrieval:", error);
    // Detaljnija poruka greške za lakše debugiranje
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    return "Greška prilikom dohvaćanja konteksta iz vektorske baze.";
  }
}

/**
 * Funkcija za dodavanje/ažuriranje dokumenata u vektorskoj bazi.
 * (OVO ĆEMO KORISTITI KASNIJE, ali dobro je da je tu)
 */
export async function addDocumentsToVectorStore(docs: Array<{ pageContent: string, metadata: object }>) {
  try {
    const store = await getVectorStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await store.addDocuments(docs, { ids: docs.map(d => (d.metadata as Record<string, any>).docId) });
    console.log(`Successfully added ${docs.length} documents to vector store.`);
  } catch (error) {
    console.error("Error adding documents to vector store:", error);
  }
}

/**
 * Graceful shutdown funkcija za zatvaranje pool-a
 */
export async function closeVectorStorePool(): Promise<void> {
  if (pgPool) {
    try {
      await pgPool.end();
      pgPool = null;
      typesRegistered = false;
      console.log('Vector store pool closed successfully');
    } catch (error) {
      console.error('Error closing vector store pool:', error);
    }
  }
}
