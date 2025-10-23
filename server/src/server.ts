// STAVITI OVO NA SAMI VRH DATOTEKE server/src/server.ts
// PRIJE SVIH DRUGIH IMPORTA!

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url'; // Važno za ES Module
import fs from 'fs';

// --- START: Force .env load (ESM verzija) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kreiramo apsolutnu putanju do .env datoteke
// __dirname je C:\...\story-architect-lite\server\src
// '..' ide jedan nivo gore u C:\...\story-architect-lite\server
// '.env' je datoteka koju tražimo (server/.env)
const envPath = path.resolve(__dirname, '..', '.env');

// Učitavamo .env datoteku
const result = dotenv.config({ path: envPath });

// Dodajemo logiranje da vidimo što se događa
if (result.error) {
  console.error('CRITICAL ERROR: Could not load .env file from:', envPath);
  console.error(result.error);
  process.exit(1); // Zaustavi server ako .env nije učitan
} else {
  console.log(`✅ Successfully loaded .env file from: ${envPath}`);
  // Provjerimo je li VARIJABLA učitana u process.env
  // Nećemo logirati vrijednost, samo da li postoji
  console.log(`   -> Is process.env.FIREBASE_PROJECT_ID set? ${process.env.FIREBASE_PROJECT_ID ? 'Yes' : 'No'}`);
  
  // Debug: Prikažimo sve varijable koje počinju s FIREBASE_
  console.log('   -> All FIREBASE_* variables in process.env:');
  const firebaseVars = Object.keys(process.env).filter(key => key.startsWith('FIREBASE_'));
  if (firebaseVars.length === 0) {
    console.log('      (No FIREBASE_* variables found)');
  } else {
    firebaseVars.forEach(key => {
      console.log(`      ${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
    });
  }
  
  // Debug: Prikažimo što je dotenv stvarno učitao
  console.log('   -> Variables loaded by dotenv:');
  if (result.parsed) {
    Object.keys(result.parsed).forEach(key => {
      console.log(`      ${key}: ${result.parsed[key] ? 'SET' : 'EMPTY'}`);
    });
  } else {
    console.log('      (No variables parsed from .env file)');
  }
  
  // DODATNA DIJAGNOSTIKA
  console.log('\n🔍 DODATNA DIJAGNOSTIKA:');
  
  // 1. Provjerimo postojanje datoteke
  if (fs.existsSync(envPath)) {
    console.log(`✅ .env datoteka postoji na: ${envPath}`);
    
    // 2. Pročitajmo raw sadržaj datoteke
    const rawContent = fs.readFileSync(envPath);
    console.log(`📄 Veličina datoteke: ${rawContent.length} bajtova`);
    
    // 3. Provjerimo BOM
    const hasBOM = rawContent[0] === 0xEF && rawContent[1] === 0xBB && rawContent[2] === 0xBF;
    console.log(`📋 Ima li BOM? ${hasBOM ? 'DA - OVO JE PROBLEM!' : 'NE'}`);
    
    // 4. Provjerimo encoding
    const contentUtf8 = fs.readFileSync(envPath, 'utf8');
    console.log(`📝 Prvih 200 karaktera (raw):`);
    console.log(JSON.stringify(contentUtf8.substring(0, 200)));
    
    // 5. Analizirajmo linije
    const lines = contentUtf8.split(/\r?\n/);
    console.log(`📊 Broj linija: ${lines.length}`);
    
    // 6. Provjerimo svaku liniju za FIREBASE_ varijable
    console.log('\n🔎 Analiza FIREBASE_ linija:');
    lines.forEach((line, index) => {
      if (line.includes('FIREBASE_')) {
        console.log(`   Linija ${index + 1}: "${line}"`);
        console.log(`   -> Duljina: ${line.length} karaktera`);
        console.log(`   -> Počinje s whitespace? ${/^\s/.test(line) ? 'DA' : 'NE'}`);
        console.log(`   -> Hex prvih 10 karaktera:`, Buffer.from(line.substring(0, 10)).toString('hex'));
        
        // Provjerimo ima li nevidljivih karaktera
        const invisibleChars = line.match(/[\x00-\x1F\x7F-\x9F]/g);
        if (invisibleChars) {
          console.log(`   -> ⚠️  PRONAĐENI NEVIDLJIVI KARAKTERI:`, invisibleChars.map(c => c.charCodeAt(0)));
        }
      }
    });
    
    // 7. Pokušajmo ručno parsirati
    console.log('\n🔧 Ručno parsiranje .env datoteke:');
    const manualEnv: Record<string, string> = {};
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          manualEnv[match[1]] = match[2];
        }
      }
    });
    console.log('Ručno parsirane varijable:', Object.keys(manualEnv));
    if (manualEnv['FIREBASE_PROJECT_ID']) {
      console.log('✅ FIREBASE_PROJECT_ID pronađen ručnim parsiranjem!');
      console.log(`   Vrijednost: "${manualEnv['FIREBASE_PROJECT_ID']}"`);
    }
    
  } else {
    console.log(`❌ .env datoteka NE postoji na: ${envPath}`);
  }
}
// --- END: Force .env load ---

// Svi ostali importi dolaze NAKON ovog bloka...
import { serve } from '@hono/node-server';
import app from './api';
import { getEnv, getDatabaseUrl, isLocalEmbeddedPostgres } from './lib/env';

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
  
  if (!getDatabaseUrl() || isLocalEmbeddedPostgres()) {
    console.log('🔗 Using local database connection (expecting database server on dynamic port)');
  } else {
    console.log('🔗 Using external database connection');
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