import type { AgentState, AgentStateUpdate } from './state';
import { getRelevantContext } from '../ai.retriever';
import { createPreferredAIProvider } from '../../ai.factory';
import type { AIGenerationOptions } from '../../ai.service';
import { getPlannerSystemPrompt } from '../planner.prompts';

/**
 * Ovaj modul sadrži implementacije čvorova koji se koriste u LangGraph grafu
 * za RAG (Retrieval-Augmented Generation) funkcionalnost.
 */

/**
 * Čvor za dohvaćanje relevantnog konteksta iz vektorske baze
 */
export async function retrieveContextNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[RETRIEVE_CONTEXT] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    transformedQuery: state.transformedQuery?.substring(0, 100) + "..." || "not available",
    hasStoryContext: !!state.storyContext
  });

  try {
    const query = state.transformedQuery || state.userInput;

    if (!query) {
      console.error("[RETRIEVE_CONTEXT] Error: No query available");
      return {
        ragContext: "Greška: Nema dostupnog upita za pretraživanje konteksta."
      };
    }

    const ragContext = await getRelevantContext(query, 5);

    return {
      ragContext
    };

  } catch (error) {
    console.error("[RETRIEVE_CONTEXT] Error during context retrieval:", error);
    return {
      ragContext: `Greška prilikom dohvaćanja konteksta: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
    };
  }
}

/**
 * Čvor za transformaciju korisničkog upita pomoću AI Mentora
 */
export async function transformQueryNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[TRANSFORM_QUERY] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
  });

  try {
    if (!state.userInput) {
      return { transformedQuery: "" };
    }

    const aiProvider = await createPreferredAIProvider('anthropic');
    const options: AIGenerationOptions = {
      temperature: 0.3,
      maxTokens: 200,
      timeout: 10000
    };

    const systemPrompt = `Ti si AI Mentor, ekspert za RAG pretraživanje.
Transformiraj korisnički upit u 3-5 specifičnih upita za vektorsko pretraživanje.

KONTEKST PRIČE:
${state.storyContext || "Nema dostupnog konteksta priče."}

KORISNIČKI UPIT:
${state.userInput}

FORMAT ODGOVORA:
Samo transformirani upiti, svaki u novom redu.`;

    const transformedQuery = await aiProvider.generateText(systemPrompt, options);

    return {
      transformedQuery: transformedQuery.trim()
    };

  } catch (error) {
    console.error("[TRANSFORM_QUERY] Error:", error);
    return {
      transformedQuery: state.userInput
    };
  }
}

/**
 * Čvor za usmjeravanje zadatka na temelju AI klasifikacije
 */
export async function routeTaskNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[ROUTE_TASK] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "...",
    mode: state.mode
  });

  try {
    if (!state.userInput) {
      return { routingDecision: "cannot_answer" };
    }

    // 1. Direktno usmjeravanje na temelju moda
    if (state.mode === 'writer' || state.mode === 'brainstorming') {
      console.log(`[ROUTE_TASK] Mode is '${state.mode}', routing directly to creative_generation`);
      return { routingDecision: "creative_generation" };
    }

    // 2. AI Klasifikacija za ostale modove (npr. planner ili default)
    const aiProvider = await createPreferredAIProvider('anthropic');
    const options: AIGenerationOptions = {
      temperature: 0.1,
      maxTokens: 50,
      timeout: 5000
    };

    const systemPrompt = `Ti si AI Router. Tvoj zadatak je klasificirati korisnički upit u jednu od 3 kategorije:
1. "simple_retrieval" - Pitanja o činjenicama iz priče (Tko je, Gdje je, Što se dogodilo).
2. "creative_generation" - Zahtjevi za pisanjem novog sadržaja, ideja, dijaloga ili scena.
3. "text_modification" - Zahtjevi za izmjenom postojećeg teksta (skrati, proširi, promijeni ton).

KORISNIČKI UPIT:
${state.userInput}

ODGOVOR:
Samo naziv kategorije.`;

    const classification = await aiProvider.generateText(systemPrompt, options);
    const decision = classification.trim().toLowerCase();

    let routingDecision = "cannot_answer";
    if (decision.includes("simple")) routingDecision = "simple_retrieval";
    else if (decision.includes("creative") || decision.includes("generation")) routingDecision = "creative_generation";
    else if (decision.includes("modification") || decision.includes("change") || decision.includes("edit")) routingDecision = "text_modification";
    else routingDecision = "creative_generation"; // Default fallback

    console.log("[ROUTE_TASK] AI Decision:", routingDecision);

    return { routingDecision: routingDecision as any };

  } catch (error) {
    console.error("[ROUTE_TASK] Error:", error);
    return { routingDecision: "creative_generation" }; // Fallback na generiranje
  }
}

/**
 * Čvor za jednostavne RAG odgovore
 */
export async function handleSimpleRetrievalNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[HANDLE_SIMPLE_RETRIEVAL] Starting");

  try {
    const aiProvider = await createPreferredAIProvider('anthropic');
    const options: AIGenerationOptions = {
      temperature: 0.3,
      maxTokens: 500,
      timeout: 15000
    };

    const systemPrompt = `Ti si AI Asistent za pisce. Odgovori na pitanje koristeći ISKLJUČIVO kontekst priče.

KONTEKST:
${state.ragContext}

PITANJE:
${state.userInput}

ODGOVOR:`;

    const answer = await aiProvider.generateText(systemPrompt, options);

    return {
      finalOutput: answer.trim()
    };

  } catch (error) {
    console.error("[HANDLE_SIMPLE_RETRIEVAL] Error:", error);
    return {
      finalOutput: "Greška prilikom generiranja odgovora."
    };
  }
}

/**
 * Čvor za generiranje nacrta (Draft)
 */
export async function generateDraftNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[GENERATE_DRAFT] Starting with mode:", state.mode);

  try {
    const options: AIGenerationOptions = {
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 45000
    };

    let systemPrompt = "";
    let aiProvider;

    if (state.mode === 'brainstorming') {
      // Brainstorming koristi OpenAI (ChatGPT)
      aiProvider = await createPreferredAIProvider('openai');

      systemPrompt = `You are a helpful assistant.

${state.userInput}`;

    } else if (state.mode === 'writer') {
      // Writer mode koristi Anthropic (Haiku/Sonnet)
      aiProvider = await createPreferredAIProvider('anthropic');

      // Writer mode prioritetizira editorContent
      systemPrompt = `Ti si AI Ko-autor. Nastavi pisati priču ili scenu na temelju trenutnog teksta u editoru i korisnikovih uputa.
Stil i ton moraju odgovarati postojećem tekstu.

TRENUTNI TEKST U EDITORU:
${state.editorContent || "(Prazno)"}

KONTEKST PRIČE (iz baze):
${state.ragContext || "Nema dodatnog konteksta."}

UPUTE ZA NASTAVAK:
${state.userInput}

ZADATAK:
Napiši nastavak teksta. Ne ponavljaj postojeći tekst, samo nastavi gdje je stalo.`;

    } else if (state.mode === 'planner') {
      // Planner mode koristi default (Anthropic)
      aiProvider = await createPreferredAIProvider('anthropic');

      // Planner mode koristi specifične prompte
      systemPrompt = getPlannerSystemPrompt(state.plannerContext || 'general');
      // Dodajemo kontekst na kraj ako nije u promptu
      systemPrompt += `\n\nKONTEKST PRIČE:\n${state.ragContext || state.storyContext}`;
      systemPrompt += `\n\nZAHTJEV:\n${state.userInput}`;

    } else {
      // Default Story Writer mode
      aiProvider = await createPreferredAIProvider('anthropic');

      systemPrompt = `Ti si AI Pisac. Tvoj zadatak je napisati scenu ili dio priče na temelju zahtjeva.
Koristi elemente iz konteksta priče.

KONTEKST PRIČE:
${state.ragContext}

ZAHTJEV:
${state.userInput}`;
    }

    const draft = await aiProvider.generateText(systemPrompt, options);

    return {
      draft: draft.trim(),
      draftCount: 1
    };

  } catch (error) {
    console.error("[GENERATE_DRAFT] Error:", error);
    return {
      draft: `Greška prilikom generiranja nacrta: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Čvor za kritiku nacrta
 */
export async function critiqueDraftNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[CRITIQUE_DRAFT] Starting");

  try {
    if (!state.draft) {
      return {
        critique: JSON.stringify({ score: 0, stop: true, issues: ["Nema nacrta"] }),
        draftCount: state.draftCount + 1
      };
    }

    const aiProvider = await createPreferredAIProvider('anthropic');
    const options: AIGenerationOptions = {
      temperature: 0.2,
      maxTokens: 500,
      timeout: 20000
    };

    const systemPrompt = `Ti si AI Kritičar. Analiziraj tekst i provjeri usklađenost s kontekstom.

KONTEKST:
${state.ragContext}

NACRT:
${state.draft}

ODGOVOR (JSON):
{
  "issues": ["popis problema"],
  "score": 0-100,
  "stop": boolean (true ako je score > 85)
}`;

    let critique = await aiProvider.generateText(systemPrompt, options);

    // Osiguraj validan JSON
    try {
      JSON.parse(critique);
    } catch {
      critique = JSON.stringify({
        issues: ["AI output invalid JSON"],
        score: 50,
        stop: false,
        raw: critique
      });
    }

    return {
      critique,
      draftCount: state.draftCount + 1
    };

  } catch (error) {
    console.error("[CRITIQUE_DRAFT] Error:", error);
    return {
      critique: JSON.stringify({ score: 0, stop: true, error: "Critique failed" }),
      draftCount: state.draftCount + 1
    };
  }
}

/**
 * Čvor za poboljšanje nacrta
 */
export async function refineDraftNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[REFINE_DRAFT] Starting");

  try {
    if (!state.draft || !state.critique) {
      return { draft: state.draft };
    }

    const aiProvider = await createPreferredAIProvider('anthropic');
    const options: AIGenerationOptions = {
      temperature: 0.6,
      maxTokens: 1000,
      timeout: 30000
    };

    const systemPrompt = `Ti si AI Urednik. Poboljšaj tekst na temelju kritike.

KRITIKA:
${state.critique}

TEKST:
${state.draft}

POBOLJŠANI TEKST:`;

    const refinedDraft = await aiProvider.generateText(systemPrompt, options);

    return {
      draft: refinedDraft.trim()
    };

  } catch (error) {
    console.error("[REFINE_DRAFT] Error:", error);
    return { draft: state.draft };
  }
}

/**
 * Čvor za modifikaciju teksta
 */
export async function modifyTextNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[MODIFY_TEXT] Starting");

  try {
    const aiProvider = await createPreferredAIProvider('anthropic');
    const options: AIGenerationOptions = {
      temperature: 0.3,
      maxTokens: 1000,
      timeout: 30000
    };

    const systemPrompt = `Ti si AI Urednik. Modificiraj tekst prema uputama.

UPUTE:
${state.userInput}

MODIFICIRANI TEKST:`;

    const modifiedText = await aiProvider.generateText(systemPrompt, options);

    return {
      draft: modifiedText.trim(),
      finalOutput: modifiedText.trim()
    };

  } catch (error) {
    console.error("[MODIFY_TEXT] Error:", error);
    return { draft: "Greška pri modifikaciji." };
  }
}