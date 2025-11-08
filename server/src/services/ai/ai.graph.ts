import { StateGraph, MessagesState } from "@langchain/langgraph";
import { AgentState } from "./ai.state";
import { transformQueryNode, retrieveContextNode } from "./ai.nodes";

// Definicija stanja grafa (channel: true osigurava da se state spaja, a ne prepisuje)
const graphState: MessagesState = {
  messages: {
    value: (x: any[], y: any[]) => x.concat(y),
    default: () => [],
  },
  // Dodajemo ostatak našeg AgentState-a
  userInput: {
    value: null,
  },
  storyContext: {
    value: null,
  },
  transformedQuery: {
    value: null,
  },
  ragContext: {
    value: null,
  },
  routingDecision: {
    value: null,
  },
  draftCount: {
    value: (x: number, y: number) => x + y,
    default: () => 0,
  },
  draft: {
    value: null,
  },
  critique: {
    value: null,
  },
  finalOutput: {
    value: null,
  },
};

// 1. Kreiraj graf
const workflow = new StateGraph({
  channels: graphState as any, // 'as any' da se izbjegnu TS problemi s MessagesState
});

// 2. Dodaj čvorove
workflow.addNode("transform_query", transformQueryNode);
workflow.addNode("retrieve_context", retrieveContextNode);

// 3. Poveži čvorove
workflow.setEntryPoint("transform_query");
workflow.addEdge("transform_query", "retrieve_context");

// 4. Kompajliraj graf
export const appGraph = workflow.compile();

console.log("AI Graf (RAG) kompajliran i spreman.");
