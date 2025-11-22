import 'dotenv/config';

// Svi ostali importi dolaze NAKON ovog bloka...
import { serve } from '@hono/node-server';
import app from './api';
import { getEnv, getDatabaseUrl } from './lib/env';
import { initializeFirebaseAdmin } from './lib/firebase-admin';

// Parse CLI arguments
const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');
  
  return {
    port: portIndex !== -1 ? parseInt(args[portIndex + 1]) : parseInt(getEnv('PORT', '8787')!),
  };
};

const { port } = parseCliArgs();

// Extract PostgreSQL port from DATABASE_URL if it's a local embedded postgres connection
// Neiskorištena funkcija - ostavljena za buduću upotrebu
// const getPostgresPortFromDatabaseUrl = (): number => {
//   const dbUrl = getDatabaseUrl();
//   if (dbUrl && (dbUrl.includes('localhost:') || dbUrl.includes('127.0.0.1:'))) {
//     const match = dbUrl.match(/(?:localhost|127\.0\.0\.1):(\d+)/);
//     if (match) {
//       return parseInt(match[1]);
//     }
//   }
//   return 5432; // fallback default (now using fixed port 5432)
// };

const startServer = async () => {
  console.log(`🚀 Starting backend server on port ${port}`);
  
  // Initialize Firebase Admin SDK (handles FIREBASE_PRIVATE_KEY transformation)
  try {
    initializeFirebaseAdmin();
  } catch (error) {
    console.error('⚠️  Firebase Admin SDK initialization failed, continuing without it:', error);
  }
  
  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    // Mask password for security in logs
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
    if (dbUrl.includes('127.0.0.1:5432') || dbUrl.includes('localhost:5432')) {
      console.log(`🔗 Using Docker database connection: ${maskedUrl}`);
    } else {
      console.log(`🔗 Using external database connection: ${maskedUrl}`);
    }
  } else {
    console.error('❌ DATABASE_URL not found! Server will fail to start.');
  }

  serve({
    fetch: app.fetch,
    port,
  });
};

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer(); 