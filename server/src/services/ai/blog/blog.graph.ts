import { StateGraph, END } from "@langchain/langgraph";
import type { StateGraphArgs } from "@langchain/langgraph";
import type { BlogAgentState } from './blog.state.js';
import { editorInChiefNode } from './blog.nodes.js';

const graphConfig: StateGraphArgs<BlogAgentState> = {
  channels: {
    articleId:        { value: (x, y) => y ?? x },
    topic:            { value: (x, y) => y ?? x },
    audience:         { value: (x, y) => y ?? x },
    researchPlan:     { value: (x, y) => (y !== undefined ? y : x), default: () => null },
    dossiers:         { value: (x, y) => y ?? x, default: () => [] },
    researchBrief:    { value: (x, y) => (y !== undefined ? y : x), default: () => null },
    articleContent:   { value: (x, y) => (y !== undefined ? y : x), default: () => null },
    metaTitle:        { value: (x, y) => (y !== undefined ? y : x), default: () => null },
    metaDescription:  { value: (x, y) => (y !== undefined ? y : x), default: () => null },
    citationReport:   { value: (x, y) => (y !== undefined ? y : x), default: () => null },
    currentPhase:     { value: (x, y) => y ?? x },
    error:            { value: (x, y) => (y !== undefined ? y : x), default: () => null },
  },
};

export function createBlogGraph() {
  const graph = new StateGraph<BlogAgentState>(graphConfig);

  graph.addNode("editor_in_chief", editorInChiefNode as any);
  graph.setEntryPoint("editor_in_chief" as any);
  graph.addEdge("editor_in_chief" as any, END);

  return graph;
}

export async function runBlogPipeline(input: {
  articleId: string;
  topic: string;
  audience: string;
}): Promise<BlogAgentState> {
  const initialState: BlogAgentState = {
    articleId: input.articleId,
    topic: input.topic,
    audience: input.audience,
    researchPlan: null,
    dossiers: [],
    researchBrief: null,
    articleContent: null,
    metaTitle: null,
    metaDescription: null,
    citationReport: null,
    currentPhase: 'planning',
    error: null,
  };

  console.log('[BLOG_GRAPH] Starting pipeline for:', input.topic);

  try {
    const compiled = createBlogGraph().compile();
    const result = await compiled.invoke(initialState) as BlogAgentState;
    console.log('[BLOG_GRAPH] Pipeline complete, phase:', result.currentPhase);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[BLOG_GRAPH] Pipeline error:', msg);
    return { ...initialState, currentPhase: 'failed', error: msg };
  }
}
