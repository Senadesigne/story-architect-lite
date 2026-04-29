import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDatabase } from '../src/lib/db.js';

const db = await getDatabase();

const countQuery = async () => {
  const r = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM story_architect_embeddings) AS embeddings,
      (SELECT COUNT(*) FROM scenes)                     AS scenes,
      (SELECT COUNT(*) FROM chapters)                   AS chapters,
      (SELECT COUNT(*) FROM characters)                 AS characters,
      (SELECT COUNT(*) FROM locations)                  AS locations,
      (SELECT COUNT(*) FROM projects)                   AS projects
  `);
  return (r as any).rows?.[0] ?? (r as any)[0];
};

console.log('\n=== COUNT PRIJE ===');
const before = await countQuery();
console.table(before);

await db.execute(sql`DELETE FROM story_architect_embeddings`);
await db.execute(sql`DELETE FROM scenes`);
await db.execute(sql`DELETE FROM chapters`);
await db.execute(sql`DELETE FROM characters`);
await db.execute(sql`DELETE FROM locations`);
await db.execute(sql`DELETE FROM projects`);

console.log('\n=== COUNT POSLIJE ===');
const after = await countQuery();
console.table(after);

process.exit(0);
