import { StateGraph, END, StateGraphArgs } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { AgentState } from "./ai.state.js";
import {
  transformQueryNode,
  retrieveContextNode,
  routeTaskNode,
  handleSimpleRetrievalNode,
  managerContextNode,
  workerGenerationNode,
  critiqueDraftNode,
  refineDraftNode
} from "./ai.nodes.js";

// Definiramo konfiguraciju za StateGraph
// Za verziju 0.2.x, koristimo StateGraphArgs<AgentState>
const graphConfig: StateGraphArgs<AgentState> = {
  channels: {
    // Ulazni podaci
    userInput: {
      value: (x, y) => y ?? x,
    },
    storyContext: {
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
    // Manager-Worker
    workerPrompt: {
      value: (x, y) => y ?? x,
    },
    managerAnalysis: {
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
  },
};

// 1. Kreiraj graf s eksplicitnim tipom
const workflow = new StateGraph<AgentState>(graphConfig);

// 2. Dodaj čvorove
workflow.addNode("transform_query", transformQueryNode);
workflow.addNode("retrieve_context", retrieveContextNode);
workflow.addNode("route_task", routeTaskNode);
workflow.addNode("handle_simple_retrieval", handleSimpleRetrievalNode);
workflow.addNode("manager_context_node", managerContextNode);
workflow.addNode("worker_generation_node", workerGenerationNode);
workflow.addNode("critique_draft", critiqueDraftNode);
workflow.addNode("refine_draft", refineDraftNode);

// Dodaj finalni čvor koji prebacuje draft u finalOutput
workflow.addNode("finalize_output", async (state: AgentState) => {
  console.log("--- FINALIZACIJA IZLAZA ---");
  return {
    finalOutput: state.draft || "Greška: Nema generiranog teksta."
  };
});

// 3. Postavi ulaznu točku
workflow.setEntryPoint("transform_query" as any);

// 4. Dodaj osnovne rubove (edges)
workflow.addEdge("transform_query" as any, "retrieve_context" as any);
workflow.addEdge("retrieve_context" as any, "route_task" as any);

// 5. Dodaj uvjetne rubove za routing
workflow.addConditionalEdges(
  "route_task" as any,
  // Funkcija koja odlučuje koji čvor slijedi
  (state: AgentState) => {
    const decision = state.routingDecision;
    console.log(`Routing decision: ${decision}`);

    if (decision === "simple_retrieval") {
      return "handle_simple_retrieval";
    } else if (decision === "creative_generation") {
      // Umjesto direktno na generiranje, idemo na Managera
      return "manager_context_node";
    } else {
      // cannot_answer ili nepoznata odluka
      return END;
    }
  },
  // Mapa mogućih izlaza (potrebno za TypeScript)
  {
    handle_simple_retrieval: "handle_simple_retrieval",
    manager_context_node: "manager_context_node",
    [END]: END,
  } as any
);

// 6. Povežemo handle_simple_retrieval s krajem
workflow.addEdge("handle_simple_retrieval" as any, END);

// 6a. Povežemo Manager -> Worker
workflow.addEdge("manager_context_node" as any, "worker_generation_node" as any);

// 7. Dodaj rubove za Reflection petlju
// Worker -> Critique
workflow.addEdge("worker_generation_node" as any, "critique_draft" as any);
workflow.addEdge("refine_draft" as any, "critique_draft" as any);

// 8. Dodaj uvjetne rubove za critique - srce Reflection petlje
const MAX_RETRIES = 3;

workflow.addConditionalEdges(
  "critique_draft" as any,
  // Funkcija koja odlučuje nastavlja li se petlja
  (state: AgentState) => {
    try {
      // Pokušaj parsirati kritiku kao JSON
      const critiqueObj = JSON.parse(state.critique || "{}");
      const shouldStop = critiqueObj.stop === true;
      const maxRetriesReached = state.draftCount >= MAX_RETRIES;

      console.log(`Reflection petlja - Iteracija: ${state.draftCount}, Stop: ${shouldStop}, Max reached: ${maxRetriesReached}`);

      if (shouldStop || maxRetriesReached) {
        return "finalize_output";
      } else {
        return "refine_draft";
      }
    } catch (error) {
      console.error("Greška pri parsiranju kritike, prekidam petlju:", error);
      return "finalize_output";
    }
  },
  // Mapa mogućih izlaza
  {
    refine_draft: "refine_draft",
    finalize_output: "finalize_output",
  } as any
);

// 9. Poveži finalizaciju s krajem
workflow.addEdge("finalize_output" as any, END);

// 10. Kompajliraj graf
export const appGraph = workflow.compile();

console.log("AI Graf v2.1 (Manager-Worker) kompajliran i spreman.");

