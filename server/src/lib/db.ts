import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as createDrizzlePostgres } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from '../schema/schema';

type DatabaseConnection = ReturnType<typeof drizzle> | ReturnType<typeof createDrizzlePostgres>;

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
  // Use default local database connection if no external connection string provided
  // Note: In development, the port is dynamically allocated by port-manager.js
  const defaultLocalConnection = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';
  const connStr = connectionString || defaultLocalConnection;

  if (cachedConnection && cachedConnectionString === connStr) {
    return cachedConnection;
  }

  if (!connStr) {
    throw new Error('No database connection available. Ensure database server is running or provide a connection string.');
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