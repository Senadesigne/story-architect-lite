export interface BlogAgentState {
  // Input
  articleId: string;
  topic: string;
  audience: string;

  // Editor-in-Chief output
  researchPlan: {
    keyword: string;
    angles: string[];
  } | null;

  // Researcher outputs (3 dossiera)
  dossiers: Array<{
    angle: string;
    queries: string[];
    sources: Array<{ url: string; title: string; excerpt: string }>;
    content: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    error?: string;
  }>;

  // Writer output
  researchBrief: string | null;
  articleContent: string | null;
  metaTitle: string | null;
  metaDescription: string | null;

  // Citation Agent output
  citationReport: {
    claims: Array<{
      claim: string;
      status: 'verified' | 'unverified';
      sourceUrl?: string;
    }>;
  } | null;

  // Pipeline control
  currentPhase: 'planning' | 'researching' | 'writing' | 'reviewing' | 'done' | 'failed';
  error: string | null;
}
