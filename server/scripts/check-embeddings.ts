import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDatabase } from '../src/lib/db.js';

const db = await getDatabase();

const result = await db.execute(sql`
  SELECT
    COUNT(*)                                              AS total,
    COUNT(*) FILTER (WHERE metadata->>'projectId' IS NULL)  AS bez_projectid,
    COUNT(*) FILTER (WHERE metadata->>'projectId' IS NOT NULL) AS s_projectid,
    COUNT(DISTINCT metadata->>'projectId')                AS broj_razlicitih_projekata
  FROM story_architect_embeddings
`);

const row = (result as any).rows?.[0] ?? (result as any)[0];

console.log('\n=== story_architect_embeddings ===');
console.log(`total                    : ${row.total}`);
console.log(`bez_projectid            : ${row.bez_projectid}`);
console.log(`s_projectid              : ${row.s_projectid}`);
console.log(`broj_razlicitih_projekata: ${row.broj_razlicitih_projekata}`);

process.exit(0);
