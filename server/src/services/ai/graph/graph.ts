import { StateGraph, START, END, StateGraphArgs } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { createInitialState, MAX_DRAFT_ITERATIONS } from "./state";
import type { AgentState } from "./state";
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
  finalOutputNode
} from "./nodes";

/**
 * LangGraph StateGraph inicijalizacija za Story Architect AI Orkestrator
 * 
 * Ovaj graf implementira Arhitekturu v2.0 - Stateful Multi-Agent sustav
 * koji zamjenjuje linearni lanac s cikličkim, uvjetovanim grafom.
 * 
 * Temelji se na specifikaciji iz TEHNICKI_PLAN_AI_FAZA_B_v2.md - Sekcija 6.2
 */

// Definiramo konfiguraciju za StateGraph
const graphConfig: StateGraphArgs<AgentState> = {
  channels: {
    // Ulazni podaci
    userInput: {
      value: (x, y) => y ?? x,
    },
    storyContext: {
      value: (x, y) => y ?? x,
    },
    plannerContext: {
      value: (x, y) => y ?? x,
    },
    mode: {
      value: (x, y) => y ?? x,
    },
    editorContent: {
      value: (x, y) => y ?? x,
    },
    // RAG faza
    transformedQuery: {
      value: (x, y) => y ?? x,
    },
    ragContext: {
      value: (x, y) => y ?? x,
    },
    // Routing
    routingDecision: {
      value: (x, y) => y ?? x,
    },
    // Reflection petlja
    draftCount: {
      value: (x?: number, y?: number) => (x ?? 0) + (y ?? 0),
      default: () => 0,
    },
    draft: {
      value: (x, y) => y ?? x,
    },
    critique: {
      value: (x, y) => y ?? x,
    },
    // Izlaz
    finalOutput: {
      value: (x, y) => y ?? x,
    },
    // Messages za buduću upotrebu
    messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
      default: () => [],
    },
    // Manager-Worker polja
    workerPrompt: {
      value: (x, y) => y ?? x,
    },
    managerAnalysis: {
      value: (x, y) => y ?? x,
    },
  },
};

/**
 * Kreiranje i konfiguracija StateGraph instance
 */
export function createStoryArchitectGraph() {
  // Kreiraj graf s pravilnom tipizacijom
  const graph = new StateGraph<AgentState>(graphConfig);

  // ✅ IMPLEMENTIRANI ČVOROVI (Zadatak 3.8 i 3.9):
  graph.addNode("transform_query", transformQueryNode);
  graph.addNode("retrieve_context", retrieveContextNode);
  graph.addNode("route_task", routeTaskNode);
  graph.addNode("handle_simple_retrieval", handleSimpleRetrievalNode);

  // ✅ MANAGER-WORKER ČVOROVI (V2 Arhitektura):
  graph.addNode("manager_context_node", managerContextNode);
  graph.addNode("worker_generation_node", workerGenerationNode);

  // ✅ REFLECTION ČVOROVI (Zadatak 3.10):
  graph.addNode("critique_draft", critiqueDraftNode);
  graph.addNode("refine_draft", refineDraftNode);

  // ✅ TEXT MODIFICATION ČVOR:
  graph.addNode("modify_text", modifyTextNode);

  // ✅ FINALIZACIJA ČVOR:
  graph.addNode("final_output", finalOutputNode);

  // ✅ POSTAVLJANJE ULAZNE TOČKE:
  graph.setEntryPoint("transform_query" as any);

  // ✅ LINEARNI EDGE-OVI (Zadatak 3.8 i 3.9):
  graph.addEdge("transform_query" as any, "retrieve_context" as any);
  graph.addEdge("retrieve_context" as any, "route_task" as any); // Povezuje RAG fazu s usmjeravanjem
  graph.addEdge("handle_simple_retrieval" as any, END); // Završava tijek za jednostavne upite

  // ✅ MANAGER-WORKER FLOW:
  // Manager priprema prompt -> Worker generira
  graph.addEdge("manager_context_node" as any, "worker_generation_node" as any);

  // ✅ LINEARNI EDGE-OVI ZA REFLECTION PETLJU (Zadatak 3.10):
  graph.addEdge("refine_draft" as any, "critique_draft" as any); // Poboljšani nacrt vraća se na kritiku (stvara petlju)

  // ✅ TEXT MODIFICATION EDGE:
  graph.addEdge("modify_text" as any, END); // Modificirani tekst ide direktno na završetak

  // ✅ FINALIZACIJA EDGE:
  graph.addEdge("final_output" as any, END);

  // ✅ UVJETNI EDGE-OVI (Zadatak 3.9):
  // Usmjeravanje nakon route_task čvora na temelju routingDecision
  graph.addConditionalEdges(
    "route_task" as any,
    routingCondition, // koristi postojeću funkciju
    {
      "handle_simple_retrieval": "handle_simple_retrieval",
      "creative_generation": "manager_context_node", // ✅ Sada vodi na Managera
      "modify_text": "modify_text", // ✅ Nova ruta za modifikaciju teksta
      [END]: END
    } as any
  );

  // ✅ UVJETNI EDGE-OVI ZA WORKER GENERATION (Novi zahtjev za Brainstorming):
  // Ako je brainstorming, preskačemo kritiku i idemo na kraj.
  graph.addConditionalEdges(
    "worker_generation_node" as any,
    workerGenerationCondition,
    {
      "critique_draft": "critique_draft",
      "final_output": "final_output"
    } as any
  );

  // ✅ UVJETNI EDGE-OVI ZA REFLECTION PETLJU (Zadatak 3.10):
  // Usmjeravanje nakon critique_draft čvora na temelju draftCount i critique.stop
  graph.addConditionalEdges(
    "critique_draft" as any,
    reflectionCondition, // koristi postojeću funkciju na liniji 189
    {
      "refine_draft": "refine_draft", // nastavi petlju
      "final_output": "final_output" // završi petlju kroz finalizaciju
    } as any
  );

  return graph;
}

/**
 * Helper funkcija za kompajliranje grafa u izvršnu verziju
 */
export async function compileStoryArchitectGraph() {
  const graph = createStoryArchitectGraph();

  // Kompajliraj graf - sada je spreman za izvršavanje
  const compiledGraph = graph.compile();
  console.log("✅ Story Architect Graph successfully compiled and ready for execution");

  return compiledGraph;
}

/**
 * Funkcija za pokretanje grafa s korisničkim inputom
 * @param userInput - Originalni korisnički upit
 * @param storyContext - Kontekst priče iz baze podataka
 * @param plannerContext - Opcijski kontekst iz Planner moda (npr. "planner_logline")
 */
export async function runStoryArchitectGraph(
  userInput: string,
  storyContext: string,
  plannerContext?: string,
  mode?: 'planner' | 'brainstorming' | 'writer' | 'contextual-edit',
  editorContent?: string,
  messages: BaseMessage[] = []
): Promise<AgentState> {

  // Kreiranje početnog stanja
  const initialState = createInitialState(userInput, storyContext, plannerContext, mode, editorContent, messages);

  console.log("🚀 Starting Story Architect Graph execution with:", {
    userInput: initialState.userInput,
    storyContext: initialState.storyContext.substring(0, 100) + "...", // Skraćeni prikaz
    plannerContext: initialState.plannerContext || "none",
    mode: initialState.mode || "planner (default)",
    draftCount: initialState.draftCount
  });

  try {
    // Kompajliraj i pokreni graf
    const compiledGraph = await compileStoryArchitectGraph();
    const result = await compiledGraph.invoke(initialState) as AgentState;

    console.log("✅ Graph execution completed successfully");
    return result;

  } catch (error) {
    console.error("❌ Error during graph execution:", error);

    // Graceful degradation - vrati početno stanje s greškom
    return {
      ...initialState,
      finalOutput: `Greška prilikom izvršavanja grafa: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
    };
  }
}

/**
 * Uvjetna funkcija za routing nakon route_task čvora
 * Implementira logiku usmjeravanja prema specifikaciji
 */
export function routingCondition(state: AgentState): string {
  const decision = state.routingDecision;

  console.log("[ROUTING_CONDITION] Processing decision:", decision);

  switch (decision) {
    case "simple_retrieval":
      console.log("[ROUTING_CONDITION] Routing to handle_simple_retrieval");
      return "handle_simple_retrieval";
    case "creative_generation":
      console.log("[ROUTING_CONDITION] Routing to creative_generation");
      return "creative_generation";
    case "text_modification":
      console.log("[ROUTING_CONDITION] Routing to modify_text");
      return "modify_text";
    case "cannot_answer":
    default:
      console.log("[ROUTING_CONDITION] Routing to END (cannot answer or unknown)");
      return END;
  }
}

/**
 * Uvjetna funkcija za routing nakon worker_generation_node čvora
 * Ako je brainstorming, preskače kritiku.
 */
export function workerGenerationCondition(state: AgentState): string {
  console.log(`[WORKER_GENERATION_CONDITION] Checking mode: ${state.mode}`);

  if (state.mode === 'brainstorming') {
    console.log("[WORKER_GENERATION_CONDITION] Brainstorming mode -> Skipping critique, going to final_output");
    return "final_output";
  }

  console.log("[WORKER_GENERATION_CONDITION] Standard mode -> Proceeding to critique_draft");
  return "critique_draft";
}



/**
 * Uvjetna funkcija za reflection petlju nakon critique_draft čvora
 * Implementira logiku iterativnog poboljšanja
 */
export function reflectionCondition(state: AgentState): string {
  console.log(`[REFLECTION_CONDITION] Evaluating state: draftCount=${state.draftCount}, hasCritique=${!!state.critique}`);

  // Provjeri je li postignuto maksimalno iteracija
  if (state.draftCount >= MAX_DRAFT_ITERATIONS) {
    console.log(`[REFLECTION_CONDITION] Maximum iterations (${MAX_DRAFT_ITERATIONS}) reached, ending reflection loop`);
    return "final_output";
  }

  // Provjeri stop zastavicu iz kritike (ako postoji)
  if (state.critique) {
    try {
      const critiqueData = JSON.parse(state.critique);
      console.log(`[REFLECTION_CONDITION] Parsed critique: score=${critiqueData.score}, stop=${critiqueData.stop}`);

      if (critiqueData.stop === true) {
        console.log("[REFLECTION_CONDITION] Critique indicates draft is satisfactory, ending reflection loop");
        return "final_output";
      }
    } catch (error) {
      console.warn("[REFLECTION_CONDITION] Could not parse critique JSON, continuing with iteration");
    }
  }

  // Nastavi s poboljšanjem
  console.log(`[REFLECTION_CONDITION] Continuing reflection loop (iteration ${state.draftCount}/${MAX_DRAFT_ITERATIONS})`);
  return "refine_draft";
}

/**
 * Export glavnih funkcija za korištenje u drugim servisima
 */
export {
  createStoryArchitectGraph as default,
  createInitialState
};

export type { AgentState };
