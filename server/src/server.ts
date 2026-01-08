import 'dotenv/config';
import { serve, getRequestListener } from '@hono/node-server';
import app from './api.js';
import { getEnv, getDatabaseUrl } from './lib/env.js';
import { initializeFirebaseAdmin } from './lib/firebase-admin.js';

console.log('[CP 1] Server entry point reached - ' + new Date().toISOString());

// Parse CLI arguments
const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');

  return {
    port: portIndex !== -1 ? parseInt(args[portIndex + 1]) : parseInt(getEnv('PORT', '8787')!),
  };
};

const { port } = parseCliArgs();
console.log(`[CP 2] Port config: ${port}, USE_NEON_HTTP: ${process.env.USE_NEON_HTTP} - ` + new Date().toISOString());

const startServer = async () => {
  console.log(`🚀 Starting backend server on port ${port}`);

  // Initialize Firebase Admin SDK (handles FIREBASE_PRIVATE_KEY transformation)
  try {
    console.log('[CP 3] Starting Firebase Admin init - ' + new Date().toISOString());
    initializeFirebaseAdmin();
  } catch (error) {
    console.error('⚠️  Firebase Admin SDK initialization failed, continuing without it:', error);
  }
  console.log('[CP 4] Firebase Admin init block finished - ' + new Date().toISOString());

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
    // Node.js 22 native fetch is used, no global overrides needed
  });
};

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Global error handlers to prevent crash on unhandled async errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

// --- HYBRID EXECUTION: Vercel vs Local ---
if (process.env.VERCEL) {
  // Vercel Environment: Init Firebase and export handler
  try {
    initializeFirebaseAdmin();
  } catch (e) {
    console.error('Vercel Firebase Init Error:', e);
  }
} else {
  // Local Environment: Start server immediately
  startServer();
}

// Export for Vercel using direct RequestListener adapter (bypasses fetch wrapper issues on Node 22)
export default getRequestListener(app.fetch);
