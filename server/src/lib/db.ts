import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as createDrizzlePostgres } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from '../schema/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

export type DatabaseConnection = 
  | NeonHttpDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>
  | NodePgDatabase<typeof schema>;

let cachedConnection: DatabaseConnection | null = null;
let cachedConnectionString: string | null = null;
let globalPool: Pool | null = null;

const isNeonDatabase = (connectionString: string): boolean => {
  return connectionString.includes('neon.tech') || connectionString.includes('neon.database');
};

const createConnection = async (connectionString: string): Promise<DatabaseConnection> => {
  if (isNeonDatabase(connectionString)) {
    const sql = neon(connectionString);
    return drizzle(sql, { schema });
  }

  // Kreiraj ili koristi postojeći Pool za connection pooling
  if (!globalPool || globalPool.options.connectionString !== connectionString) {
    // Zatvori postojeći pool ako postoji
    if (globalPool) {
      await globalPool.end();
    }
    
    // Kreiraj novi Pool s optimiziranim postavkama
    globalPool = new Pool({
      connectionString,
      max: 20, // Maksimalno 20 konekcija u pool-u
      idleTimeoutMillis: 30000, // 30 sekundi timeout za idle konekcije
      connectionTimeoutMillis: 2000, // 2 sekunde timeout za nove konekcije
      maxUses: 7500, // Maksimalno korištenje po konekciji prije zatvaranja
    });
  }

  return createDrizzlePostgres(globalPool, { schema });
};

export const getDatabase = async (connectionString?: string): Promise<DatabaseConnection> => {
  // Always use DATABASE_URL from environment or provided connectionString
  const connStr = connectionString || process.env.DATABASE_URL;

  if (cachedConnection && cachedConnectionString === connStr) {
    return cachedConnection;
  }

  if (!connStr) {
    throw new Error(
      'DATABASE_URL environment variable is not set! ' +
      'Please ensure your .env file contains: DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/story_architect_lite_db'
    );
  }

  cachedConnection = await createConnection(connStr);
  cachedConnectionString = connStr;

  return cachedConnection;
};

export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    if (!cachedConnection) return false;
    await cachedConnection.select().from(schema.users).limit(1);
    return true;
  } catch {
    return false;
  }
};

export const clearConnectionCache = (): void => {
  cachedConnection = null;
  cachedConnectionString = null;
};

/**
 * Gracefully zatvara database connection pool
 * Korisno za shutdown proceduru
 */
export const closeConnectionPool = async (): Promise<void> => {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
  }
};