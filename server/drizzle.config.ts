import 'dotenv/config';
import type { Config } from 'drizzle-kit';
import { getDatabaseUrl } from './src/lib/env';

let databaseUrl = getDatabaseUrl();

// Force IPv4 by replacing localhost with 127.0.0.1
// This is critical for Windows environments where localhost might resolve to IPv6
if (databaseUrl && databaseUrl.includes('localhost')) {
  databaseUrl = databaseUrl.replace(/localhost/g, '127.0.0.1');
}

// Debug logging
console.log('🔍 Drizzle Config Debug:');
console.log('   Original DATABASE_URL:', getDatabaseUrl());
console.log('   Modified DATABASE_URL (IPv4):', databaseUrl);
console.log('   Final connection string:', databaseUrl || 'postgresql://postgres:password@127.0.0.1:5432/postgres');

export default {
  schema: './src/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl || 'postgresql://postgres:password@127.0.0.1:5432/postgres',
  },
  schemaFilter: ['public'],
} satisfies Config; 