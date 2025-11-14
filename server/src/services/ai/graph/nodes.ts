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

/**
 * Čvor za usmjeravanje zadatka na temelju AI klasifikacije
 * 
 * Koristi Anthropic Haiku model za brzu i jeftinu klasifikaciju upita
 * 
 * @param state - Trenutno stanje agenta
 * @returns Ažuriranje stanja s routingDecision poljem
 */
export async function routeTaskNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[ROUTE_TASK] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    hasRagContext: !!state.ragContext,
    ragContextLength: state.ragContext?.length || 0
  });

  try {
    if (!state.userInput) {
      console.error("[ROUTE_TASK] Error: No userInput available");
      return {
        routingDecision: "cannot_answer"
      };
    }

    // Kreiranje AI providera s Anthropic Haiku konfigurацijom
    const aiProvider = await createDefaultAIProvider();
    
    // Konfiguracija za routing klasifikaciju (brži, jeftiniji model)
    const options: AIGenerationOptions = {
      temperature: 0.1, // Vrlo niska temperatura za konzistentnu klasifikaciju
      maxTokens: 50,    // Kratki odgovor - samo jedna riječ
      timeout: 8000     // 8 sekundi timeout
    };

    // Sistemski prompt za Task Routing
    const systemPrompt = `Ti si AI Logističar i usmjerivač zadataka u sustavu za kreativno pisanje priča.

Tvoja uloga je analizirati korisnički upit i RAG kontekst te klasificirati vrstu zadatka koji treba izvršiti.

KORISNIČKI UPIT:
${state.userInput}

RAG KONTEKST:
${state.ragContext || "Nema dostupnog RAG konteksta."}

KATEGORIJE ZADATAKA:

1. simple_retrieval - Jednostavan upit koji se može odgovoriti iz postojećeg RAG konteksta
   Primjeri: "Kako se zove Anin otac?", "Gdje se Ana rodila?", "Što je Ana rekla Marku?"

2. creative_generation - Kreativni zadatak koji zahtijeva generiranje novog sadržaja
   Primjeri: "Napiši scenu gdje Ana...", "Opiši kako se Ana osjeća...", "Stvori dijalog između..."

3. cannot_answer - Upit nije povezan s pričom ili nema dovoljno konteksta za odgovor
   Primjeri: "Kakvo je vrijeme danas?", "Što je glavni grad Francuske?"

ZADATAK:
Analiziraj korisnički upit i RAG kontekst te vrati SAMO jednu od sljedećih riječi:
- simple_retrieval
- creative_generation  
- cannot_answer

VAŽNO: Vrati samo naziv kategorije, bez dodatnih objašnjenja ili interpunkcije.`;

    console.log("[ROUTE_TASK] Calling AI provider for task routing");
    
    const aiResponse = await aiProvider.generateText(systemPrompt, options);
    
    console.log("[ROUTE_TASK] AI response received:", aiResponse);

    // Normalizacija i validacija odgovora
    const normalizedResponse = aiResponse.trim().toLowerCase();
    let routingDecision: "simple_retrieval" | "creative_generation" | "cannot_answer";

    if (normalizedResponse.includes("simple_retrieval")) {
      routingDecision = "simple_retrieval";
    } else if (normalizedResponse.includes("creative_generation")) {
      routingDecision = "creative_generation";
    } else if (normalizedResponse.includes("cannot_answer")) {
      routingDecision = "cannot_answer";
    } else {
      // Fallback strategija - ako AI ne vrati valjanu kategoriju
      console.warn("[ROUTE_TASK] AI returned invalid category, defaulting to cannot_answer");
      routingDecision = "cannot_answer";
    }

    console.log("[ROUTE_TASK] Final routing decision:", routingDecision);
    console.log("[ROUTE_TASK] Completed successfully");

    return {
      routingDecision
    };

  } catch (error) {
    console.error("[ROUTE_TASK] Error during task routing:", error);
    
    // Graceful degradation - defaultiraj na cannot_answer
    console.log("[ROUTE_TASK] Falling back to cannot_answer due to error");
    
    return {
      routingDecision: "cannot_answer"
    };
  }
}

/**
 * Čvor za rukovanje jednostavnim upitima koji se mogu odgovoriti iz RAG konteksta
 * 
 * Koristi Anthropic Haiku model za generiranje prirodnog odgovora
 * 
 * @param state - Trenutno stanje agenta
 * @returns Ažuriranje stanja s finalOutput poljem
 */
export async function handleSimpleRetrievalNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[HANDLE_SIMPLE_RETRIEVAL] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    hasRagContext: !!state.ragContext,
    ragContextLength: state.ragContext?.length || 0
  });

  try {
    if (!state.userInput) {
      console.error("[HANDLE_SIMPLE_RETRIEVAL] Error: No userInput available");
      return {
        finalOutput: "Greška: Nema dostupnog korisničkog upita."
      };
    }

    if (!state.ragContext) {
      console.warn("[HANDLE_SIMPLE_RETRIEVAL] Warning: No RAG context available");
      return {
        finalOutput: "Nažalost, nema dostupnih informacija u kontekstu priče za odgovor na vaš upit."
      };
    }

    // Kreiranje AI providera s Anthropic Haiku konfigurацijom
    const aiProvider = await createDefaultAIProvider();
    
    // Konfiguracija za simple retrieval (umjerena kreativnost)
    const options: AIGenerationOptions = {
      temperature: 0.4, // Umjerena kreativnost za prirodan odgovor
      maxTokens: 300,   // Dovoljno za detaljan odgovor
      timeout: 15000    // 15 sekundi timeout
    };

    // Sistemski prompt za Simple Retrieval
    const systemPrompt = `Ti si AI Mentor, ekspert za analizu i interpretaciju priča.

Tvoja uloga je odgovoriti na korisnički upit koristeći isključivo informacije iz dostupnog konteksta priče.

KORISNIČKI UPIT:
${state.userInput}

KONTEKST PRIČE:
${state.ragContext}

ZADATAK:
Odgovori na korisnički upit koristeći samo informacije iz konteksta priče. Slijedi ova pravila:

1. Koristi SAMO informacije koje su eksplicitno navedene u kontekstu
2. Ne izmišljaj činjenice koje nisu spomenute
3. Ako informacija nije dostupna, jasno to navedi
4. Formatira odgovor prirodno i korisno
5. Budi koncizan ali informativan

FORMAT ODGOVORA:
Prirodan, direktan odgovor na hrvatski jezik bez dodatnih objašnjenja o procesu.

PRIMJER:
Upit: "Kako se zove Anin otac?"
Odgovor: "Prema dostupnim informacijama, Anin otac se zove Marko Petrović."

ili ako informacija nije dostupna:
"U dostupnom kontekstu priče nije spomenuto ime Aninog oca."`;

    console.log("[HANDLE_SIMPLE_RETRIEVAL] Calling AI provider for response generation");
    
    const finalOutput = await aiProvider.generateText(systemPrompt, options);
    
    console.log("[HANDLE_SIMPLE_RETRIEVAL] AI response received, length:", finalOutput.length);
    console.log("[HANDLE_SIMPLE_RETRIEVAL] Response preview:", finalOutput.substring(0, 150) + "...");

    console.log("[HANDLE_SIMPLE_RETRIEVAL] Completed successfully");

    return {
      finalOutput: finalOutput.trim()
    };

  } catch (error) {
    console.error("[HANDLE_SIMPLE_RETRIEVAL] Error during response generation:", error);
    
    // Graceful degradation
    return {
      finalOutput: `Greška prilikom generiranja odgovora: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
    };
  }
}