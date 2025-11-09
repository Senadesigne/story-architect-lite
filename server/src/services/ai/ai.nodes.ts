import { AgentState } from './ai.state';
import { getRelevantContext } from './ai.retriever';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/community/chat_models/ollama';

/**
 * Čvor 1: Transformira korisnički upit u bolji upit za RAG.
 * Koristi "AI Mentora" (Anthropic Claude Haiku).
 */
export async function transformQueryNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 1: TRANSFORMACIJA UPITA ---");
  
  try {
    const mentor = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-haiku-20240307", // Koristimo brzi Haiku model
      temperature: 0.0,
    });

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
    // Vraćamo originalni upit kao fallback
    return { transformedQuery: state.userInput };
  }
}

/**
 * Čvor 2: Dohvaća kontekst iz vektorske baze.
 * Koristi "Logističara" (naš retriever).
 */
export async function retrieveContextNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 2: DOHVAĆANJE KONTEKSTA ---");
  const query = state.transformedQuery ?? state.userInput;
  
  // Pozivamo funkciju koju smo definirali u Zad. 3.8a
  const ragContext = await getRelevantContext(query, 5);
  
  console.log("Dohvaćen RAG kontekst:", ragContext.substring(0, 100) + "...");
  return { ragContext: ragContext };
}

/**
 * Čvor 3: Usmjerava zadatak na temelju korisničkog upita i konteksta.
 * Koristi "AI Mentora" (Lokalni LLM - Ollama) kao router.
 */
export async function routeTaskNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 3: USMJERAVANJE ZADATKA ---");
  
  try {
    const router = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-haiku-20240307",
      temperature: 0.0,
    });

    const systemPrompt = `Ti si 'AI Logističar' i usmjerivač zadataka. Tvoj zadatak je klasificirati korisnički upit u JEDNU od tri kategorije, na temelju upita i dohvaćenog RAG konteksta.

KATEGORIJE:
1. **simple_retrieval**: Upit traži jednostavnu činjenicu, sažetak ili informaciju koja je EKSPLICITNO prisutna u RAG kontekstu. (Npr. "Tko je...", "Što je...", "Podsjeti me...", "Gdje je...").
2. **creative_generation**: Upit zahtijeva novo, kreativno pisanje (npr. pisanje nove scene, dijaloga, opisa, brainstorminga) koje se oslanja na RAG kontekst, ali NIJE direktno u njemu. (Npr. "Napiši...", "Opiši...", "Generiraj...", "Zammisli...").
3. **cannot_answer**: Upit traži nešto što nije povezano s pričom ili RAG kontekst ne sadrži relevantne informacije za odgovor.

KORISNIČKI UPIT:
${state.userInput}

DOHVAĆENI RAG KONTEKST:
${state.ragContext || 'Nema konteksta.'}

Vrati samo JEDNU riječ - naziv kategorije (npr. "simple_retrieval").`;

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
    // Defaultno na kreativno generiranje ako je greška
    return { routingDecision: "creative_generation" };
  }
}

/**
 * Čvor 4: Obrađuje jednostavne upite za dohvaćanje informacija.
 * Koristi "AI Mentora" (Lokalni LLM - Ollama) za generiranje odgovora.
 */
export async function handleSimpleRetrievalNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("--- KORAK 4: JEDNOSTAVNO DOHVAĆANJE ---");
  
  try {
    const mentor = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-haiku-20240307",
      temperature: 0.3,
    });

    const systemPrompt = `Ti si pomoćnik koji odgovara na pitanja o priči. Na temelju dohvaćenog konteksta, pruži jasan i koncizan odgovor na korisnikov upit. Koristi samo informacije iz konteksta. Ako informacija nije dostupna, ljubazno to naglasi.

KONTEKST PRIČE:
${state.ragContext || 'Nema dostupnog konteksta.'}

KORISNIČKI UPIT:
${state.userInput}`;

    const response = await mentor.invoke([
      new SystemMessage(systemPrompt),
    ]);

    const finalOutput = response.content.toString();
    
    console.log("Generirani odgovor:", finalOutput.substring(0, 100) + "...");
    return { finalOutput };
    
  } catch (error) {
    console.error("Greška u handleSimpleRetrievalNode:", error);
    return { finalOutput: "Nažalost, dogodila se greška pri obradi vašeg upita. Molim pokušajte ponovo." };
  }
}
