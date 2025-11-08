import { AgentState } from './ai.state';
import { getRelevantContext } from './ai.retriever';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

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
