import type { BlogAgentState } from './blog.state.js';
import { createBlogManagerProvider } from './blog.factory.js';
import type { AIGenerationOptions } from '../../ai.service.js';

function extractJson(raw: string): string {
  // Strip Qwen thinking blocks
  const withoutThinking = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Strip markdown code fences
  const withoutFences = withoutThinking.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
  // Extract first JSON object
  const match = withoutFences.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in model response');
  return match[0];
}

export async function editorInChiefNode(
  state: BlogAgentState
): Promise<Partial<BlogAgentState>> {
  console.log('[EDITOR_IN_CHIEF] Starting for topic:', state.topic);

  try {
    const provider = await createBlogManagerProvider();
    const options: AIGenerationOptions = {
      temperature: 0.7,
      maxTokens: 4000,
      timeout: 60000,
    };

    const prompt = `You are an Editor-in-Chief planning a blog article research strategy.

Given a topic and target audience, create a research plan with:
1. A primary SEO keyword (1-3 words) that captures the article's main focus
2. Exactly 3 research angles — distinct perspectives that together will cover the topic comprehensively

Each angle should be specific enough for a researcher to investigate independently, but together they should cover the topic from different viewpoints (e.g., technical, practical, industry trends).

Respond in JSON only, no markdown, no explanation:
{"keyword": "...", "angles": ["angle 1 description", "angle 2 description", "angle 3 description"]}

Topic: ${state.topic}
Target audience: ${state.audience || 'general readers'}`;

    const raw = await provider.generateText(prompt, options);
    console.log('[EDITOR_IN_CHIEF] Raw response:', raw.substring(0, 300));

    const jsonStr = extractJson(raw);
    const parsed = JSON.parse(jsonStr) as { keyword: string; angles: string[] };

    if (!parsed.keyword || !Array.isArray(parsed.angles) || parsed.angles.length !== 3) {
      throw new Error(`Invalid research plan structure: ${jsonStr}`);
    }

    console.log('[EDITOR_IN_CHIEF] Plan generated:', parsed.keyword, parsed.angles.length, 'angles');

    return {
      researchPlan: parsed,
      currentPhase: 'researching',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[EDITOR_IN_CHIEF] Error:', msg);
    return {
      error: msg,
      currentPhase: 'failed',
    };
  }
}
