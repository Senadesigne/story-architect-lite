
import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as createDrizzlePostgres } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from '../schema/schema.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

// --- NEON CONFIGURATION (Scoped Timeout) ---
const NEON_CONNECT_TIMEOUT = 5000; // 5 seconds
neonConfig.fetchConnectionCache = true;

// Custom fetch implementation with timeout to protect server from hanging DB connections
neonConfig.fetchFunction = (url: string, options: any) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.error(`[Neon] DB Connection aborted after ${NEON_CONNECT_TIMEOUT}ms`);
  }, NEON_CONNECT_TIMEOUT);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};
// -------------------------------------------

export type DatabaseConnection =
  | NeonHttpDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>
  | NodePgDatabase<typeof schema>;

let cachedConnection: DatabaseConnection | null = null;
let cachedConnectionString: string | null = null;
let globalPool: Pool | null = null;

const isNeonDatabase = (connectionString: string): boolean => {
  // Force HTTP driver on Vercel to prevent TCP connection pooling issues (Zombie Sockets)
  if (process.env.VERCEL) return true;

  return process.env.USE_NEON_HTTP === 'true' ||
    connectionString.includes('neon.tech') ||
    connectionString.includes('neon.database');
};

const createConnection = async (connectionString: string): Promise<DatabaseConnection> => {
  console.log(`[CP 6] Driver determined: ${isNeonDatabase(connectionString) ? 'NEON-HTTP' : 'POSTGRES'} - ` + new Date().toISOString());
  if (isNeonDatabase(connectionString)) {
    console.log('🚀 Initializing Neon HTTP driver (Serverless optimized)');
    const sql = neon(connectionString);
    return drizzle(sql, { schema });
  }

  console.log('🐘 Initializing Node-Postgres driver (Persistent connection)');

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

    // CRITICAL: Handle idle client errors to prevent Node process crash
    globalPool.on('error', (err, client) => {
      console.error('❌ Unexpected error on idle database client', err);
      // Don't exit process, just log. The pool will discard the client.
    });
  }

  return createDrizzlePostgres(globalPool, { schema });
};

export const getDatabase = async (connectionString?: string): Promise<DatabaseConnection> => {
  // Always use DATABASE_URL from environment or provided connectionString
  let connStr = connectionString || process.env.DATABASE_URL;

  console.log('[CP 5] DB initialization logic started - ' + new Date().toISOString());

  // Defensive: Strip surrounding quotes if present (fix for common .env issues)
  if (connStr && (connStr.startsWith('"') || connStr.startsWith("'"))) {
    connStr = connStr.slice(1, -1);
  }

  if (!connStr) {
    throw new Error(
      'DATABASE_URL environment variable is not set! ' +
      'Please ensure your .env file contains: DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/story_architect_lite_db'
    );
  }

  if (cachedConnection && cachedConnectionString === connStr) {
    return cachedConnection;
  }

  // Debug log (mask password)
  const maskedUrl = connStr.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Connecting to database: ${maskedUrl}`);

  try {
    cachedConnection = await Promise.race([
      createConnection(connStr),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `DB_CONNECTION_TIMEOUT: Baza se ne javlja na ${maskedUrl}`
              )
            ),
          5000
        )
      ),
    ]);
    cachedConnectionString = connStr;
  } catch (error) {
    console.error('FULL DB CONNECTION ERROR:', error);
    throw error;
  }

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