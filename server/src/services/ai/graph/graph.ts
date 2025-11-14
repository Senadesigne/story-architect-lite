import { StateGraph, START, END, StateGraphArgs } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { createInitialState, MAX_DRAFT_ITERATIONS } from "./state";
import type { AgentState } from "./state";
import { 
  retrieveContextNode, 
  transformQueryNode, 
  routeTaskNode, 
  handleSimpleRetrievalNode,
  generateDraftNode,
  critiqueDraftNode,
  refineDraftNode
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
      value: null,
    },
    storyContext: {
      value: null,
    },
    // RAG faza
    transformedQuery: {
      value: null,
    },
    ragContext: {
      value: null,
    },
    // Routing
    routingDecision: {
      value: null,
    },
    // Reflection petlja
    draftCount: {
      value: (x?: number, y?: number) => (x ?? 0) + (y ?? 0),
      default: () => 0,
    },
    draft: {
      value: null,
    },
    critique: {
      value: null,
    },
    // Izlaz
    finalOutput: {
      value: null,
    },
    // Messages za buduću upotrebu
    messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
      default: () => [],
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
  
  // ✅ REFLECTION ČVOROVI (Zadatak 3.10):
  graph.addNode("generate_draft", generateDraftNode);
  graph.addNode("critique_draft", critiqueDraftNode);
  graph.addNode("refine_draft", refineDraftNode);

  // TODO: Dodati uvjetne rubove (conditional edges) u sljedećim fazama
  // Planirani uvjetni rubovi:
  // - Nakon route_task: usmjeravanje na simple_retrieval ili creative_generation
  // - Nakon critique_draft: provjera draftCount i stop zastavice za petlju

  // ✅ POSTAVLJANJE ULAZNE TOČKE:
  graph.setEntryPoint("transform_query");

  // ✅ LINEARNI EDGE-OVI (Zadatak 3.8 i 3.9):
  graph.addEdge("transform_query", "retrieve_context");
  graph.addEdge("retrieve_context", "route_task"); // Povezuje RAG fazu s usmjeravanjem
  graph.addEdge("handle_simple_retrieval", END); // Završava tijek za jednostavne upite

  // ✅ LINEARNI EDGE-OVI ZA REFLECTION PETLJU (Zadatak 3.10):
  graph.addEdge("generate_draft", "critique_draft"); // Generirani nacrt ide na kritiku
  graph.addEdge("refine_draft", "critique_draft"); // Poboljšani nacrt vraća se na kritiku (stvara petlju)

  // ✅ UVJETNI EDGE-OVI (Zadatak 3.9):
  // Usmjeravanje nakon route_task čvora na temelju routingDecision
  graph.addConditionalEdges(
    "route_task",
    routingCondition, // koristi postojeću funkciju
    {
      "handle_simple_retrieval": "handle_simple_retrieval",
      "generate_draft": "generate_draft", // ✅ Sada vodi na generate_draft čvor
      [END]: END
    }
  );

  // ✅ UVJETNI EDGE-OVI ZA REFLECTION PETLJU (Zadatak 3.10):
  // Usmjeravanje nakon critique_draft čvora na temelju draftCount i critique.stop
  graph.addConditionalEdges(
    "critique_draft",
    reflectionCondition, // koristi postojeću funkciju na liniji 189
    {
      "refine_draft": "refine_draft", // nastavi petlju
      [END]: END // završi petlju
    }
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
 */
export async function runStoryArchitectGraph(
  userInput: string, 
  storyContext: string
): Promise<AgentState> {
  
  // Kreiranje početnog stanja
  const initialState = createInitialState(userInput, storyContext);
  
  console.log("🚀 Starting Story Architect Graph execution with:", {
    userInput: initialState.userInput,
    storyContext: initialState.storyContext.substring(0, 100) + "...", // Skraćeni prikaz
    draftCount: initialState.draftCount
  });

  try {
    // Kompajliraj i pokreni graf
    const compiledGraph = await compileStoryArchitectGraph();
    const result = await compiledGraph.invoke(initialState);
    
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
      console.log("[ROUTING_CONDITION] Routing to generate_draft (currently END)");
      return "generate_draft";
    case "cannot_answer":
    default:
      console.log("[ROUTING_CONDITION] Routing to END (cannot answer or unknown)");
      return END;
  }
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
    // Postavi finalOutput prije završetka
    if (state.draft) {
      console.log(`[REFLECTION_CONDITION] Setting finalOutput from draft (length: ${state.draft.length})`);
      // Note: LangGraph će automatski primijeniti ovu promjenu kroz state reducer
      (state as any).finalOutput = state.draft;
    }
    return END;
  }

  // Provjeri stop zastavicu iz kritike (ako postoji)
  if (state.critique) {
    try {
      const critiqueData = JSON.parse(state.critique);
      console.log(`[REFLECTION_CONDITION] Parsed critique: score=${critiqueData.score}, stop=${critiqueData.stop}`);
      
      if (critiqueData.stop === true) {
        console.log("[REFLECTION_CONDITION] Critique indicates draft is satisfactory, ending reflection loop");
        // Postavi finalOutput prije završetka
        if (state.draft) {
          console.log(`[REFLECTION_CONDITION] Setting finalOutput from satisfactory draft (length: ${state.draft.length})`);
          (state as any).finalOutput = state.draft;
        }
        return END;
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
