export interface StyleFingerprint {
  avgSentenceLength: number;
  tone: { formal: number; casual: number; poetic: number };
  signaturePhrases: string[];
  sentencePatterns: string;
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated';
}

export const FORBIDDEN_PHRASES = [
  "delve into", "it's worth noting", "it's important to",
  "in the realm of", "harness the power of", "revolutionize",
  "in conclusion", "to summarize", "at the end of the day",
  "comprehensive", "cutting-edge", "game-changing",
  "seamlessly", "transformative", "paradigm shift",
  "dive deep", "unpack", "nuanced",
] as const;

export const HUMANIZATION_RULES = `
ZABRANJENO (ukloni ili zamijeni):
- Em-dashovi (—) kao separatori → koristi zareze ili prestrukturiraj rečenicu
- Fraze: ${FORBIDDEN_PHRASES.join(", ")}
- Tri ili više uzastopnih rečenica koje počinju istom riječju
- Uniformna duljina rečenica (sve ~20 riječi)

OBAVEZNO:
- Miješaj kratke (5-8 riječi) i duge (15-25 riječi) rečenice
- Aktivni glas gdje god je moguće
- Sačuvaj SVE informacije i smisao originala
- Vrati SAMO prepisani tekst, bez objašnjenja ili komentara
`;

export function buildHumanizationPrompt(
  text: string,
  styleFingerprint?: StyleFingerprint | null,
  audienceHint?: string | null
): string {
  const styleSection = styleFingerprint ? buildStyleSection(styleFingerprint) : '';
  const audienceSection = audienceHint
    ? `\nPUBLIKA: ${audienceHint} — prilagodi ton i vokabular.`
    : '';

  return `Ti si urednik koji prepisuje tekst da zvuči prirodno i ljudski.
${HUMANIZATION_RULES}
${audienceSection}
${styleSection}
TEKST ZA PREPIS:
${text}`;
}

function buildStyleSection(fp: StyleFingerprint): string {
  return `
STIL AUTORA (pokušaj oponašati):
- Prosječna duljina rečenice: ~${fp.avgSentenceLength} riječi
- Ton: formal=${(fp.tone.formal * 100).toFixed(0)}%, casual=${(fp.tone.casual * 100).toFixed(0)}%, poetski=${(fp.tone.poetic * 100).toFixed(0)}%
- Vokabular: ${fp.vocabularyLevel}
- Karakteristične fraze koje MOŽEŠ koristiti: ${fp.signaturePhrases.slice(0, 3).join(', ')}
- Uzorak rečenica: ${fp.sentencePatterns}
`;
}

export function buildStyleAnalysisPrompt(samples: string[]): string {
  return `Analiziraj sljedeće uzorke pisanja i ekstrahiraj karakteristike stila.

${samples.map((s, i) => `Uzorak ${i + 1}:\n${s}`).join('\n\n---\n\n')}

Vrati SAMO JSON (bez teksta prije ili poslije):
{
  "avgSentenceLength": <prosječan broj riječi po rečenici>,
  "tone": { "formal": <0-1>, "casual": <0-1>, "poetic": <0-1> },
  "signaturePhrases": ["<fraza1>", "<fraza2>", "<fraza3>"],
  "sentencePatterns": "<kratki opis tipičnih obrazaca rečenica>",
  "vocabularyLevel": "<simple|moderate|sophisticated>"
}`;
}
