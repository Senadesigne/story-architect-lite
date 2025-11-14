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

/**
 * Čvor za generiranje početnog nacrta kreativnog sadržaja
 * 
 * Koristi Anthropic Haiku model za kreativno pisanje na temelju RAG konteksta
 * 
 * @param state - Trenutno stanje agenta
 * @returns Ažuriranje stanja s draft poljem
 */
export async function generateDraftNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[GENERATE_DRAFT] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    hasRagContext: !!state.ragContext,
    ragContextLength: state.ragContext?.length || 0
  });

  try {
    if (!state.userInput) {
      console.error("[GENERATE_DRAFT] Error: No userInput available");
      return {
        draft: "Greška: Nema dostupnog korisničkog upita za generiranje nacrta."
      };
    }

    if (!state.ragContext) {
      console.warn("[GENERATE_DRAFT] Warning: No RAG context available");
      return {
        draft: "Greška: Nema dostupnog konteksta priče za generiranje kreativnog sadržaja."
      };
    }

    // Kreiranje AI providera s Anthropic Haiku konfigurацijom
    const aiProvider = await createDefaultAIProvider();
    
    // Konfiguracija za kreativno generiranje (visoka kreativnost)
    const options: AIGenerationOptions = {
      temperature: 0.7, // Visoka kreativnost za pisanje
      maxTokens: 1000,  // Dovoljno za detaljnu scenu
      timeout: 30000    // 30 sekundi za kompleksno generiranje
    };

    // Sistemski prompt za kreativno pisanje
    const systemPrompt = `Ti si AI Pisac, ekspert za kreativno pisanje priča i scenarija.

Tvoja uloga je generirati kreativni sadržaj na temelju korisničkog zahtjeva i dostupnog konteksta priče.

KORISNIČKI ZAHTJEV:
${state.userInput}

KONTEKST PRIČE:
${state.ragContext}

ZADATAK:
Generiraj kreativni sadržaj koji ispunjava korisnički zahtjev. Slijedi ova pravila:

1. Koristi informacije iz konteksta priče kao temelj za pisanje
2. Održi dosljednost s postojećim likovima, lokacijama i događajima
3. Piši prirodno, elokventno i angažirajuće
4. Fokusiraj se na emocije, dijalog i atmosferu
5. Kreiraj živi, dinamičan sadržaj koji čitatelja uvlači u priču

FORMAT ODGOVORA:
Generiraj samo kreativni sadržaj bez dodatnih objašnjenja ili komentara.

STIL PISANJA:
- Koristi živi, opisni jezik
- Uključi dijalog gdje je to prikladno
- Stvori atmosferu i emocionalnu dubinu
- Održi konzistentan ton s kontekstom priče`;

    console.log("[GENERATE_DRAFT] Calling AI provider for draft generation");
    
    const draft = await aiProvider.generateText(systemPrompt, options);
    
    console.log("[GENERATE_DRAFT] AI response received, length:", draft.length);
    console.log("[GENERATE_DRAFT] Draft preview:", draft.substring(0, 200) + "...");

    console.log("[GENERATE_DRAFT] Completed successfully");

    return {
      draft: draft.trim()
    };

  } catch (error) {
    console.error("[GENERATE_DRAFT] Error during draft generation:", error);
    
    // Graceful degradation
    return {
      draft: `Greška prilikom generiranja nacrta: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
    };
  }
}

/**
 * Čvor za kritiku nacrta kreativnog sadržaja
 * 
 * Koristi Anthropic Haiku model za analizu i kritiku nacrta
 * 
 * @param state - Trenutno stanje agenta
 * @returns Ažuriranje stanja s critique poljem i povećanim draftCount
 */
export async function critiqueDraftNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[CRITIQUE_DRAFT] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    hasDraft: !!state.draft,
    draftLength: state.draft?.length || 0,
    currentDraftCount: state.draftCount
  });

  try {
    if (!state.draft) {
      console.error("[CRITIQUE_DRAFT] Error: No draft available for critique");
      return {
        critique: JSON.stringify({
          issues: ["Nema dostupnog nacrta za kritiku"],
          plan: "Potrebno je prvo generirati nacrt",
          score: 0,
          stop: true
        }),
        draftCount: state.draftCount + 1
      };
    }

    if (!state.userInput || !state.ragContext) {
      console.warn("[CRITIQUE_DRAFT] Warning: Missing context for proper critique");
    }

    // Kreiranje AI providera s Anthropic Haiku konfigurацijom
    const aiProvider = await createDefaultAIProvider();
    
    // Konfiguracija za kritiku (niska temperatura za konzistentnost)
    const options: AIGenerationOptions = {
      temperature: 0.2, // Niska temperatura za konzistentnu kritiku
      maxTokens: 500,   // Strukturirana JSON kritika
      timeout: 20000    // 20 sekundi
    };

    // Sistemski prompt za kritiku
    const systemPrompt = `Ti si AI Mentor, strogi ali pošteni urednik kreativnog pisanja.

Tvoj zadatak je pregledati sljedeći NACRT i osigurati da je 100% usklađen s pruženim KONTEKSTOM i korisničkim zahtjevom.

ORIGINALNI KORISNIČKI ZAHTJEV:
${state.userInput || "Nije dostupan"}

KONTEKST PRIČE (Smjernice koje se moraju poštovati):
${state.ragContext || "Nije dostupan"}

NACRT (Tekst koji se pregledava):
${state.draft}

ZADATAK:
Analiziraj nacrt prema sljedećim kriterijima:

1. **Provjera Koherentnosti:** Pronađi BILO KAKVE činjenične kontradikcije između NACRTA i KONTEKSTA. Jesu li imena likova, lokacije i prošli događaji točno preneseni?

2. **Provjera Dosljednosti Lika:** Odstupa li ponašanje lika u NACRTU od njegovog profila u KONTEKSTU?

3. **Provjera Potpunosti:** Je li NACRT ispunio SVE zahtjeve iz originalnog korisničkog upita?

4. **Provjera Kvalitete:** Je li pisanje elokventno, angažirajuće i emocionalno uvjerljivo?

VAŽNO: Vrati SAMO JSON objekt sa svojim povratnim informacijama:
{
  "issues": ["Popis konkretnih problema koji trebaju ispravak..."],
  "plan": "Kratki plan kako poboljšati nacrt",
  "score": <ocjena od 0-100 o ukupnoj kvaliteti>,
  "stop": <true ako je nacrt zadovoljavajući (score >= 85), false ako treba poboljšanje>
}`;

    console.log("[CRITIQUE_DRAFT] Calling AI provider for critique generation");
    
    const aiResponse = await aiProvider.generateText(systemPrompt, options);
    
    console.log("[CRITIQUE_DRAFT] AI response received:", aiResponse);

    // Pokušaj parsirati JSON odgovor
    let critique = aiResponse.trim();
    try {
      // Provjeri je li odgovor valjan JSON
      const parsed = JSON.parse(critique);
      console.log("[CRITIQUE_DRAFT] JSON critique parsed successfully:", parsed);
    } catch (jsonError) {
      console.warn("[CRITIQUE_DRAFT] AI response is not valid JSON, wrapping in default structure");
      critique = JSON.stringify({
        issues: ["AI je dao nestrukturirani odgovor"],
        plan: aiResponse.substring(0, 200),
        score: 50,
        stop: false
      });
    }

    const newDraftCount = state.draftCount + 1;
    console.log("[CRITIQUE_DRAFT] Completed successfully, draftCount:", newDraftCount);

    return {
      critique,
      draftCount: newDraftCount
    };

  } catch (error) {
    console.error("[CRITIQUE_DRAFT] Error during critique generation:", error);
    
    // Graceful degradation
    const fallbackCritique = JSON.stringify({
      issues: [`Greška prilikom kritike: ${error instanceof Error ? error.message : 'Nepoznata greška'}`],
      plan: "Pokušaj ponovno generirati nacrt",
      score: 0,
      stop: true
    });

    return {
      critique: fallbackCritique,
      draftCount: state.draftCount + 1
    };
  }
}

/**
 * Čvor za poboljšanje nacrta na temelju kritike
 * 
 * Koristi Anthropic Haiku model za poboljšanje postojećeg nacrta
 * 
 * @param state - Trenutno stanje agenta
 * @returns Ažuriranje stanja s poboljšanim draft poljem
 */
export async function refineDraftNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[REFINE_DRAFT] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    hasDraft: !!state.draft,
    hasCritique: !!state.critique,
    draftCount: state.draftCount
  });

  try {
    if (!state.draft) {
      console.error("[REFINE_DRAFT] Error: No draft available for refinement");
      return {
        draft: "Greška: Nema dostupnog nacrta za poboljšanje."
      };
    }

    if (!state.critique) {
      console.error("[REFINE_DRAFT] Error: No critique available for refinement");
      return {
        draft: state.draft // Vrati postojeći draft ako nema kritike
      };
    }

    // Kreiranje AI providera s Anthropic Haiku konfigurацijom
    const aiProvider = await createDefaultAIProvider();
    
    // Konfiguracija za poboljšanje (umjerena kreativnost)
    const options: AIGenerationOptions = {
      temperature: 0.6, // Umjerena kreativnost za poboljšanje
      maxTokens: 1000,  // Poboljšana verzija
      timeout: 30000    // 30 sekundi
    };

    // Sistemski prompt za poboljšanje
    const systemPrompt = `Ti si AI Pisac, ekspert za kreativno pisanje priča.

Tvoj zadatak je poboljšati postojeći nacrt na temelju dobivene kritike od AI Mentora.

ORIGINALNI KORISNIČKI ZAHTJEV:
${state.userInput || "Nije dostupan"}

KONTEKST PRIČE:
${state.ragContext || "Nije dostupan"}

POSTOJEĆI NACRT:
${state.draft}

KRITIKA OD AI MENTORA:
${state.critique}

ZADATAK:
Poboljšaj postojeći nacrt adresiranjem svih problema spomenutih u kritici. Slijedi ova pravila:

1. Pažljivo pročitaj kritiku i identificiraj sve probleme
2. Zadrži sve dobre dijelove originalnog nacrta
3. Poboljšaj ili zamijeni problematične dijelove
4. Osiguraj da poboljšana verzija zadovoljava sve zahtjeve iz kritike
5. Održi ili poboljšaj kreativnost i kvalitetu pisanja

FORMAT ODGOVORA:
Generiraj samo poboljšani kreativni sadržaj bez dodatnih objašnjenja.

CILJ:
Stvori verziju koja će zadovoljiti AI Mentora i dobiti ocjenu 85+ bodova.`;

    console.log("[REFINE_DRAFT] Calling AI provider for draft refinement");
    
    const refinedDraft = await aiProvider.generateText(systemPrompt, options);
    
    console.log("[REFINE_DRAFT] AI response received, length:", refinedDraft.length);
    console.log("[REFINE_DRAFT] Refined draft preview:", refinedDraft.substring(0, 200) + "...");

    console.log("[REFINE_DRAFT] Completed successfully");

    return {
      draft: refinedDraft.trim()
    };

  } catch (error) {
    console.error("[REFINE_DRAFT] Error during draft refinement:", error);
    
    // Graceful degradation - vrati postojeći draft
    console.log("[REFINE_DRAFT] Falling back to original draft due to error");
    
    return {
      draft: state.draft || `Greška prilikom poboljšanja nacrta: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
    };
  }
}