import { describe, it, expect, vi } from 'vitest'
import { END } from '@langchain/langgraph'
import { routingCondition, workerGenerationCondition, reflectionCondition } from './graph.js'
import { MAX_DRAFT_ITERATIONS } from './state.js'
import type { AgentState } from './state.js'

// Mock transitive AI dependencies so module resolution doesn't
// try to open DB connections or reach AI APIs during import.
vi.mock('../../ai.factory.js', () => ({
  createPreferredAIProvider: vi.fn(),
  createManagerProvider: vi.fn(),
  createWorkerProvider: vi.fn(),
}))

vi.mock('../ai.retriever.js', () => ({
  getRelevantContext: vi.fn(),
}))

vi.mock('../planner.prompts.js', () => ({
  getPlannerSystemPrompt: vi.fn(() => 'Mock system prompt'),
}))

function makeState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    userInput: 'test input',
    storyContext: 'test story context',
    draftCount: 0,
    messages: [],
    ...overrides,
  }
}

// ─── routingCondition ────────────────────────────────────────────────────────

describe('routingCondition', () => {
  it('simple_retrieval → handle_simple_retrieval', () => {
    expect(routingCondition(makeState({ routingDecision: 'simple_retrieval' }))).toBe('handle_simple_retrieval')
  })

  it('creative_generation → creative_generation', () => {
    expect(routingCondition(makeState({ routingDecision: 'creative_generation' }))).toBe('creative_generation')
  })

  it('text_modification → modify_text', () => {
    expect(routingCondition(makeState({ routingDecision: 'text_modification' }))).toBe('modify_text')
  })

  it('cannot_answer → END', () => {
    expect(routingCondition(makeState({ routingDecision: 'cannot_answer' }))).toBe(END)
  })

  it('undefined routingDecision → END (default branch)', () => {
    expect(routingCondition(makeState({ routingDecision: undefined }))).toBe(END)
  })
})

// ─── workerGenerationCondition ───────────────────────────────────────────────

describe('workerGenerationCondition', () => {
  it('brainstorming mode → final_output (skips critique)', () => {
    expect(workerGenerationCondition(makeState({ mode: 'brainstorming' }))).toBe('final_output')
  })

  it('writer mode → critique_draft', () => {
    expect(workerGenerationCondition(makeState({ mode: 'writer' }))).toBe('critique_draft')
  })

  it('planner mode → critique_draft', () => {
    expect(workerGenerationCondition(makeState({ mode: 'planner' }))).toBe('critique_draft')
  })

  it('contextual-edit mode → critique_draft', () => {
    expect(workerGenerationCondition(makeState({ mode: 'contextual-edit' }))).toBe('critique_draft')
  })

  it('undefined mode → critique_draft', () => {
    expect(workerGenerationCondition(makeState({ mode: undefined }))).toBe('critique_draft')
  })
})

// ─── reflectionCondition ─────────────────────────────────────────────────────

describe('reflectionCondition', () => {
  it('stops when draftCount reaches MAX_DRAFT_ITERATIONS', () => {
    expect(reflectionCondition(makeState({ draftCount: MAX_DRAFT_ITERATIONS }))).toBe('final_output')
  })

  it('stops when draftCount exceeds maximum', () => {
    expect(reflectionCondition(makeState({ draftCount: MAX_DRAFT_ITERATIONS + 2 }))).toBe('final_output')
  })

  it('stops when critique.stop is true', () => {
    const state = makeState({
      draftCount: 1,
      critique: JSON.stringify({ score: 92, stop: true, issues: [] }),
    })
    expect(reflectionCondition(state)).toBe('final_output')
  })

  it('continues to refine_draft when score is low and draftCount < max', () => {
    const state = makeState({
      draftCount: 1,
      critique: JSON.stringify({ score: 55, stop: false, issues: ['needs work'] }),
    })
    expect(reflectionCondition(state)).toBe('refine_draft')
  })

  it('continues to refine_draft when critique JSON is invalid', () => {
    const state = makeState({ draftCount: 1, critique: 'not-valid-json-{{' })
    expect(reflectionCondition(state)).toBe('refine_draft')
  })

  it('continues to refine_draft when no critique yet and draftCount < max', () => {
    expect(reflectionCondition(makeState({ draftCount: 1 }))).toBe('refine_draft')
  })
})
