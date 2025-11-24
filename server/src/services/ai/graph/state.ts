import { BaseMessage } from "@langchain/core/messages";
import { MessagesAnnotation, Annotation } from "@langchain/langgraph";

/**
 * AgentState - Centralizirano stanje za LangGraph multi-agentni sustav
 * 
 * Ovo sučelje definira "memoriju" sustava koji se prenosi između svih čvorova (agenata)
 * u grafu. Svaki čvor prima cjelokupno stanje i vraća ažuriranje (patch) tog stanja.
 * 
 * Temelji se na specifikaciji iz TEHNICKI_PLAN_AI_FAZA_B_v2.md - Sekcija 2.2
 */
export interface AgentState {
  // === ULAZ I GLOBALNI KONTEKST ===

  /**
   * Originalni upit korisnika - nepromjenjiv kroz cijeli tijek
   * Primjer: "Napiši scenu gdje se Ana i Marko svađaju oko nasljedstva"
   */
  userInput: string;

  /**
   * Statički sažetak cijele priče dohvaćen iz schema.ts
   * Uključuje osnovne informacije o projektu, likovima, lokacijama
   */
  storyContext: string;

  /**
   * Kontekst iz Planner moda - označava tip polja za koje se generira sadržaj
   * Primjeri: "planner_logline", "planner_character", "planner_location"
   * Ako je prisutan, koristi se za odabir specifičnog System Prompta
   */
  plannerContext?: string;

  /**
   * Mod rada: 'planner' (fokus na polja) ili 'brainstorming' (slobodni chat)
   */
  mode?: 'planner' | 'brainstorming';

  // === FAZA RAG-A I USMJERAVANJA ===

  /**
   * Upit rafiniran od strane AI Mentora za optimalno RAG pretraživanje
   * Transformira se iz korisničkog upita u specifične upite za vektorsku bazu
   */
  transformedQuery?: string;

  /**
   * Dohvaćeni relevantni dijelovi (chunks) iz vektorske baze
   * Rezultat RAG pretraživanja koji služi kao kontekst za generiranje
   */
  ragContext?: string;

  /**
   * Odluka AI Mentora o vrsti zadatka koji treba izvršiti
   * - simple_retrieval: Jednostavan odgovor iz postojećeg konteksta
   * - creative_generation: Kreativno pisanje koje zahtijeva Cloud LLM
   * - text_modification: Modifikacija postojećeg teksta (Prepravi, Skrati, Proširi, Promijeni ton)
   * - cannot_answer: Upit nije povezan s pričom ili nema dovoljno konteksta
   */
  routingDecision?: "simple_retrieval" | "creative_generation" | "text_modification" | "cannot_answer";

  // === FAZA REFLEKSIJE (REFLECTION) - ITERATIVNA PETLJA ===

  /**
   * Brojač iteracija petlje poboljšanja (za prekid beskonačnih petlji)
   * Maksimalno 3 iteracije prema specifikaciji
   */
  draftCount: number;

  /**
   * Trenutni nacrt kreativnog teksta od Pisca (Cloud LLM)
   * Ažurira se kroz iteracije poboljšanja
   */
  draft?: string;

  /**
   * Posljednja kritika od AI Mentora u JSON formatu
   * Sadrži: issues[], plan, score (0-100), stop (boolean)
   */
  critique?: string;

  // === IZLAZ ===

  /**
   * Konačni odgovor za slanje korisniku
   * Može biti rezultat simple_retrieval ili finalizirani draft
   */
  finalOutput?: string;

  // === MEMORIJA RAZGOVORA ===

  /**
   * Povijest razgovora za stateful interakcije
   * Koristi MessagesAnnotation za automatsko dodavanje poruka na listu
   * (state reducer funkcionalnost - poruke se dodaju, ne prepisuju)
   */
  messages: BaseMessage[];
}

/**
 * Tip za parcijalno ažuriranje stanja
 * Omogućuje čvorovima da ažuriraju samo određena polja
 */
export type AgentStateUpdate = Partial<AgentState>;

/**
 * Helper funkcija za kreiranje početnog stanja
 */
export function createInitialState(
  userInput: string,
  storyContext: string,
  plannerContext?: string,
  mode?: 'planner' | 'brainstorming'
): AgentState {
  return {
    userInput,
    storyContext,
    plannerContext,
    mode,
    draftCount: 0,
    messages: []
  };
}

/**
 * Konstante za maksimalne vrijednosti
 */
export const MAX_DRAFT_ITERATIONS = 3;
export const MAX_RAG_RESULTS = 5;

// Note: AgentState and AgentStateUpdate are already exported above
