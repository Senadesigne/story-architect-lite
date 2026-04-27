import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  retrieveContextNode,
  transformQueryNode,
  routeTaskNode,
  handleSimpleRetrievalNode,
  managerContextNode,
  workerGenerationNode,
  critiqueDraftNode,
  refineDraftNode,
  modifyTextNode,
  finalOutputNode,
  humanizationNode,
} from './nodes.js'
import type { AgentState } from './state.js'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../ai.factory.js', () => ({
  createPreferredAIProvider: vi.fn(),
  createManagerProvider: vi.fn(),
  createWorkerProvider: vi.fn(),
}))

vi.mock('../ai.retriever.js', () => ({
  getRelevantContext: vi.fn(),
}))

vi.mock('../planner.prompts.js', () => ({
  getPlannerSystemPrompt: vi.fn(() => 'Planner system prompt'),
}))

import {
  createPreferredAIProvider,
  createManagerProvider,
  createWorkerProvider,
} from '../../ai.factory.js'
import { getRelevantContext } from '../ai.retriever.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    userInput: 'test input',
    storyContext: 'test story context',
    draftCount: 0,
    messages: [],
    ...overrides,
  }
}

function mockProvider(response: string) {
  return { generateText: vi.fn().mockResolvedValue(response) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── retrieveContextNode ──────────────────────────────────────────────────────

describe('retrieveContextNode', () => {
  it('prefers transformedQuery over userInput when calling retriever', async () => {
    vi.mocked(getRelevantContext).mockResolvedValue('RAG result')
    const result = await retrieveContextNode(
      makeState({ transformedQuery: 'transformed q', userInput: 'original' })
    )
    expect(getRelevantContext).toHaveBeenCalledWith('transformed q', 5)
    expect(result.ragContext).toBe('RAG result')
  })

  it('falls back to userInput when transformedQuery is absent', async () => {
    vi.mocked(getRelevantContext).mockResolvedValue('RAG result')
    await retrieveContextNode(makeState({ userInput: 'original query' }))
    expect(getRelevantContext).toHaveBeenCalledWith('original query', 5)
  })

  it('returns error message without calling retriever when both queries are empty', async () => {
    const result = await retrieveContextNode(makeState({ userInput: '', transformedQuery: '' }))
    expect(getRelevantContext).not.toHaveBeenCalled()
    expect(result.ragContext).toContain('Greška')
  })

  it('returns error message when retriever throws', async () => {
    vi.mocked(getRelevantContext).mockRejectedValue(new Error('DB error'))
    const result = await retrieveContextNode(makeState({ userInput: 'query' }))
    expect(result.ragContext).toContain('Greška')
  })
})

// ─── transformQueryNode ───────────────────────────────────────────────────────

describe('transformQueryNode', () => {
  it('returns empty transformedQuery without calling AI when userInput is empty', async () => {
    const result = await transformQueryNode(makeState({ userInput: '' }))
    expect(result.transformedQuery).toBe('')
    expect(createPreferredAIProvider).not.toHaveBeenCalled()
  })

  it('returns trimmed AI response as transformedQuery', async () => {
    vi.mocked(createPreferredAIProvider).mockResolvedValue(mockProvider('  query1\nquery2  ') as any)
    const result = await transformQueryNode(makeState({ userInput: 'write a scene' }))
    expect(result.transformedQuery).toBe('query1\nquery2')
  })

  it('falls back to original userInput when AI throws', async () => {
    vi.mocked(createPreferredAIProvider).mockRejectedValue(new Error('API error'))
    const result = await transformQueryNode(makeState({ userInput: 'original query' }))
    expect(result.transformedQuery).toBe('original query')
  })
})

// ─── routeTaskNode ────────────────────────────────────────────────────────────

describe('routeTaskNode', () => {
  it('routes writer mode to creative_generation without calling AI', async () => {
    const result = await routeTaskNode(makeState({ mode: 'writer', userInput: 'write' }))
    expect(result.routingDecision).toBe('creative_generation')
    expect(createPreferredAIProvider).not.toHaveBeenCalled()
  })

  it('routes brainstorming mode to creative_generation without calling AI', async () => {
    const result = await routeTaskNode(makeState({ mode: 'brainstorming', userInput: 'ideas' }))
    expect(result.routingDecision).toBe('creative_generation')
    expect(createPreferredAIProvider).not.toHaveBeenCalled()
  })

  it('routes contextual-edit mode to creative_generation without calling AI', async () => {
    const result = await routeTaskNode(makeState({ mode: 'contextual-edit', userInput: 'edit' }))
    expect(result.routingDecision).toBe('creative_generation')
    expect(createPreferredAIProvider).not.toHaveBeenCalled()
  })

  it('returns cannot_answer immediately when userInput is empty', async () => {
    const result = await routeTaskNode(makeState({ userInput: '' }))
    expect(result.routingDecision).toBe('cannot_answer')
    expect(createPreferredAIProvider).not.toHaveBeenCalled()
  })

  it('classifies as simple_retrieval from AI response containing "simple"', async () => {
    vi.mocked(createPreferredAIProvider).mockResolvedValue(mockProvider('simple_retrieval') as any)
    const result = await routeTaskNode(makeState({ userInput: 'Who is Ana?' }))
    expect(result.routingDecision).toBe('simple_retrieval')
  })

  it('classifies as creative_generation from AI response containing "creative"', async () => {
    vi.mocked(createPreferredAIProvider).mockResolvedValue(mockProvider('creative_generation') as any)
    const result = await routeTaskNode(makeState({ userInput: 'Write a scene' }))
    expect(result.routingDecision).toBe('creative_generation')
  })

  it('classifies as text_modification from AI response containing "modification"', async () => {
    vi.mocked(createPreferredAIProvider).mockResolvedValue(mockProvider('text_modification') as any)
    const result = await routeTaskNode(makeState({ userInput: 'Shorten this' }))
    expect(result.routingDecision).toBe('text_modification')
  })

  it('defaults to creative_generation for unknown AI response', async () => {
    vi.mocked(createPreferredAIProvider).mockResolvedValue(mockProvider('something_unknown') as any)
    const result = await routeTaskNode(makeState({ userInput: 'do something' }))
    expect(result.routingDecision).toBe('creative_generation')
  })

  it('falls back to creative_generation on AI error', async () => {
    vi.mocked(createPreferredAIProvider).mockRejectedValue(new Error('timeout'))
    const result = await routeTaskNode(makeState({ userInput: 'something' }))
    expect(result.routingDecision).toBe('creative_generation')
  })
})

// ─── handleSimpleRetrievalNode ────────────────────────────────────────────────

describe('handleSimpleRetrievalNode', () => {
  it('returns trimmed AI answer as finalOutput', async () => {
    vi.mocked(createPreferredAIProvider).mockResolvedValue(mockProvider('  The answer  ') as any)
    const result = await handleSimpleRetrievalNode(
      makeState({ ragContext: 'some context', userInput: 'Who is Ana?' })
    )
    expect(result.finalOutput).toBe('The answer')
  })

  it('returns error message when AI throws', async () => {
    vi.mocked(createPreferredAIProvider).mockRejectedValue(new Error('Timeout'))
    const result = await handleSimpleRetrievalNode(makeState({ userInput: 'question' }))
    expect(result.finalOutput).toContain('Greška')
  })
})

// ─── managerContextNode ───────────────────────────────────────────────────────

describe('managerContextNode', () => {
  it('processes brainstorming mode and strips "Evo:" prefix from response', async () => {
    vi.mocked(createManagerProvider).mockResolvedValue(
      mockProvider('Evo prompta: Write a creative story') as any
    )
    const result = await managerContextNode(
      makeState({ mode: 'brainstorming', userInput: 'brainstorm' })
    )
    expect(result.workerPrompt).toBe('Write a creative story')
    expect(result.managerAnalysis).toBe('Brainstorming context analyzed.')
  })

  it('processes writer mode with editorContent', async () => {
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider('Writer instructions') as any)
    const result = await managerContextNode(
      makeState({ mode: 'writer', userInput: 'write a scene', editorContent: 'existing text' })
    )
    expect(result.workerPrompt).toBe('Writer instructions')
    expect(result.managerAnalysis).toBe('Writer context analyzed.')
  })

  it('processes contextual-edit mode with selection', async () => {
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider('Edit instructions') as any)
    const result = await managerContextNode(
      makeState({ mode: 'contextual-edit', userInput: 'improve', selection: 'the selected text' })
    )
    expect(result.workerPrompt).toBe('Edit instructions')
    expect(result.managerAnalysis).toBe('Contextual Edit prepared.')
  })

  it('processes default planner mode using getPlannerSystemPrompt', async () => {
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider('Planner instructions') as any)
    const result = await managerContextNode(
      makeState({ userInput: 'plan something', ragContext: 'some context' })
    )
    expect(result.workerPrompt).toBe('Planner instructions')
    expect(result.managerAnalysis).toBe('Planner context analyzed.')
  })

  it('falls back to userInput as workerPrompt when AI throws', async () => {
    vi.mocked(createManagerProvider).mockRejectedValue(new Error('AI failure'))
    const result = await managerContextNode(makeState({ mode: 'writer', userInput: 'write something' }))
    expect(result.workerPrompt).toBe('write something')
    expect(result.managerAnalysis).toContain('Error')
  })
})

// ─── workerGenerationNode ─────────────────────────────────────────────────────

describe('workerGenerationNode', () => {
  it('returns plain text as draft and finalOutput', async () => {
    vi.mocked(createWorkerProvider).mockResolvedValue(mockProvider('  Plain text response  ') as any)
    const result = await workerGenerationNode(makeState({ workerPrompt: 'generate text' }))
    expect(result.finalOutput).toBe('Plain text response')
    expect(result.draft).toBe('Plain text response')
    expect(result.draftCount).toBe(1)
  })

  it('extracts replacement string from JSON response', async () => {
    vi.mocked(createWorkerProvider).mockResolvedValue(
      mockProvider('{"replacement": "The new text"}') as any
    )
    const result = await workerGenerationNode(makeState({ workerPrompt: 'rewrite selection' }))
    expect(result.finalOutput).toBe('The new text')
    expect(result.draft).toBe('The new text')
  })

  it('returns full JSON string when valid JSON has no replacement field', async () => {
    vi.mocked(createWorkerProvider).mockResolvedValue(
      mockProvider('{"other_field": "value"}') as any
    )
    const result = await workerGenerationNode(makeState({ workerPrompt: 'generate' }))
    expect(result.finalOutput).toBe('{"other_field": "value"}')
  })

  it('returns empty string as fail-safe when JSON is malformed (has braces but invalid)', async () => {
    vi.mocked(createWorkerProvider).mockResolvedValue(mockProvider('{malformed json}') as any)
    const result = await workerGenerationNode(makeState({ workerPrompt: 'generate' }))
    expect(result.finalOutput).toBe('')
    expect(result.draft).toBe('')
  })

  it('uses userInput as prompt when workerPrompt is absent', async () => {
    const provider = mockProvider('Generated text')
    vi.mocked(createWorkerProvider).mockResolvedValue(provider as any)
    await workerGenerationNode(makeState({ userInput: 'fallback prompt' }))
    expect(provider.generateText).toHaveBeenCalledWith('fallback prompt', expect.any(Object))
  })

  it('returns error message in draft and no finalOutput when AI throws', async () => {
    vi.mocked(createWorkerProvider).mockRejectedValue(new Error('Timeout'))
    const result = await workerGenerationNode(makeState({ workerPrompt: 'generate' }))
    expect(result.draft).toContain('Greška')
    expect(result.finalOutput).toBeUndefined()
  })
})

// ─── critiqueDraftNode ────────────────────────────────────────────────────────

describe('critiqueDraftNode', () => {
  it('returns stop:true critique and increments draftCount when draft is absent', async () => {
    const result = await critiqueDraftNode(makeState({ draftCount: 0 }))
    const critique = JSON.parse(result.critique!)
    expect(critique.stop).toBe(true)
    expect(result.draftCount).toBe(1)
  })

  it('returns valid JSON critique from AI and increments draftCount', async () => {
    const critiqueJson = JSON.stringify({ issues: [], score: 90, stop: true })
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider(critiqueJson) as any)
    const result = await critiqueDraftNode(makeState({ draftCount: 0, draft: 'Some draft text' }))
    expect(JSON.parse(result.critique!).score).toBe(90)
    expect(result.draftCount).toBe(1)
  })

  it('wraps invalid AI output in fallback JSON with score 50', async () => {
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider('not valid json!') as any)
    const result = await critiqueDraftNode(makeState({ draftCount: 0, draft: 'Some draft' }))
    const critique = JSON.parse(result.critique!)
    expect(critique.issues).toContain('AI output invalid JSON')
    expect(critique.score).toBe(50)
    expect(result.draftCount).toBe(1)
  })

  it('returns stop:true error critique and increments draftCount on AI failure', async () => {
    vi.mocked(createManagerProvider).mockRejectedValue(new Error('AI error'))
    const result = await critiqueDraftNode(makeState({ draftCount: 1, draft: 'Some draft' }))
    const critique = JSON.parse(result.critique!)
    expect(critique.stop).toBe(true)
    expect(result.draftCount).toBe(2)
  })
})

// ─── refineDraftNode ──────────────────────────────────────────────────────────

describe('refineDraftNode', () => {
  it('returns undefined draft without calling AI when no draft exists', async () => {
    const result = await refineDraftNode(makeState())
    expect(result.draft).toBeUndefined()
    expect(createWorkerProvider).not.toHaveBeenCalled()
  })

  it('returns original draft without calling AI when critique is absent', async () => {
    const result = await refineDraftNode(makeState({ draft: 'original draft' }))
    expect(result.draft).toBe('original draft')
    expect(createWorkerProvider).not.toHaveBeenCalled()
  })

  it('returns trimmed refined draft from AI', async () => {
    vi.mocked(createWorkerProvider).mockResolvedValue(mockProvider('  Refined text  ') as any)
    const result = await refineDraftNode(
      makeState({ draft: 'original', critique: '{"issues": ["too short"]}' })
    )
    expect(result.draft).toBe('Refined text')
  })

  it('returns original draft when AI throws', async () => {
    vi.mocked(createWorkerProvider).mockRejectedValue(new Error('AI error'))
    const result = await refineDraftNode(
      makeState({ draft: 'original', critique: '{"issues": []}' })
    )
    expect(result.draft).toBe('original')
  })
})

// ─── modifyTextNode ───────────────────────────────────────────────────────────

describe('modifyTextNode', () => {
  it('returns trimmed modified text in both draft and finalOutput', async () => {
    vi.mocked(createWorkerProvider).mockResolvedValue(mockProvider('  Modified text  ') as any)
    const result = await modifyTextNode(makeState({ userInput: 'make it shorter' }))
    expect(result.draft).toBe('Modified text')
    expect(result.finalOutput).toBe('Modified text')
  })

  it('returns error message in draft when AI throws', async () => {
    vi.mocked(createWorkerProvider).mockRejectedValue(new Error('Error'))
    const result = await modifyTextNode(makeState({ userInput: 'modify' }))
    expect(result.draft).toContain('Greška')
  })
})

// ─── finalOutputNode ──────────────────────────────────────────────────────────

describe('finalOutputNode', () => {
  it('returns draft as finalOutput', async () => {
    const result = await finalOutputNode(makeState({ draft: 'The final text' }))
    expect(result.finalOutput).toBe('The final text')
  })

  it('returns undefined finalOutput when draft is absent', async () => {
    const result = await finalOutputNode(makeState())
    expect(result.finalOutput).toBeUndefined()
  })
})

// ─── humanizationNode ─────────────────────────────────────────────────────────

describe('humanizationNode', () => {
  it('returns {} when humanizationEnabled is false', async () => {
    const result = await humanizationNode(makeState({ humanizationEnabled: false, draft: 'Some text' }))
    expect(result).toEqual({})
  })

  it('returns {} when humanizationEnabled is undefined', async () => {
    const result = await humanizationNode(makeState({ draft: 'Some text' }))
    expect(result).toEqual({})
  })

  it('returns {} when draft is empty', async () => {
    const result = await humanizationNode(makeState({ humanizationEnabled: true, draft: '' }))
    expect(result).toEqual({})
  })

  it('returns {} when draft is absent', async () => {
    const result = await humanizationNode(makeState({ humanizationEnabled: true }))
    expect(result).toEqual({})
  })

  it('returns humanized draft when manager returns valid text', async () => {
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider('Humanized text') as any)
    const result = await humanizationNode(makeState({ humanizationEnabled: true, draft: 'Original text' }))
    expect(result.draft).toBe('Humanized text')
  })

  it('trims whitespace from manager output', async () => {
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider('  Trimmed output  ') as any)
    const result = await humanizationNode(makeState({ humanizationEnabled: true, draft: 'Original text' }))
    expect(result.draft).toBe('Trimmed output')
  })

  it('returns {} when manager output is too short (< 10 chars)', async () => {
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider('Hi') as any)
    const result = await humanizationNode(makeState({ humanizationEnabled: true, draft: 'Original text here' }))
    expect(result).toEqual({})
  })

  it('returns {} when manager output exceeds 1.5x original length', async () => {
    const original = 'A'.repeat(100)
    const tooLong = 'B'.repeat(160)
    vi.mocked(createManagerProvider).mockResolvedValue(mockProvider(tooLong) as any)
    const result = await humanizationNode(makeState({ humanizationEnabled: true, draft: original }))
    expect(result).toEqual({})
  })

  it('returns {} (fail-safe) when manager throws', async () => {
    vi.mocked(createManagerProvider).mockRejectedValue(new Error('Ollama down'))
    const result = await humanizationNode(makeState({ humanizationEnabled: true, draft: 'Original text' }))
    expect(result).toEqual({})
  })

  it('passes styleFingerprint to buildHumanizationPrompt when provided', async () => {
    const mockGen = vi.fn().mockResolvedValue('Humanized with style applied here now')
    vi.mocked(createManagerProvider).mockResolvedValue({ generateText: mockGen } as any)
    const fingerprint = {
      avgSentenceLength: 12,
      tone: { formal: 0.7, casual: 0.2, poetic: 0.1 },
      signaturePhrases: ['naime', 'međutim'],
      sentencePatterns: 'kratke rečenice s inverzijom',
      vocabularyLevel: 'moderate' as const,
    }
    const longDraft = 'Original draft text that is long enough to pass the guard check easily.'
    const result = await humanizationNode(makeState({ humanizationEnabled: true, draft: longDraft, styleFingerprint: fingerprint }))
    expect(result.draft).toBe('Humanized with style applied here now')
    const calledPrompt: string = mockGen.mock.calls[0][0]
    expect(calledPrompt).toContain('naime')
  })
})
