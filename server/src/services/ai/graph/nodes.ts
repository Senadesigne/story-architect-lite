import type { AgentState, AgentStateUpdate } from './state';
import { getRelevantContext } from '../ai.retriever';
import { createPreferredAIProvider, createManagerProvider, createWorkerProvider } from '../../ai.factory';
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
    if (state.mode === 'writer' || state.mode === 'brainstorming' || state.mode === 'contextual-edit') {
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
 * Čvor za pripremu konteksta i prompta (Manager)
 */
export async function managerContextNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[MANAGER_CONTEXT] Starting with mode:", state.mode);

  try {
    const aiProvider = await createManagerProvider();
    const options: AIGenerationOptions = {
      temperature: 0.4,
      maxTokens: 1000,
      timeout: 30000
    };

    let workerPrompt = "";
    let analysis = "";

    if (state.mode === 'brainstorming') {
      // Brainstorming logika
      const history = state.messages && state.messages.length > 0
        ? state.messages.map(m => {
          const role = (m as any).role || (m.getType ? m.getType() : 'assistant');
          return `${role === 'user' || role === 'human' ? 'User' : 'Assistant'}: ${m.content}`;
        }).join('\n')
        : "Nema prethodnih poruka.";

      const systemPrompt = `Ti si Manager Brainstorming sesije. Tvoj zadatak je analizirati povijest razgovora i trenutni zahtjev korisnika, te kreirati precizan prompt za Workera (AI model koji će generirati odgovor).

POVIJEST RAZGOVORA:
${history}

TRENUTNI ZAHTJEV KORISNIKA:
${state.userInput}

ZADATAK:
1. Identificiraj ključne teme i ideje iz povijesti.
2. Formuliraj jasne instrukcije za Workera kako da odgovori na trenutni zahtjev, uzimajući u obzir kontekst.
3. Ako je zahtjev nepovezan s povijesti, ignoriraj povijest.

OUTPUT FORMAT:
Samo tekst prompta za Workera. BEZ UVODNIH REČENICA (npr. "Evo prompta", "Prompt za workera"). SAMO INSTRUKCIJE.`;

      workerPrompt = await aiProvider.generateText(systemPrompt, options);

      // Cleanup common prefixes if AI ignores instructions
      workerPrompt = workerPrompt.replace(/^(Evo|Here is|Ovo je).*?:/i, '').trim();

      analysis = "Brainstorming context analyzed.";

    } else if (state.mode === 'writer') {
      // Writer logika
      const systemPrompt = `Ti si Urednik (Manager) knjige. Tvoj zadatak je pripremiti instrukcije za Pisca (Worker) koji će napisati ili nastaviti tekst.

KONTEKST PRIČE (iz baze):
${state.ragContext || "Nema dodatnog konteksta."}

TRENUTNI TEKST U EDITORU:
${state.editorContent || "(Prazno)"}

ZAHTJEV KORISNIKA:
${state.userInput}

ZADATAK:
1. Analiziraj stil i ton trenutnog teksta.
2. Poveži zahtjev korisnika s kontekstom priče.
3. Napiši detaljan prompt za Pisca koji sadrži:
    - Ulogu (npr. "Ti si ko-autor...")
    - Kontekst (sažeto ono što je bitno za ovu scenu)
    - Stil i ton (kako treba pisati)
    - Konkretan zadatak (što točno napisati)

OUTPUT FORMAT:
Samo tekst prompta za Pisca. BEZ UVODNIH REČENICA. SAMO INSTRUKCIJE.`;

      workerPrompt = await aiProvider.generateText(systemPrompt, options);

      // Cleanup common prefixes
      workerPrompt = workerPrompt.replace(/^(Evo|Here is|Ovo je).*?:/i, '').trim();

      analysis = "Writer context analyzed.";

    } else if (state.mode === 'contextual-edit') {
      // Contextual Editing logika
      const systemPrompt = `Ti si Glavni Urednik. Tvoj cilj je usmjeriti Pisca (Workera) da napravi preciznu izmjenu u tekstu.

1. ANALIZA:
   - Pročitaj PUNI TEKST da shvatiš ton, stil i radnju.
   - Fokusiraj se na SELEKTIRANI DIO koji treba mijenjati.

2. KONTEKST:
   - Puni tekst: """${state.editorContent || "(Prazno)"}"""
   - Selektirani dio: """${state.selection || "(Nema selekcije)"}"""

3. KORISNIČKI ZAHTJEV:
   "Prepiši označeni dio da bude bolji, ali da paše u cjelinu."

4. TVOJ ZADATAK:
   Napiši instrukciju (Prompt) za Pisca.
   - Reci Piscu točno što da napiše.
   - Upozori ga da pazi na "šavove" (kako se tekst spaja s onim prije i poslije).
   - Neka generira SAMO novi tekst zamjene, bez komentara.
   - KRITIČNO: ZABRANJENO JE VRAĆATI CIJELI TEKST. Vrati samo i isključivo prepravljeni dio.

   STRUKTURA PROMPTA KOJI GENERIRAŠ:
   
   ### OUTPUT CONSTRAINT (CRITICAL)
   RETURN ONLY A JSON OBJECT.
   - DO NOT return the full document.
   - DO NOT include the context.
   - DO NOT include explanations.
   - The output must be valid JSON with a single field "replacement".

   JSON FORMAT:
   {
     "replacement": "Your rewritten text here"
   }

   ### CONTEXT
   (Ovdje stavi Puni tekst da pisac ima kontekst)

   ### TARGET SELECTION
   (Ovdje stavi samo dio koji se mijenja)

   ### INSTRUCTION
   (Tvoja uputa piscu što da radi s tim dijelom. Npr. "Prepiši ovo da bude dramatičnije...")

OUTPUT (Samo prompt za pisca):`;

      workerPrompt = await aiProvider.generateText(systemPrompt, options);

      // Cleanup common prefixes
      workerPrompt = workerPrompt.replace(/^(Evo|Here is|Ovo je).*?:/i, '').trim();

      analysis = "Contextual Edit prepared.";

    } else {
      // Default / Planner logika
      const systemPrompt = getPlannerSystemPrompt(state.plannerContext || 'general') +
        `\n\nKONTEKST: ${state.ragContext}\nZAHTJEV: ${state.userInput}\n\nZADATAK: Pretvori ovo u prompt za Workera koji će generirati sadržaj. SAMO TEKST PROMPTA.`;

      workerPrompt = await aiProvider.generateText(systemPrompt, options);
      workerPrompt = workerPrompt.replace(/^(Evo|Here is|Ovo je).*?:/i, '').trim();

      analysis = "Planner context analyzed.";
    }

    return {
      workerPrompt,
      managerAnalysis: analysis
    };

  } catch (error) {
    console.error("[MANAGER_CONTEXT] Error:", error);
    return {
      workerPrompt: state.userInput,
      managerAnalysis: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Čvor za generiranje teksta (Worker)
 */
export async function workerGenerationNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[WORKER_GENERATION] Starting");

  try {
    const aiProvider = await createWorkerProvider();
    const options: AIGenerationOptions = {
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 45000
    };

    const systemPrompt = state.workerPrompt || state.userInput;

    const draft = await aiProvider.generateText(systemPrompt, options);

    // Try to parse JSON if the prompt requested it (heuristic or explicit mode check)
    // For now, we'll try to parse and if it has "replacement", use that.
    let finalOutput = draft.trim();
    try {
      // Find JSON object in the output (in case of extra text)
      const jsonMatch = finalOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.replacement) {
          finalOutput = parsed.replacement;
        }
      }
    } catch (e) {
      // If parsing fails, DO NOT use the original text as fallback if it looks like a full document.
      // Instead, return an error or empty string to prevent duplication.
      console.error("[WORKER_GENERATION] Failed to parse JSON", e);
      finalOutput = ""; // Fail safe: return nothing rather than full text
    }

    return {
      draft: finalOutput, // Update draft to be the clean text
      finalOutput: finalOutput,
      draftCount: 1
    };

  } catch (error) {
    console.error("[WORKER_GENERATION] Error:", error);
    return {
      draft: `Greška prilikom generiranja: ${error instanceof Error ? error.message : String(error)}`
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

    // Manager radi kritiku
    const aiProvider = await createManagerProvider();
    const options: AIGenerationOptions = {
      temperature: 0.2,
      maxTokens: 500,
      timeout: 20000
    };

    const systemPrompt = `Ti si AI Kritičar.Analiziraj tekst i provjeri usklađenost s kontekstom.

      KONTEKST:
${state.ragContext}

    NACRT:
${state.draft}

    ODGOVOR(JSON):
    {
      "issues": ["popis problema"],
        "score": 0 - 100,
          "stop": boolean(true ako je score > 85)
    } `;

    let critique = await aiProvider.generateText(systemPrompt, options);

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

    // Worker radi poboljšanje
    const aiProvider = await createWorkerProvider();
    const options: AIGenerationOptions = {
      temperature: 0.6,
      maxTokens: 1000,
      timeout: 30000
    };

    const systemPrompt = `Ti si AI Urednik.Poboljšaj tekst na temelju kritike.

      KRITIKA:
${state.critique}

    TEKST:
${state.draft}

POBOLJŠANI TEKST: `;

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
    // Worker radi modifikaciju
    const aiProvider = await createWorkerProvider();
    const options: AIGenerationOptions = {
      temperature: 0.3,
      maxTokens: 1000,
      timeout: 30000
    };

    const systemPrompt = `Ti si AI Urednik.Modificiraj tekst prema uputama.

      UPUTE:
${state.userInput}

MODIFICIRANI TEKST: `;

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

/**
 * Čvor za finalizaciju izlaza
 */
export async function finalOutputNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("--- FINALIZACIJA IZLAZA ---");
  return { finalOutput: state.draft };
}