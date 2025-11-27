export function getAIConfig() {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!anthropicApiKey && !openaiApiKey) {
    // Bacamo grešku samo ako NITI JEDAN ključ nije postavljen
    throw new Error(
      'AI configuration error: Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set in .env file.',
    );
  }

  // Vraćamo objekt s oba ključa (mogu biti undefined)
  return {
    anthropicApiKey,
    openaiApiKey,
  };
}
