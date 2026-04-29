/**
 * Faza 3 — Ollama konekcija i AI Factory test (HPE #1)
 *
 * Pokretanje:  tsx scripts/test-ollama-connection.ts
 * (iz server/ direktorija, .env se automatski učitava)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

// ─── helpers ──────────────────────────────────────────────────────────────────

function ok(label: string, detail?: string) {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label: string, detail?: string) {
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}
function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ─── 1. PING TEST ─────────────────────────────────────────────────────────────

async function pingTest(): Promise<boolean> {
  section('TEST 1 — PING  http://192.168.10.197:11434/api/tags');
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://192.168.10.197:11434';

  try {
    const t0 = Date.now();
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(8000),
    });
    const latency = Date.now() - t0;

    if (!res.ok) {
      fail('HTTP response', `status ${res.status}`);
      return false;
    }

    const json = await res.json() as { models?: { name: string }[] };
    const models = json.models ?? [];

    ok('HPE #1 dosegnut', `${latency} ms`);
    console.log(`\n  Modeli na HPE #1 (${models.length}):`);
    models.forEach(m => console.log(`    • ${m.name}`));

    const hasQwen   = models.some(m => m.name.startsWith('qwen3:30b-a3b'));
    const hasNomic  = models.some(m => m.name.startsWith('nomic-embed-text'));

    hasQwen  ? ok('qwen3:30b-a3b pronađen') : fail('qwen3:30b-a3b NIJE pronađen');
    hasNomic ? ok('nomic-embed-text pronađen') : fail('nomic-embed-text NIJE pronađen');

    return hasQwen;
  } catch (e: unknown) {
    fail('Konekcija neuspješna', String(e));
    return false;
  }
}

// ─── 2. MANAGER PROVIDER TEST (Ollama) ────────────────────────────────────────

async function managerTest(): Promise<void> {
  section('TEST 2 — createManagerProvider  (MANAGER_PROVIDER=ollama, qwen3:30b-a3b)');

  // Osiguravamo ispravne env var-e za ovaj test
  process.env.MANAGER_PROVIDER = 'ollama';
  process.env.MANAGER_MODEL    = 'qwen3:30b-a3b';

  console.log(`  MANAGER_PROVIDER  = ${process.env.MANAGER_PROVIDER}`);
  console.log(`  MANAGER_MODEL     = ${process.env.MANAGER_MODEL}`);
  console.log(`  OLLAMA_BASE_URL   = ${process.env.OLLAMA_BASE_URL}`);

  const { createManagerProvider } = await import('../src/services/ai.factory.js');

  let provider;
  try {
    provider = await createManagerProvider();
    ok('Provider kreiran', provider.getProviderName());
  } catch (e: unknown) {
    fail('createManagerProvider bacilo grešku', String(e));
    return;
  }

  const prompt = 'Classify this task: Write a chapter about a hero. Reply in one sentence.';
  console.log(`\n  Prompt: "${prompt}"`);

  try {
    const t0 = Date.now();
    const response = await provider.generateText(prompt, { maxTokens: 256, timeout: 90_000 });
    const latency = Date.now() - t0;

    ok('Odgovor primljen', `${latency} ms`);
    console.log(`\n  Odgovor:\n  ${response.trim().split('\n').join('\n  ')}`);
    console.log(`\n  Latencija: ${latency} ms`);
  } catch (e: unknown) {
    fail('generateText bacilo grešku', String(e));
  }
}

// ─── 3. WORKER PROVIDER TEST (Anthropic backward compat) ─────────────────────

async function workerTest(): Promise<void> {
  section('TEST 3 — createWorkerProvider  (WORKER_PROVIDER=anthropic, backward compat)');

  process.env.WORKER_PROVIDER = 'anthropic';
  process.env.WORKER_MODEL    = process.env.WORKER_MODEL ?? 'claude-sonnet-4-6';

  console.log(`  WORKER_PROVIDER   = ${process.env.WORKER_PROVIDER}`);
  console.log(`  WORKER_MODEL      = ${process.env.WORKER_MODEL}`);

  const { createWorkerProvider } = await import('../src/services/ai.factory.js');

  let provider;
  try {
    provider = await createWorkerProvider();
    ok('Provider kreiran', provider.getProviderName());
  } catch (e: unknown) {
    fail('createWorkerProvider bacilo grešku', String(e));
    return;
  }

  const prompt = 'Reply with exactly: "Worker OK"';
  console.log(`\n  Prompt: "${prompt}"`);

  try {
    const t0 = Date.now();
    const response = await provider.generateText(prompt, { maxTokens: 32 });
    const latency = Date.now() - t0;

    ok('Odgovor primljen', `${latency} ms`);
    console.log(`\n  Odgovor: "${response.trim()}"`);
    console.log(`  Latencija: ${latency} ms`);
  } catch (e: unknown) {
    fail('generateText bacilo grešku', String(e));
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Story Architect — Faza 3 — Ollama konekcija test           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const pingOk = await pingTest();

  if (!pingOk) {
    console.log('\n⚠  HPE #1 nedostupan ili qwen3:30b-a3b nije učitan.');
    console.log('   Preskačem AI Factory testove.\n');
    process.exit(1);
  }

  await managerTest();
  await workerTest();

  console.log('\n' + '═'.repeat(62) + '\n');
}

main().catch(e => {
  console.error('\n[FATAL]', e);
  process.exit(1);
});
