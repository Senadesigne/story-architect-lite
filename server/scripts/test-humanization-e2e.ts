/**
 * Faza 5 — E2E test humanizacijskog noda s pravim Qwenom (HPE #1)
 *
 * Pokretanje:  tsx scripts/test-humanization-e2e.ts
 * (iz server/ direktorija, .env se automatski učitava)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

// ─── helpers ──────────────────────────────────────────────────────────────────

function pass(label: string, detail?: string) {
  console.log(`  ✓ PASS  ${label}${detail ? `  — ${detail}` : ''}`);
}
function fail(label: string, detail?: string) {
  console.log(`  ✗ FAIL  ${label}${detail ? `  — ${detail}` : ''}`);
}
function section(title: string) {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(64));
}

// ─── tekst koji ide na humanizaciju ───────────────────────────────────────────

const ORIGINAL = `It's worth noting that the abandoned house stood as a testament to \
the passage of time. The protagonist delved into the mysterious \
corridors, harnessing her courage to face the unknown. The \
comprehensive exploration of the premises revealed a transformative \
discovery — one that would revolutionize her understanding of the \
past. At the end of the day, the journey proved to be a \
game-changing experience that seamlessly connected all the pieces \
of the puzzle.`;

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   Story Architect — Faza 5 — Humanization E2E test (HPE #1)     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  // ── env ───────────────────────────────────────────────────────────────────
  process.env.MANAGER_PROVIDER = 'ollama';
  process.env.MANAGER_MODEL    = 'qwen3:30b-a3b';

  section('CONFIG');
  console.log(`  MANAGER_PROVIDER  = ${process.env.MANAGER_PROVIDER}`);
  console.log(`  MANAGER_MODEL     = ${process.env.MANAGER_MODEL}`);
  console.log(`  OLLAMA_BASE_URL   = ${process.env.OLLAMA_BASE_URL ?? 'http://192.168.10.197:11434 (default)'}`);

  // ── import ────────────────────────────────────────────────────────────────
  const { createManagerProvider } = await import('../src/services/ai.factory.js');
  const { buildHumanizationPrompt, FORBIDDEN_PHRASES } =
    await import('../src/services/ai/prompts/humanization.prompt.js');

  // ── provider ──────────────────────────────────────────────────────────────
  section('PROVIDER');
  let provider: Awaited<ReturnType<typeof createManagerProvider>>;
  try {
    provider = await createManagerProvider();
    console.log(`  Provider: ${provider.getProviderName()}`);
  } catch (e) {
    console.log(`  ✗ createManagerProvider greška: ${e}`);
    process.exit(1);
  }

  // ── originalni tekst ──────────────────────────────────────────────────────
  section('ORIGINAL TEKST');
  console.log(`\n  ${ORIGINAL.split('\n').join('\n  ')}`);
  console.log(`\n  Duljina: ${ORIGINAL.length} znakova`);

  // ── humanizacija ──────────────────────────────────────────────────────────
  section('HUMANIZACIJA  (Qwen poziv, može trajati 15-45s)');
  const prompt = buildHumanizationPrompt(ORIGINAL, null, null);

  const t0 = Date.now();
  let humanized: string;
  try {
    humanized = await provider.generateText(prompt, {
      temperature: parseFloat(process.env.HUMANIZATION_TEMPERATURE ?? '0.65'),
      maxTokens: 3000,
      timeout: 90_000,
    });
  } catch (e) {
    console.log(`  ✗ generateText greška: ${e}`);
    process.exit(1);
  }
  const latencyMs = Date.now() - t0;
  const trimmed = humanized.trim();

  section('HUMANIZIRANI TEKST');
  console.log(`\n  ${trimmed.split('\n').join('\n  ')}`);
  console.log(`\n  Duljina: ${trimmed.length} znakova`);

  // ── provjere ──────────────────────────────────────────────────────────────
  section('PROVJERE');

  // a) FORBIDDEN_PHRASES
  const foundPhrases = (FORBIDDEN_PHRASES as readonly string[]).filter(phrase =>
    trimmed.toLowerCase().includes(phrase.toLowerCase())
  );
  if (foundPhrases.length === 0) {
    pass('Nema zabranjenih AI fraza');
  } else {
    fail('Zabranjene fraze pronađene', foundPhrases.join(', '));
  }

  // b) output nije prazan
  if (trimmed.length > 10) {
    pass('Output nije prazan', `${trimmed.length} znakova`);
  } else {
    fail('Output je prazan ili prekratak');
  }

  // c) output nije duži od 1.5x originala
  const maxAllowed = ORIGINAL.length * 1.5;
  if (trimmed.length <= maxAllowed) {
    pass(`Output unutar 1.5x limita`, `${trimmed.length} ≤ ${Math.round(maxAllowed)}`);
  } else {
    fail(`Output prelazi 1.5x limit`, `${trimmed.length} > ${Math.round(maxAllowed)}`);
  }

  // d) latencija
  const latencyLabel = `${latencyMs} ms`;
  if (latencyMs < 60_000) {
    pass('Latencija prihvatljiva', latencyLabel);
  } else {
    fail('Latencija previsoka (>60s)', latencyLabel);
  }

  // ── sažetak ───────────────────────────────────────────────────────────────
  const allPassed = foundPhrases.length === 0 && trimmed.length > 10 && trimmed.length <= maxAllowed && latencyMs < 60_000;

  console.log('\n' + '═'.repeat(64));
  console.log(allPassed
    ? '  ✓  SVE PROVJERE PROŠLE — humanizacijski node radi ispravno.'
    : '  ✗  NEKE PROVJERE NISU PROŠLE — vidi detalje iznad.'
  );
  console.log('═'.repeat(64) + '\n');

  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error('\n[FATAL]', e);
  process.exit(1);
});
