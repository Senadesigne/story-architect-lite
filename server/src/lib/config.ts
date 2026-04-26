export function getAIConfig() {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL;

  if (!anthropicApiKey && !openaiApiKey && !ollamaUrl) {
    throw new Error(
      'AI configuration error: Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_BASE_URL.',
    );
  }

  return {
    anthropicApiKey,
    openaiApiKey,
    ollamaUrl,
  };
}
