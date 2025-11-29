import { BaseMessage } from "@langchain/core/messages";

export interface AgentState {
  // Ulaz i globalni kontekst
  userInput: string;          // Originalni upit korisnika
  storyContext: string;       // Statički sažetak cijele priče (iz schema.ts)

  // Faza RAG-a i Usmjeravanja
  transformedQuery?: string;  // Upit rafiniran od strane Mentora (za RAG)
  ragContext?: string;        // Dohvaćeni relevantni dijelovi (chunks)
  routingDecision?: "simple_retrieval" | "creative_generation" | "text_modification" | "cannot_answer";

  // Manager-Worker
  workerPrompt?: string;      // Upute za Workera (generirao Manager)
  managerAnalysis?: string;   // Analiza konteksta od Managera (za debug)

  // Faza Refleksije (Reflection) - Iterativna petlja
  draftCount: number;         // Brojač iteracija petlje (za prekid)
  draft?: string;             // Trenutni nacrt od 'Pisca' (Anthropic)
  critique?: string;          // Posljednja kritika od 'Mentora' (Ollama)

  // Izlaz
  finalOutput?: string;       // Konačni odgovor za korisnika

  // Memorija razgovora (za stateful interakcije)
  messages: BaseMessage[];
}
