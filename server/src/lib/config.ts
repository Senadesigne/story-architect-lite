export function getAIConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Ovo je ključno za sigurnost i konfiguraciju
    throw new Error(
      'AI configuration error: ANTHROPIC_API_KEY is not set in .env file.',
    );
  }

  // Vraćamo objekt radi lakšeg proširenja u budućnosti
  return {
    anthropicApiKey: apiKey,
  };
}
