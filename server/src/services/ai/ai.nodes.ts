import { AgentState } from './ai.state';
import { getRelevantContext } from './ai.retriever';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createManagerProvider, createWorkerProvider } from './ai.factory';

/**
 * Čvor 1: Transformira korisnički upit u bolji upit za RAG.
 * Koristi Managera (Claude Haiku).
 */
export async function transformQueryNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 1: TRANSFORMACIJA UPITA ---");

  try {
    const mentor = createManagerProvider(0.0);

    const systemPrompt = `Ti si ekspert za RAG. Korisnikov upit je zahtjev za kreativno pisanje. Pretvori ovaj upit u 3-5 specifičnih, hipotetskih upita optimiziranih za pretraživanje vektorske baze kako bi se prikupio sav potreban kontekst za pisanje scene. Fokusiraj se na dohvaćanje profila likova, relevantnih prošlih događaja, lokacija i ključnih objekata. Vrati samo listu upita, odvojenu novim redom (npr. "Profil lika Ana\nProšla svađa Ane i Marka").`;

    const response = await mentor.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(state.userInput),
    ]);

    const transformedQuery = response.content.toString();

    console.log("Transformirani upit:", transformedQuery);
    return { transformedQuery: transformedQuery };

  } catch (error) {
    console.error("Greška u transformQueryNode:", error);
    return { transformedQuery: state.userInput };
  }
}

/**
 * Čvor 2: Dohvaća kontekst iz vektorske baze.
 * (Nema promjene u modelu, samo logika)
 */
export async function retrieveContextNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 2: DOHVAĆANJE KONTEKSTA ---");
  const query = state.transformedQuery ?? state.userInput;

  const ragContext = await getRelevantContext(query, 5);

  console.log("Dohvaćen RAG kontekst:", ragContext.substring(0, 100) + "...");
  return { ragContext: ragContext };
}

/**
 * Čvor 3: Usmjerava zadatak.
 * Koristi Managera.
 */
export async function routeTaskNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 3: USMJERAVANJE ZADATKA ---");

  try {
    const router = createManagerProvider(0.0);

    const systemPrompt = `Ti si 'AI Logističar' i usmjerivač zadataka. Tvoj zadatak je klasificirati korisnički upit u JEDNU od tri kategorije, na temelju upita i dohvaćenog RAG konteksta.

KATEGORIJE:
1. **simple_retrieval**: Upit traži jednostavnu činjenicu, sažetak ili informaciju koja je EKSPLICITNO prisutna u RAG kontekstu.
2. **creative_generation**: Upit zahtijeva novo, kreativno pisanje (npr. pisanje nove scene, dijaloga, opisa, brainstorminga).
3. **cannot_answer**: Upit traži nešto što nije povezano s pričom.

KORISNIČKI UPIT:
${state.userInput}

DOHVAĆENI RAG KONTEKST:
${state.ragContext || 'Nema konteksta.'}

Vrati samo JEDNU riječ - naziv kategorije.`;

    const response = await router.invoke([
      new SystemMessage(systemPrompt),
    ]);

    const decision = response.content.toString().trim().toLowerCase();
    const validDecisions = ["simple_retrieval", "creative_generation", "cannot_answer"];

    const routingDecision = validDecisions.includes(decision)
      ? decision as "simple_retrieval" | "creative_generation" | "cannot_answer"
      : "cannot_answer";

    console.log("Odluka usmjeravanja:", routingDecision);
    return { routingDecision };

  } catch (error) {
    console.error("Greška u routeTaskNode:", error);
    return { routingDecision: "creative_generation" };
  }
}

/**
 * Čvor 4: Jednostavno dohvaćanje.
 * Koristi Managera.
 */
export async function handleSimpleRetrievalNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 4: JEDNOSTAVNO DOHVAĆANJE ---");

  try {
    const mentor = createManagerProvider(0.3);

    const systemPrompt = `Ti si pomoćnik koji odgovara na pitanja o priči. Na temelju dohvaćenog konteksta, pruži jasan i koncizan odgovor na korisnikov upit.

KONTEKST PRIČE:
${state.ragContext || 'Nema dostupnog konteksta.'}

KORISNIČKI UPIT:
${state.userInput}`;

    const response = await mentor.invoke([
      new SystemMessage(systemPrompt),
    ]);

    const finalOutput = response.content.toString();
    return { finalOutput };

  } catch (error) {
    console.error("Greška u handleSimpleRetrievalNode:", error);
    return { finalOutput: "Greška pri obradi upita." };
  }
}

/**
 * Čvor 5a: Manager priprema kontekst (NOVO).
 * Koristi Managera.
 */
export async function managerContextNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 5a: MANAGER PRIPREMA KONTEKST ---");

  try {
    const manager = createManagerProvider(0.2);

    const systemPrompt = `Ti si 'AI Manager'. Tvoj zadatak je pripremiti detaljne upute i kontekst za 'AI Workera' koji će pisati tekst.
Analiziraj korisnički zahtjev i dohvaćeni kontekst.
Sažmi sve relevantne informacije u jedan jasan prompt koji će Workeru dati sve što mu treba za pisanje.
Nemoj pisati samu scenu, samo upute.

KORISNIČKI ZAHTJEV:
${state.userInput}

DOHVAĆENI KONTEKST:
${state.ragContext || 'Nema konteksta.'}`;

    const response = await manager.invoke([
      new SystemMessage(systemPrompt),
    ]);

    const workerPrompt = response.content.toString();
    console.log("Manager generirao prompt za Workera.");

    return { workerPrompt };

  } catch (error) {
    console.error("Greška u managerContextNode:", error);
    // Fallback: proslijedi originalni upit i kontekst
    return { workerPrompt: `Kontekst: ${state.ragContext}\n\nZadatak: ${state.userInput}` };
  }
}

/**
 * Čvor 5b: Worker generira tekst (bivši generateDraftNode).
 * Koristi Workera.
 */
export async function workerGenerationNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 5b: WORKER GENERIRA TEKST ---");

  try {
    const writer = createWorkerProvider(0.8);

    // Worker dobiva upute od Managera
    const prompt = state.workerPrompt || state.userInput;

    const systemPrompt = `Ti si 'AI Worker', talentirani kreativni pisac. Tvoj zadatak je napisati tekst isključivo na temelju uputa koje si dobio od svog Managera.
Nemoj komentirati upute, samo izvrši zadatak. Piši živopisno, emocionalno i stilski dotjerano.`;

    const response = await writer.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);

    const draft = response.content.toString();
    const newDraftCount = state.draftCount + 1;

    console.log(`Worker generirao nacrt #${newDraftCount}, duljina: ${draft.length}`);
    return {
      draft: draft,
      draftCount: newDraftCount
    };

  } catch (error) {
    console.error("Greška u workerGenerationNode:", error);
    return {
      draft: "Greška pri generiranju nacrta.",
      draftCount: state.draftCount + 1
    };
  }
}

/**
 * Čvor 6: Kritika.
 * Koristi Managera.
 */
export async function critiqueDraftNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 6: KRITIKA NACRTA ---");

  try {
    const critic = createManagerProvider(0.1);

    const systemPrompt = `Ti si 'AI Mentor', strogi urednik. Pregledaj NACRT i usporedi ga s KONTEKSTOM.

KONTEKST:
${state.ragContext || 'Nema specifičnog konteksta.'}

KORISNIČKI ZAHTJEV:
${state.userInput}

NACRT:
${state.draft}

Vrati SAMO JSON:
{
  "issues": ["..."],
  "suggestions": ["..."],
  "score": 0-100,
  "stop": boolean
}`;

    const response = await critic.invoke([
      new SystemMessage(systemPrompt),
    ]);

    const critique = response.content.toString();
    return { critique: critique };

  } catch (error) {
    console.error("Greška u critiqueDraftNode:", error);
    return {
      critique: JSON.stringify({ issues: [], suggestions: [], score: 100, stop: true })
    };
  }
}

/**
 * Čvor 7: Refiniranje.
 * Koristi Workera.
 */
export async function refineDraftNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 7: POBOLJŠAVANJE NACRTA ---");

  try {
    const refiner = createWorkerProvider(0.6);

    const systemPrompt = `Ti si pisac koji poboljšava tekst.
Original: ${state.draft}
Kritika: ${state.critique}

Poboljšaj tekst prema kritici.`;

    const response = await refiner.invoke([
      new SystemMessage(systemPrompt),
    ]);

    const refinedDraft = response.content.toString();
    return {
      draft: refinedDraft,
      draftCount: state.draftCount + 1
    };

  } catch (error) {
    console.error("Greška u refineDraftNode:", error);
    return { draft: state.draft, draftCount: state.draftCount + 1 };
  }
}