import { StateGraph, END, StateGraphArgs } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { AgentState } from "./ai.state";
import { 
  transformQueryNode, 
  retrieveContextNode, 
  routeTaskNode, 
  handleSimpleRetrievalNode 
} from "./ai.nodes";

// Definiramo konfiguraciju za StateGraph
// Za verziju 0.2.x, koristimo StateGraphArgs<AgentState>
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

// 1. Kreiraj graf s eksplicitnim tipom
const workflow = new StateGraph<AgentState>(graphConfig);

// 2. Dodaj čvorove
workflow.addNode("transform_query", transformQueryNode);
workflow.addNode("retrieve_context", retrieveContextNode);
workflow.addNode("route_task", routeTaskNode);
workflow.addNode("handle_simple_retrieval", handleSimpleRetrievalNode);

// 3. Postavi ulaznu točku
workflow.setEntryPoint("transform_query");

// 4. Dodaj osnovne rubove (edges)
workflow.addEdge("transform_query", "retrieve_context");
workflow.addEdge("retrieve_context", "route_task");

// 5. Dodaj uvjetne rubove za routing
workflow.addConditionalEdges(
  "route_task",
  // Funkcija koja odlučuje koji čvor slijedi
  (state: AgentState) => {
    const decision = state.routingDecision;
    console.log(`Routing decision: ${decision}`);
    
    if (decision === "simple_retrieval") {
      return "handle_simple_retrieval";
    } else if (decision === "creative_generation") {
      // TODO: Dodati generate_draft čvor u sljedećoj fazi
      console.log("TODO: Implementirati creative_generation put");
      return END;
    } else {
      // cannot_answer ili nepoznata odluka
      return END;
    }
  },
  // Mapa mogućih izlaza (potrebno za TypeScript)
  {
    handle_simple_retrieval: "handle_simple_retrieval",
    [END]: END,
  }
);

// 6. Povežemo handle_simple_retrieval s krajem
workflow.addEdge("handle_simple_retrieval", END);

// 7. Kompajliraj graf
export const appGraph = workflow.compile();

console.log("AI Graf v2.0 (s routingom) kompajliran i spreman.");
