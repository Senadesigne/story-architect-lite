import type { AIProvider } from '../../ai.service.js';
import { OllamaProvider } from '../../providers/ollama.provider.js';
import { createManagerProvider } from '../../ai.factory.js';

export async function createBlogManagerProvider(): Promise<AIProvider> {
  const blogUrl = process.env.OLLAMA_BLOG_URL;
  const blogModel = process.env.BLOG_MANAGER_MODEL;

  if (blogUrl && blogModel) {
    console.log(`[BLOG_FACTORY] Trying HPE #2: ${blogUrl}/${blogModel}`);
    const provider = new OllamaProvider(blogUrl, blogModel);
    if (await provider.validateConnection()) return provider;
    console.warn(`[BLOG_FACTORY] HPE #2 (${blogUrl}) unreachable, falling back to HPE #1`);
  }

  const fallbackUrl = process.env.OLLAMA_BASE_URL;
  const fallbackModel = process.env.MANAGER_MODEL ?? 'qwen3:30b-a3b';

  if (fallbackUrl) {
    console.log(`[BLOG_FACTORY] Using HPE #1 fallback: ${fallbackUrl}/${fallbackModel}`);
    const provider = new OllamaProvider(fallbackUrl, fallbackModel);
    if (await provider.validateConnection()) return provider;
    throw new Error(`Blog AI: Both HPE #2 (${blogUrl}) and HPE #1 (${fallbackUrl}) are unreachable. Check Tailscale.`);
  }

  console.warn('[BLOG_FACTORY] No Ollama URLs configured, falling back to createManagerProvider()');
  return createManagerProvider();
}
