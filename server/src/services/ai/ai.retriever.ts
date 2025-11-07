import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { getDatabase } from '../../lib/db';

// 1. Postavi Drizzle klijenta koristeći postojeću infrastrukturu
// Povući ćemo DATABASE_URL iz environmenta
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set!");
}

// 2. Konfiguriraj Embeddings model
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY, // Morat ćemo dodati OPENAI_API_KEY u .env
  model: "text-embedding-3-small"
});

// 3. Konfiguriraj Vektorsku Bazu
let vectorStore: PGVectorStore | null = null;

const getVectorStore = async (): Promise<PGVectorStore> => {
  if (!vectorStore) {
    const db = await getDatabase();
    vectorStore = new PGVectorStore(embeddings, {
      postgresConnectionOptions: {
        connectionString: connectionString,
      },
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
 * Dohvaća relevantne dokumente iz vektorske baze.
 * @param query - Upit (npr. "transformirani upit" od AI Mentora)
 * @param k - Broj dokumenata za dohvat (default 5)
 * @returns String koji sadrži spojeni kontekst.
 */
export async function getRelevantContext(query: string, k: number = 5): Promise<string> {
  try {
    // 4. Izvrši pretraživanje
    const store = await getVectorStore();
    const results = await store.similaritySearch(query, k);

    // 5. Formatiraj rezultate u jedan string
    if (results.length === 0) {
      return "Nema pronađenog relevantnog konteksta.";
    }

    return results
      .map((doc) => doc.pageContent)
      .join("\n\n---\n\n");

  } catch (error) {
    console.error("Error during RAG retrieval:", error);
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
    await store.addDocuments(docs, { ids: docs.map(d => (d.metadata as any).docId) });
    console.log(`Successfully added ${docs.length} documents to vector store.`);
  } catch (error) {
    console.error("Error adding documents to vector store:", error);
  }
}
