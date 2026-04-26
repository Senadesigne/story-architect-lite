import { Hono } from 'hono';
import { validateBody, getValidatedBody } from '../middleware/validation.js';
import {
  requireValidUUID,
  requireProjectOwnership,
  handleDatabaseOperation
} from '../middleware/errorHandler.js';
import { getDatabase } from '../lib/db.js';
import { getDatabaseUrl } from '../lib/env.js';
import { chatMessages } from '../schema/schema.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { createDefaultAIProvider } from '../services/ai.service.js';
import { ContextBuilder } from '../services/context.builder.js';
import { PromptService } from '../services/prompt.service.js';
import { getRelevantContext } from '../services/ai/ai.retriever.js';
import {
  runStoryArchitectGraph,
  createStoryArchitectGraph,
  createInitialState
} from '../services/ai/graph/graph.js';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import {
  GenerateSceneSynopsisBodySchema,
  ChatRequestBodySchema
} from '../schemas/validation.js';
import type {
  GenerateSceneSynopsisBody,
  ChatRequestBody
} from '../schemas/validation.js';

export const aiRouter = new Hono();

// POST /api/ai/test — quick AI provider smoke-test (no auth)
aiRouter.post('/ai/test', aiRateLimiter.middleware(), async (c) => {
  try {
    const aiProvider = await createDefaultAIProvider();

    const isValid = await aiProvider.validateConnection();
    if (!isValid) {
      return c.json({ error: 'AI provider connection failed. Check API key.' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const prompt = body.prompt || 'Hello, Claude!';

    const aiResponse = await aiProvider.generateText(prompt, { maxTokens: 100 });

    return c.json({ status: 'success', prompt, response: aiResponse });
  } catch (error: unknown) {
    console.error('AI /test endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ error: errorMessage }, 500);
  }
});

// GET /api/ai/test-rag — RAG smoke-test (no auth)
aiRouter.get('/ai/test-rag', async (c) => {
  try {
    const query = c.req.query('query') || 'test query';

    console.log('Testing RAG with query: [SENSITIVE]');

    const result = await getRelevantContext(query);

    return c.json({
      status: 'success',
      query,
      result,
      timestamp: new Date().toISOString(),
      message: 'RAG test completed successfully'
    });
  } catch (error) {
    console.error('RAG test endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({
      status: 'error',
      error: 'RAG test failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// GET /api/ai/test-graph — full graph smoke-test (no auth)
aiRouter.get('/ai/test-graph', async (c) => {
  try {
    const query = c.req.query('query') || 'Napiši kratku scenu gdje se glavni lik suočava s dilemom';

    console.log('Testing Graph with query: [SENSITIVE]');

    const initialState = createInitialState(query, '');

    console.log('Created initial state (sanitized):', {
      userInputLength: initialState.userInput.length,
      storyContextLength: initialState.storyContext.length,
      draftCount: initialState.draftCount
    });

    const graph = createStoryArchitectGraph();
    const compiledGraph = graph.compile();

    console.log('Graph compiled successfully, invoking...');

    const startTime = Date.now();
    const finalState = await compiledGraph.invoke(initialState);
    const executionTime = Date.now() - startTime;

    console.log('Graph execution completed in', executionTime, 'ms');

    return c.json({
      status: 'success',
      query,
      executionTime,
      timestamp: new Date().toISOString(),
      finalState,
      message: 'Graph test completed successfully'
    });
  } catch (error) {
    console.error('Graph test endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return c.json({
      status: 'error',
      error: 'Graph test failed',
      details: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// POST /api/ai/test-agent — full graph agent test
aiRouter.post('/ai/test-agent', async (c) => {
  try {
    c.get('user');
    const body = await c.req.json();
    const { userInput, storyContext } = body;

    if (!userInput) {
      return c.json({ error: 'userInput je obavezan' }, 400);
    }

    console.log('--- POKRETANJE AI AGENTA (Test) ---');

    const finalState = await runStoryArchitectGraph(
      userInput,
      storyContext || 'Nema pruženog globalnog konteksta priče.'
    );

    console.log('--- AI AGENT ZAVRŠIO (Test) ---', finalState);

    return c.json(finalState);
  } catch (error: unknown) {
    console.error('Greška u AI Agent testu:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Test Agenta nije uspio', details: errorMessage }, 500);
  }
});

// POST /api/projects/:projectId/ai/generate-scene-synopsis
aiRouter.post(
  '/projects/:projectId/ai/generate-scene-synopsis',
  aiRateLimiter.middleware(),
  validateBody(GenerateSceneSynopsisBodySchema),
  async (c) => {
    const user = c.get('user');
    const { projectId } = c.req.param();
    const { sceneId } = getValidatedBody<GenerateSceneSynopsisBody>(c);

    requireValidUUID(projectId, 'project ID');
    requireValidUUID(sceneId, 'scene ID');

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    await requireProjectOwnership(db, projectId, user.id);

    const aiProvider = await createDefaultAIProvider();

    const context = await ContextBuilder.buildSceneContext(sceneId, db, projectId);
    const prompt = PromptService.buildSceneSynopsisPrompt(context);

    const synopsis = await aiProvider.generateText(prompt, { maxTokens: 500 });

    return c.json({ status: 'success', synopsis });
  }
);

// POST /api/projects/:projectId/chat
aiRouter.post(
  '/projects/:projectId/chat',
  aiRateLimiter.middleware(),
  validateBody(ChatRequestBodySchema),
  async (c) => {
    const user = c.get('user');
    const { projectId } = c.req.param();
    const {
      userInput, plannerContext, messages, mode,
      editorContent, selection, sessionId, workerModel
    } = getValidatedBody<ChatRequestBody>(c);

    requireValidUUID(projectId, 'project ID');

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    await requireProjectOwnership(db, projectId, user.id);

    console.log('📥 Chat API poziv:', {
      projectId,
      sessionId,
      hasPlannerContext: !!plannerContext,
      plannerContext: plannerContext || 'none',
      mode: mode || 'planner (default)',
      hasMessages: !!messages,
      messagesCount: messages?.length || 0,
      userInputLength: userInput.length,
      hasEditorContent: !!editorContent,
      selectionLength: selection?.length || 0
    });

    if (sessionId) {
      await handleDatabaseOperation(async () => {
        await db.insert(chatMessages).values({
          sessionId,
          role: 'user',
          content: userInput,
          metadata: { mode },
        });
      });
    }

    const finalState = await handleDatabaseOperation(async () => {
      const projectContext = await ContextBuilder.buildProjectContext(projectId, db);
      const storyContext = ContextBuilder.formatProjectContextToString(projectContext);

      const langChainMessages = messages?.map(m =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      ) || [];

      return await runStoryArchitectGraph(
        userInput,
        storyContext,
        plannerContext,
        mode as 'planner' | 'brainstorming' | 'writer' | 'contextual-edit',
        editorContent,
        langChainMessages,
        selection,
        workerModel
      );
    });

    if (sessionId && finalState.finalOutput) {
      await handleDatabaseOperation(async () => {
        await db.insert(chatMessages).values({
          sessionId,
          role: 'assistant',
          content: finalState.finalOutput!,
          metadata: {
            mode,
            draftCount: finalState.draftCount,
            routingDecision: finalState.routingDecision
          },
        });
      });
    }

    console.log('🔄 Backend šalje finalState (iz api.ts):', finalState);
    console.log('🔍 Sadrži \'finalOutput\' polje:', finalState.hasOwnProperty('finalOutput'));
    console.log('🔍 Vrijednost \'finalOutput\' (skraćeno):', finalState.finalOutput ? finalState.finalOutput.substring(0, 100) + '...' : finalState.finalOutput);

    return c.json(finalState);
  }
);
