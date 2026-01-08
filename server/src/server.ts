import 'dotenv/config';
import { serve } from '@hono/node-server';
import { handle } from '@hono/node-server/vercel';
import app from './api.js';
import { getEnv, getDatabaseUrl } from './lib/env.js';

// ... (imports remain)
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

// --- MANUAL BRIDGE (Path C) for Vercel Node 22 ---
// Fallback jer standardni adapteri ne konvertiraju ispravno IncomingMessage -> Request
import { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

// Helper za konverziju Node Streama u Web ReadableStream
const nodeStreamToWeb = (nodeStream: Readable): ReadableStream => {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    }
  });
};

const bridgeHandler = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https'; // Vercel defaults to https
    const host = req.headers.host || 'localhost';
    const urlObj = new URL(req.url || '/', `${protocol}://${host}`);

    // Reconstruct original URL from Vercel rewrite
    const p = urlObj.searchParams.get("path");
    if (p) {
      urlObj.pathname = `/api/${p}`;
      urlObj.searchParams.delete("path");
    }

    // [DIAGNOSTIC] Log rewritten URL
    console.log('[BRIDGE] URL Rewrite:', req.url, '->', urlObj.toString());

    const headers = new Headers();
    for (const key in req.headers) {
      const value = req.headers[key];
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else if (typeof value === 'string') {
        headers.set(key, value);
      }
    }

    const requestInit: RequestInit = {
      method: req.method,
      headers: headers,
    };

    // Body handling for non-GET/HEAD requests using ReadableStream
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      requestInit.body = nodeStreamToWeb(req);
      // @ts-ignore - Required for Node.js environment to enable streaming
      requestInit.duplex = 'half';
    }

    const request = new Request(urlObj, requestInit);

    // [DIAGNOSTIC] Log to confirm type
    console.log('[BRIDGE] Request created. Type:', request.constructor.name);

    const response = await app.fetch(request);

    // Copy status
    res.statusCode = response.status;

    // Copy headers (handle Set-Cookie specially)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        // Hono/Fetch API merges redundant headers, but we might need to split them if comma-separated
        // However, for typical single-cookie auth it's usually fine. 
        // For array support we'd need access to raw headers which Fetch API abstracts.
        // Node's setHeader supports arrays for multiple cookies.
        res.setHeader(key, value);
      } else {
        res.setHeader(key, value);
      }
    });

    // Check for multiple set-cookie (if headers.getSetCookie exists - Node 18+)
    if (typeof (response.headers as any).getSetCookie === 'function') {
      const cookies = (response.headers as any).getSetCookie();
      if (cookies && cookies.length > 0) {
        res.setHeader('set-cookie', cookies);
      }
    }

    if (response.body) {
      // Stream response body back to Node response
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }

  } catch (error) {
    console.error('[BRIDGE ERROR]', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error (Vercel Bridge)');
    }
  }
};

// Export for Vercel
export default bridgeHandler;
