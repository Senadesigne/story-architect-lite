import { StateGraph, START, END } from "@langchain/langgraph";
import { createInitialState, MAX_DRAFT_ITERATIONS } from "./state";
import type { AgentState } from "./state";
import { retrieveContextNode, transformQueryNode } from "./nodes";

/**
 * LangGraph StateGraph inicijalizacija za Story Architect AI Orkestrator
 * 
 * Ovaj graf implementira Arhitekturu v2.0 - Stateful Multi-Agent sustav
 * koji zamjenjuje linearni lanac s cikličkim, uvjetovanim grafom.
 * 
 * Temelji se na specifikaciji iz TEHNICKI_PLAN_AI_FAZA_B_v2.md - Sekcija 6.2
 */

/**
 * Kreiranje i konfiguracija StateGraph instance
 */
export function createStoryArchitectGraph() {
  // Za sada kreiram jednostavan graf bez tipizacije
  // TODO: Dodati pravilnu tipizaciju kada se razjasni StateGraph API
  const graph = new StateGraph({}) as any;

  // ✅ IMPLEMENTIRANI ČVOROVI (Zadatak 3.8):
  graph.addNode("transform_query", transformQueryNode);
  graph.addNode("retrieve_context", retrieveContextNode);
  
  // TODO: Dodati preostale čvorove u sljedećim fazama implementacije
  // Planirani čvorovi prema specifikaciji:
  // - route_task: AI Mentor klasificira vrstu zadatka
  // - handle_simple_retrieval: AI Mentor odgovara na jednostavne upite
  // - generate_draft: Pisac (Cloud LLM) generira prvi nacrt
  // - critique_draft: AI Mentor kritizira nacrt
  // - refine_draft: Pisac poboljšava nacrt na temelju kritike

  // TODO: Dodati uvjetne rubove (conditional edges) u sljedećim fazama
  // Planirani uvjetni rubovi:
  // - Nakon route_task: usmjeravanje na simple_retrieval ili creative_generation
  // - Nakon critique_draft: provjera draftCount i stop zastavice za petlju

  // ✅ PRIVREMENI EDGE-OVI ZA TESTIRANJE (Zadatak 3.8):
  graph.addEdge(START, "transform_query");
  graph.addEdge("transform_query", "retrieve_context");
  graph.addEdge("retrieve_context", END); // Privremeno za testiranje

  // TODO: Ažurirati edge-ove kada se dodaju preostali čvorovi
  // Finalni tijek će biti: START -> transform_query -> retrieve_context -> route_task -> ...
  // graph.addEdge("finalize_output", END); // TODO: Dodati kada se implementira finalize_output čvor

  return graph;
}

/**
 * Helper funkcija za kompajliranje grafa u izvršnu verziju
 * Ova funkcija će se koristiti kada se dodaju svi čvorovi i rubovi
 */
export async function compileStoryArchitectGraph() {
  const graph = createStoryArchitectGraph();
  
  // TODO: Kompajliranje će se omogućiti kada se dodaju čvorovi
  // return graph.compile();
  
  // Privremeno vraćamo nekompajlirani graf za testiranje strukture
  console.log("Graph structure created, but not yet compiled (waiting for nodes implementation)");
  return graph;
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
  
  console.log("Initial state created:", {
    userInput: initialState.userInput,
    storyContext: initialState.storyContext.substring(0, 100) + "...", // Skraćeni prikaz
    draftCount: initialState.draftCount
  });

  // TODO: Pokretanje kompajliranog grafa kada se implementiraju čvorovi
  // const compiledGraph = await compileStoryArchitectGraph();
  // const result = await compiledGraph.invoke(initialState);
  // return result;

  // Privremeno vraćamo početno stanje za testiranje
  console.log("Graph execution not yet implemented (waiting for nodes)");
  return initialState;
}

/**
 * Uvjetna funkcija za routing nakon route_task čvora
 * Implementira logiku usmjeravanja prema specifikaciji
 */
export function routingCondition(state: AgentState): string {
  const decision = state.routingDecision;
  
  switch (decision) {
    case "simple_retrieval":
      return "handle_simple_retrieval";
    case "creative_generation":
      return "generate_draft";
    case "cannot_answer":
    default:
      return END;
  }
}

/**
 * Uvjetna funkcija za reflection petlju nakon critique_draft čvora
 * Implementira logiku iterativnog poboljšanja
 */
export function reflectionCondition(state: AgentState): string {
  // Provjeri je li postignuto maksimalno iteracija
  if (state.draftCount >= MAX_DRAFT_ITERATIONS) {
    console.log(`Maximum iterations (${MAX_DRAFT_ITERATIONS}) reached, ending reflection loop`);
    return END;
  }

  // Provjeri stop zastavicu iz kritike (ako postoji)
  if (state.critique) {
    try {
      const critiqueData = JSON.parse(state.critique);
      if (critiqueData.stop === true) {
        console.log("Critique indicates draft is satisfactory, ending reflection loop");
        return END;
      }
    } catch (error) {
      console.warn("Could not parse critique JSON, continuing with iteration");
    }
  }

  // Nastavi s poboljšanjem
  console.log(`Continuing reflection loop (iteration ${state.draftCount + 1}/${MAX_DRAFT_ITERATIONS})`);
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
