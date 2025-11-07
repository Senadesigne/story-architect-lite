import { BaseMessage } from "@langchain/core/messages";
// MessagesAnnotation osigurava da se poruke dodaju na listu,
// a ne da se prepisuju (state 'reducer')
import { MessagesAnnotation } from "@langchain/langgraph";
import { Annotated } from "@langchain/langgraph/dist/graph/state";

export interface AgentState {
  // Ulaz i globalni kontekst
  userInput: string;          // Originalni upit korisnika
  storyContext: string;       // Statički sažetak cijele priče (iz schema.ts)
  
  // Faza RAG-a i Usmjeravanja
  transformedQuery?: string;  // Upit rafiniran od strane Mentora (za RAG)
  ragContext?: string;        // Dohvaćeni relevantni dijelovi (chunks)
  routingDecision?: "simple_retrieval" | "creative_generation" | "cannot_answer";

  // Faza Refleksije (Reflection) - Iterativna petlja
  draftCount: number;         // Brojač iteracija petlje (za prekid)
  draft?: string;             // Trenutni nacrt od 'Pisca' (Anthropic)
  critique?: string;          // Posljednja kritika od 'Mentora' (Ollama)

  // Izlaz
  finalOutput?: string;       // Konačni odgovor za korisnika

  // Memorija razgovora (za stateful interakcije)
  messages: Annotated<BaseMessage[], MessagesAnnotation>;
}
