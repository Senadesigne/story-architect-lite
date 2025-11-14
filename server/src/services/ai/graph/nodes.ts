import type { AgentState, AgentStateUpdate } from './state';
import { getRelevantContext } from '../ai.retriever';
import { createDefaultAIProvider } from '../../ai.service';
import type { AIGenerationOptions } from '../../ai.service';

/**
 * RAG Čvorovi (Nodes) za LangGraph Story Architect sustav
 * 
 * Ovaj modul sadrži implementacije čvorova koji se koriste u LangGraph grafu
 * za RAG (Retrieval-Augmented Generation) funkcionalnost.
 * 
 * Temelji se na specifikaciji iz PLAN_ZADATAK_3_8_RAG_CVOROVI.md
 */

/**
 * Čvor za dohvaćanje relevantnog konteksta iz vektorske baze
 * 
 * @param state - Trenutno stanje agenta
 * @returns Ažuriranje stanja s ragContext poljem
 */
export async function retrieveContextNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[RETRIEVE_CONTEXT] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    transformedQuery: state.transformedQuery?.substring(0, 100) + "..." || "not available",
    hasStoryContext: !!state.storyContext
  });

  try {
    // Koristi transformedQuery ako je dostupan, inače fallback na userInput
    const query = state.transformedQuery || state.userInput;
    
    if (!query) {
      console.error("[RETRIEVE_CONTEXT] Error: No query available (neither transformedQuery nor userInput)");
      return {
        ragContext: "Greška: Nema dostupnog upita za pretraživanje konteksta."
      };
    }

    console.log("[RETRIEVE_CONTEXT] Using query:", query.substring(0, 150) + "...");

    // Pozovi RAG funkciju s 5 rezultata (prema specifikaciji)
    const ragContext = await getRelevantContext(query, 5);

    console.log("[RETRIEVE_CONTEXT] Retrieved context length:", ragContext.length);
    console.log("[RETRIEVE_CONTEXT] Context preview:", ragContext.substring(0, 200) + "...");

    console.log("[RETRIEVE_CONTEXT] Completed successfully");
    
    return {
      ragContext
    };

  } catch (error) {
    console.error("[RETRIEVE_CONTEXT] Error during context retrieval:", error);
    
    // Graceful degradation - vraćamo korisnu poruku greške
    return {
      ragContext: `Greška prilikom dohvaćanja konteksta: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
    };
  }
}

/**
 * Čvor za transformaciju korisničkog upita pomoću AI Mentora
 * 
 * Koristi Anthropic Haiku model za optimizaciju upita za RAG pretraživanje
 * 
 * @param state - Trenutno stanje agenta
 * @returns Ažuriranje stanja s transformedQuery poljem
 */
export async function transformQueryNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[TRANSFORM_QUERY] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    hasStoryContext: !!state.storyContext,
    storyContextLength: state.storyContext?.length || 0
  });

  try {
    if (!state.userInput) {
      console.error("[TRANSFORM_QUERY] Error: No userInput available");
      return {
        transformedQuery: state.userInput || ""
      };
    }

    // Kreiranje AI providera s Anthropic Haiku konfigurацijom
    const aiProvider = await createDefaultAIProvider();
    
    // Konfiguracija za query transformation (brži, jeftiniji model)
    const options: AIGenerationOptions = {
      temperature: 0.3, // Niža temperatura za konzistentniju transformaciju
      maxTokens: 200,   // Kratki output - samo transformirani upit
      timeout: 10000    // 10 sekundi timeout
    };

    // Sistemski prompt za Query Transformation
    const systemPrompt = `Ti si AI Mentor, ekspert za RAG (Retrieval-Augmented Generation) pretraživanje u kontekstu kreativnog pisanja priča.

Tvoja uloga je transformirati korisnički upit u optimizirane upite za vektorsko pretraživanje koji će dohvatiti najrelevantnije dijelove priče.

KONTEKST PRIČE:
${state.storyContext || "Nema dostupnog konteksta priče."}

KORISNIČKI UPIT:
${state.userInput}

ZADATAK:
Transformiraj korisnički upit u 3-5 specifičnih upita koji će najbolje dohvatiti relevantne informacije o:
- Profilima likova (motivacije, ciljevi, strahovi, pozadina)
- Događajima i scenama 
- Lokacijama i postavkama
- Temama i odnosima između likova

FORMAT ODGOVORA:
Vrati samo transformirane upite, svaki u novom redu, bez dodatnih objašnjenja.

PRIMJER:
profil lika Ana motivacije i ciljevi
scena svađa nasljedstvo Ana Marko
lokacija gdje se odvija svađa
odnos Ana Marko povijest konflikta`;

    console.log("[TRANSFORM_QUERY] Calling AI provider for query transformation");
    
    const transformedQuery = await aiProvider.generateText(systemPrompt, options);
    
    console.log("[TRANSFORM_QUERY] AI response received, length:", transformedQuery.length);
    console.log("[TRANSFORM_QUERY] Transformed query preview:", transformedQuery.substring(0, 200) + "...");

    console.log("[TRANSFORM_QUERY] Completed successfully");

    return {
      transformedQuery: transformedQuery.trim()
    };

  } catch (error) {
    console.error("[TRANSFORM_QUERY] Error during query transformation:", error);
    
    // Fallback strategija - koristi originalni upit
    console.log("[TRANSFORM_QUERY] Falling back to original user input");
    
    return {
      transformedQuery: state.userInput
    };
  }
}
