import type { AgentState, AgentStateUpdate } from './state';
import { getRelevantContext } from '../ai.retriever';
import { createDefaultAIProvider } from '../../ai.service';
import type { AIGenerationOptions } from '../../ai.service';
import { getPlannerSystemPrompt } from '../planner.prompts';

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

STROŽA PRAVILA KLASIFIKACIJE:

KORAK 0: PROVJERA MODIFIKACIJSKIH UPITA (NAJVIŠI PRIORITET)
- Ako korisnički upit počinje s riječima poput "Prepravi", "Skrati", "Proširi", "Promijeni ton", "Poboljšaj" i sadrži tekst u navodnicima ili nakon dvotočke
- UVIJEK odaberi "text_modification"
- Modifikacija teksta NE KORISTI RAG kontekst i ide direktno na modificiranje

KORAK 1: PRVO provjeri može li se na korisnički upit odgovoriti IZRAVNO pomoću RAG konteksta.
- Ako RAG kontekst sadrži odgovor na pitanje, UVIJEK odaberi "simple_retrieval"
- Ne smije se odabrati "creative_generation" ako odgovor već postoji u RAG kontekstu

KORAK 2: Odaberi kategoriju prema sljedećim STROGIM kriterijima:

1. simple_retrieval - OBAVEZNO ako se odgovor može naći u RAG kontekstu
   Primjeri:
   - "O čemu se radi u priči?" (ako RAG sadrži logline/sažetak)
   - "Tko je glavni lik?" (ako RAG sadrži profile likova)
   - "Gdje se odvija radnja?" (ako RAG sadrži lokacije)
   - "Što se dogodilo u sceni X?" (ako RAG sadrži opis scene)
   - "Kako se zove Anin otac?" (ako RAG sadrži obiteljske veze)

2. text_modification - Odaberi za modifikaciju postojećeg teksta
   Primjeri:
   - "Prepravi sljedeći tekst: [tekst]"
   - "Skrati sljedeći tekst zadržavajući ključne informacije: [tekst]"
   - "Proširi i obogati sljedeći tekst: [tekst]"
   - "Promijeni ton sljedećeg teksta na formalniji: [tekst]"
   - "Poboljšaj sljedeći tekst: [tekst]"

3. creative_generation - Odaberi za kreiranje NOVOG sadržaja koji ne postoji u RAG kontekstu
   Primjeri:
   - "Napiši novu scenu gdje Ana..." (ako ta scena ne postoji u RAG-u)
   - "Generiraj dijalog između Ana i Marko..." (ako taj dijalog ne postoji u RAG-u)
   - "Opiši kako bi Ana reagirala na..." (ako ta reakcija nije opisana u RAG-u)

4. cannot_answer - Upit nije povezan s pričom ili nema dovoljno RAG konteksta
   Primjeri: "Kakvo je vrijeme danas?", "Što je glavni grad Francuske?"

POSEBNA PROVJERA ZA MODIFIKACIJU TEKSTA:
1. Sadrži li upit riječi poput "Prepravi", "Skrati", "Proširi", "Promijeni ton"?
2. Ako DA → automatski odaberi "text_modification"
3. Ako NE → nastavi s normalnom klasifikacijom

ZADATAK:
Pažljivo analiziraj RAG kontekst i korisnički upit prema STROGIM pravilima iznad.
Vrati SAMO jednu od sljedećih riječi:
- simple_retrieval
- text_modification
- creative_generation
- cannot_answer

KRITIČNO: 
- Za modifikacijske upite (Prepravi, Skrati, Proširi, Promijeni ton): UVIJEK odaberi "text_modification"
- Za ostale upite: Ako postoji sumnja, odaberi "simple_retrieval" umjesto "creative_generation"`;

    console.log("[ROUTE_TASK] Calling AI provider for task routing");
    
    const aiResponse = await aiProvider.generateText(systemPrompt, options);
    
    console.log("[ROUTE_TASK] AI response received:", aiResponse);

    // Normalizacija i validacija odgovora
    const normalizedResponse = aiResponse.trim().toLowerCase();
    console.log("[ROUTE_TASK] Normalized response:", normalizedResponse);
    let routingDecision: "simple_retrieval" | "text_modification" | "creative_generation" | "cannot_answer";

    if (normalizedResponse.includes("simple_retrieval")) {
      routingDecision = "simple_retrieval";
    } else if (normalizedResponse.includes("creative_generation")) {
      routingDecision = "creative_generation";
    } else if (normalizedResponse.includes("text_modification")) {
      routingDecision = "text_modification";
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
    const systemPrompt = `Ti si AI Mentor, ekspert za precizno dohvaćanje informacija iz konteksta priče.

Tvoja uloga je odgovoriti na korisnički upit koristeći ISKLJUČIVO informacije iz dostupnog konteksta priče.

KORISNIČKI UPIT:
${state.userInput}

KONTEKST PRIČE:
${state.ragContext}

STROŽA PRAVILA - OBVEZNO SLIJEDI:

1. **STROGO ZABRANJENO IZMIŠLJANJE**: Ne smije izmišljati, pretpostavljati ili dodavati bilo kakve informacije koje nisu EKSPLICITNO navedene u kontekstu priče.

2. **SAMO EKSPLICITNE INFORMACIJE**: Koristi isključivo činjenice koje su doslovno napisane u kontekstu. Čak i ako nešto "zvuči logično", ne smije se dodati ako nije eksplicitno spomenuto.

3. **OBVEZNO PRIZNAVANJE NEZNANJA**: Ako tražena informacija ne postoji u kontekstu, MORA jasno reći da informacija nije dostupna. Ne smije pokušavati "pogađati" ili "zaključivati".

4. **NAVOĐENJE IZVORA**: Kad god je moguće, navedi iz kojeg dijela konteksta uzima informaciju (npr. "Prema opisu lika...", "U sažetku scene...").

5. **PROVJERA PRIJE ODGOVORA**: Prije davanja odgovora, provjeri postoji li tražena informacija u kontekstu. Ako ne postoji, odmah reci da nije dostupna.

FORMAT ODGOVORA:
Direktan, precizan odgovor na hrvatski jezik. Ako informacija postoji u kontekstu, navedi je. Ako ne postoji, jasno to reci.

PRIMJERI ISPRAVNIH ODGOVORA:

Upit: "Kako se zove Anin otac?"
- Ako je u kontekstu: "Prema dostupnim informacijama, Anin otac se zove [ime iz konteksta]."
- Ako nije u kontekstu: "U dostupnom kontekstu priče nije spomenuto ime Aninog oca."

Upit: "O čemu se radi u priči?"
- Ako je logline u kontekstu: "Prema sažetku priče, radnja se bavi [opis iz konteksta]."
- Ako nema sažetka: "U dostupnom kontekstu nema jasnog sažetka o čemu se radi u priči."

KRITIČNO: Nikad ne dodavaj informacije koje nisu u kontekstu, čak i ako se čine očiglednima ili logičnima.

KRITIČNO PRAVILO ZA ODGOVOR:
Tvoj odgovor mora sadržavati **ISKLJUČIVO I SAMO** traženi tekst (kreativni sadržaj ili odgovor na pitanje).
NIKADA ne uključuj meta-komentare, objašnjenja, uvode ili fraze poput:
- "Evo poboljšane verzije..."
- "Razumijem kritiku..."
- "Poštovani AI Mentor..."
- "Nadam se da će..."

Generiraj SAMO čisti tekstualni odgovor.`;

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

    // Odabir System Prompta na temelju plannerContext-a
    let systemPrompt: string;
    
    if (state.plannerContext) {
      // Koristi planner-specifičan prompt
      console.log("[GENERATE_DRAFT] Using planner context:", state.plannerContext);
      systemPrompt = getPlannerSystemPrompt(state.plannerContext);
      
      // Dodaj kontekst priče na kraj planner prompta ako postoji
      if (state.ragContext) {
        systemPrompt += `\n\nKONTEKST PRIČE:\n${state.ragContext}\n\nKORISNIČKI ZAHTJEV:\n${state.userInput}`;
      } else {
        systemPrompt += `\n\nKORISNIČKI ZAHTJEV:\n${state.userInput}`;
      }
    } else {
      // Koristi standardni "Story Writer" prompt
      systemPrompt = `Ti si AI Pisac, ekspert za kreativno pisanje priča i scenarija.

Tvoja uloga je generirati kreativni sadržaj na temelju korisničkog zahtjeva, ali ISKLJUČIVO koristeći elemente iz dostupnog konteksta priče.

KORISNIČKI ZAHTJEV:
${state.userInput}

KONTEKST PRIČE:
${state.ragContext}

KRITIČNA PRAVILA - OBVEZNO SLIJEDI:

**KORAK 1: ANALIZA KONTEKSTA PRIJE PISANJA**
Prije početka pisanja, identificiraj iz konteksta priče:
- Sva imena likova koji su spomenuti
- Sve lokacije koje su opisane
- Sve ključne događaje koji su navedeni
- Sve postojeće odnose između likova

**KORAK 2: STROŽA ZABRANA IZMIŠLJANJA**

1. **STROGO ZABRANJENO UVOĐENJE NOVIH LIKOVA**: Ne smije kreirati, spomenuti ili koristiti likove koji nisu eksplicitno navedeni u kontekstu priče. Ako trebaš lik za scenu, koristi SAMO one iz konteksta.

2. **STROGO ZABRANJENO UVOĐENJE NOVIH LOKACIJA**: Ne smije kreirati nove lokacije, gradove, zemlje ili mjesta. Koristi SAMO lokacije koje su spomenute u kontekstu priče.

3. **STROGO ZABRANJENO IZMIŠLJANJE DOGAĐAJA**: Ne smije dodavati nove ključne događaje iz prošlosti likova koji nisu spomenuti u kontekstu.

4. **OBVEZNO KORIŠTENJE POSTOJEĆIH ELEMENATA**: Mora koristiti likove, lokacije i događaje koji JESU navedeni u kontekstu priče.

**KORAK 3: KREATIVNO PISANJE UNUTAR OGRANIČENJA**

Tvoja kreativnost se smije izraziti kroz:
- Dijalog između postojećih likova
- Emocionalne reakcije postojećih likova
- Atmosferu i opise postojećih lokacija
- Razvoj postojećih odnosa između likova
- Nove scene s postojećim likovima na postojećim lokacijama

**PRIMJER ZABRANJENOG PRISTUPA:**
❌ "Ana je srela novog lika po imenu Asha u Pustinji Korthana..."
(Asha i Pustinja Korthana nisu u kontekstu - ZABRANJENO!)

**PRIMJER ISPRAVNOG PRISTUPA:**
✅ "Ana je ušla u [lokacija iz konteksta] gdje je srela [lik iz konteksta]..."

**PROVJERA PRIJE SLANJA:**
Prije slanja nacrta, provjeri:
- Jesu li sva imena likova iz konteksta priče?
- Jesu li sve lokacije iz konteksta priče?
- Jesu li svi ključni događaji temeljeni na kontekstu priče?

FORMAT ODGOVORA:
Generiraj samo kreativni sadržaj koristeći ISKLJUČIVO elemente iz konteksta priče.

STIL PISANJA:
- Koristi živi, opisni jezik
- Uključi dijalog gdje je to prikladno
- Stvori atmosferu i emocionalnu dubinu
- Održi konzistentan ton s kontekstom priče

KRITIČNO: Ako nema dovoljno elemenata u kontekstu za ispunjavanje zahtjeva, reci da nema dovoljno informacija umjesto izmišljanja novih elemenata.

KRITIČNO PRAVILO ZA ODGOVOR:
Tvoj odgovor mora sadržavati **ISKLJUČIVO I SAMO** traženi tekst (kreativni sadržaj ili odgovor na pitanje).
NIKADA ne uključuj meta-komentare, objašnjenja, uvode ili fraze poput:
- "Evo poboljšane verzije..."
- "Razumijem kritiku..."
- "Poštovani AI Mentor..."
- "Nadam se da će..."

Generiraj SAMO čisti tekstualni odgovor.`;
    }

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
    const systemPrompt = `Ti si AI Mentor, NAJSTROŽI ČUVAR činjenične točnosti u sustavu za kreativno pisanje.

Tvoj JEDINI i NAJVAŽNIJI zadatak je provjeriti je li NACRT 100% činjenično usklađen s KONTEKSTOM PRIČE. Kvaliteta pisanja je SEKUNDARNA.

ORIGINALNI KORISNIČKI ZAHTJEV:
${state.userInput || "Nije dostupan"}

KONTEKST PRIČE (JEDINI IZVOR ISTINE):
${state.ragContext || "Nije dostupan"}

NACRT (Tekst koji se pregledava):
${state.draft}

KRITIČNA PRAVILA OCJENJIVANJA:

**KORAK 1: OBVEZNA PROVJERA ČINJENIČNE TOČNOSTI (PRIORITET #1)**

Provjeri SVAKI element u nacrtu:

1. **IMENA LIKOVA**: Postoji li SVAKI spomenuti lik u KONTEKSTU PRIČE?
   - Ako nacrt spominje bilo koji lik koji NIJE u kontekstu → AUTOMATSKI score: 0

2. **LOKACIJE**: Postoji li SVAKA spomenuta lokacija u KONTEKSTU PRIČE?
   - Ako nacrt spominje bilo koju lokaciju koja NIJE u kontekstu → AUTOMATSKI score: 0

3. **DOGAĐAJI**: Jesu li svi ključni događaji temeljeni na KONTEKSTU PRIČE?
   - Ako nacrt dodaje događaje koji NISU u kontekstu → AUTOMATSKI score: 0

4. **ODNOSI IZMEĐU LIKOVA**: Jesu li svi odnosi između likova usklađeni s KONTEKSTOM?
   - Ako nacrt mijenja odnose koji su definirani u kontekstu → AUTOMATSKI score: 0

**KORAK 2: OCJENJIVANJE PREMA STROGIM KRITERIJIMA**

- **Score 0-20**: Nacrt sadrži izmišljene likove, lokacije ili događaje koji NISU u kontekstu
- **Score 21-40**: Nacrt je uglavnom usklađen, ali ima manje činjenične greške
- **Score 41-60**: Nacrt je činjenično točan, ali nedostaju neki elementi iz konteksta
- **Score 61-80**: Nacrt je činjenično točan i koristi elemente iz konteksta
- **Score 81-100**: Nacrt je savršeno usklađen s kontekstom i kvalitetno napisan

**KRITIČNI PRIMJERI AUTOMATSKOG PADA (Score: 0)**:
- Spominjanje likova poput "Asha" koji nisu u kontekstu
- Spominjanje lokacija poput "Pustinja Korthana" koje nisu u kontekstu
- Dodavanje novih obiteljskih veza koje nisu spomenute u kontekstu
- Izmišljanje prošlih događaja koji nisu opisani u kontekstu

**VAŽNE NAPOMENE**:
- NE daj visoke ocjene samo zato što je tekst "lijepo napisan"
- Činjenična točnost je UVIJEK važnija od kvalitete pisanja
- Ako postoji BILO KAKVA sumnja o usklađenosti, daj nižu ocjenu

**OBVEZNI JSON FORMAT**:
{
  "issues": ["Detaljni popis SVIH činjeničnih grešaka i neusklađenosti s kontekstom"],
  "plan": "Konkretni plan ispravka činjeničnih grešaka",
  "score": <0-100, gdje 0 = sadrži izmišljene elemente, 100 = savršeno usklađeno>,
  "stop": <true samo ako je score >= 85 I nema činjeničnih grešaka, inače false>
}

KRITIČNO: Tvoja uloga je biti "čuvar istine" - bolje je odbaciti kreativno dobru priču koja nije činjenično točna nego prihvatiti netočnu priču.`;

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

Tvoj zadatak je poboljšati postojeći nacrt na temelju STROGE KRITIKE od AI Mentora koji je NAJSTROŽI ČUVAR činjenične točnosti.

ORIGINALNI KORISNIČKI ZAHTJEV:
${state.userInput || "Nije dostupan"}

KONTEKST PRIČE (JEDINI IZVOR ISTINE):
${state.ragContext || "Nije dostupan"}

POSTOJEĆI NACRT (koji treba popraviti):
${state.draft}

KRITIKA OD AI MENTORA (STROGA ANALIZA):
${state.critique}

KRITIČNA PRAVILA ZA POBOLJŠANJE:

**KORAK 1: ANALIZA KRITIKE**
Pažljivo analiziraj kritiku. AI Mentor je IZUZETNO STROG i daje niske ocjene (čak i 0) za bilo kakve činjenične greške.

**KORAK 2: STROŽA ZABRANA DODAVANJA NOVIH ELEMENATA**

Tijekom poboljšanja STROGO je ZABRANJENO:

1. **DODAVANJE NOVIH LIKOVA**: Ne smije dodavati nove likove koji nisu u KONTEKSTU PRIČE
2. **DODAVANJE NOVIH LOKACIJA**: Ne smije dodavati nove lokacije koje nisu u KONTEKSTU PRIČE  
3. **DODAVANJE NOVIH DOGAĐAJA**: Ne smije dodavati nove ključne događaje koji nisu u KONTEKSTU PRIČE
4. **MIJENJANJE POSTOJEĆIH ČINJENICA**: Ne smije mijenjati činjenice koje su definirane u KONTEKSTU PRIČE

**KORAK 3: OBVEZNI POSTUPAK POBOLJŠANJA**

1. **Ukloni SVE izmišljene elemente**: Ako kritika spominje izmišljene likove (npr. "Asha"), lokacije (npr. "Pustinja Korthana") ili događaje - UKLONI ih potpuno

2. **Zamijeni s elementima iz konteksta**: Koristi SAMO likove, lokacije i događaje koji su eksplicitno navedeni u KONTEKSTU PRIČE

3. **Zadrži dobru kreativnost**: Zadrži sve kreativne dijelove koji SU usklađeni s kontekstom (dijalog, emocije, atmosferu)

4. **Provjeri prije slanja**: Prije slanja, provjeri da poboljšana verzija sadrži SAMO elemente iz KONTEKSTA PRIČE

**PRIMJER ISPRAVNOG PRISTUPA**:
- Ako originalni nacrt spominje "Asha" → zamijeni s likom iz konteksta
- Ako originalni nacrt spominje "Pustinju Korthana" → zamijeni s lokacijom iz konteksta
- Ako originalni nacrt dodaje novi događaj → temeljiti na događajima iz konteksta

**CILJ**: Stvori verziju koja će proći STROGU INSPEKCIJU AI Mentora i dobiti ocjenu 85+ bodova.

**VAŽNO**: AI Mentor je nepopustljiv prema činjeničnim greškama. Bolje je imati jednostavniju priču koja je činjenično točna nego složenu priču s izmišljenim elementima.

FORMAT ODGOVORA:
Generiraj samo poboljšani kreativni sadržaj koristeći ISKLJUČIVO elemente iz KONTEKSTA PRIČE.

KRITIČNO: Tvoj uspjeh se mjeri time hoće li AI Mentor prihvatiti tvoju verziju. Budi poslušan njegovim uputama i ne dodavaj ništa što nije u kontekstu.

KRITIČNO PRAVILO ZA ODGOVOR:
Tvoj odgovor mora sadržavati **ISKLJUČIVO I SAMO** traženi tekst (kreativni sadržaj ili odgovor na pitanje).
NIKADA ne uključuj meta-komentare, objašnjenja, uvode ili fraze poput:
- "Evo poboljšane verzije..."
- "Razumijem kritiku..."
- "Poštovani AI Mentor..."
- "Nadam se da će..."

Generiraj SAMO čisti tekstualni odgovor.`;

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

/**
 * Čvor za modificiranje postojećeg teksta
 * 
 * Ovaj čvor je dizajniran za jednostavne modifikacije teksta poput:
 * - Prepravljanje
 * - Skraćivanje 
 * - Proširivanje
 * - Promjena tona
 * - Poboljšanje
 * 
 * Ne koristi RAG kontekst i ne prolazi kroz critique/refine petlju.
 * 
 * @param state - Trenutno stanje agenta
 * @returns Ažuriranje stanja s finalOutput poljem
 */
export async function modifyTextNode(state: AgentState): Promise<AgentStateUpdate> {
  console.log("[MODIFY_TEXT] Starting with input:", {
    userInput: state.userInput?.substring(0, 100) + "..."
  });

  try {
    if (!state.userInput) {
      console.error("[MODIFY_TEXT] Error: No userInput available");
      return {
        finalOutput: "Greška: Nema dostupnog teksta za modifikaciju."
      };
    }

    // Kreiranje AI providera s Anthropic Haiku konfigurацijom
    const aiProvider = await createDefaultAIProvider();
    
    // Konfiguracija za modifikaciju teksta (umjerena kreativnost)
    const options: AIGenerationOptions = {
      temperature: 0.3, // Niska temperatura za konzistentne modifikacije
      maxTokens: 800,   // Dovoljno za modificirani tekst
      timeout: 15000    // 15 sekundi timeout
    };

    // Sistemski prompt za modifikaciju teksta
    const systemPrompt = `Ti si AI Editor, ekspert za modifikaciju i poboljšanje teksta.

Tvoja uloga je modificirati postojeći tekst prema korisničkom zahtjevu.

KORISNIČKI ZAHTJEV:
${state.userInput}

PRAVILA MODIFIKACIJE:

1. **ZADRŽI ZNAČENJE**: Osnovno značenje i poruka teksta moraju ostati isti
2. **SLIJEDI INSTRUKCIJU**: Točno izvršiti što korisnik traži (skratiti, proširiti, promijeniti ton, itd.)
3. **ZADRŽI KONTEKST**: Ne dodavati nove likove, lokacije ili događaje koji nisu u originalnom tekstu
4. **VRATI SAMO MODIFICIRANI TEKST**: Bez objašnjenja ili komentara

PRIMJERI MODIFIKACIJA:
- Skrati: Zadrži ključne informacije, ukloni suvišne detalje
- Proširi: Dodaj opise, emocije, atmosferu, ali ne nove događaje
- Promijeni ton: Prilagodi stil (formalni/neformalni/poetski/dramatični)
- Prepravi: Poboljšaj jasnoću i čitljivost zadržavajući značenje

ODGOVORI SAMO S MODIFICIRANIM TEKSTOM, bez dodatnih objašnjenja.`;

    console.log("[MODIFY_TEXT] Calling AI provider for text modification");
    
    const modifiedText = await aiProvider.generateText(systemPrompt, options);

    console.log("[MODIFY_TEXT] Text successfully modified");
    console.log("[MODIFY_TEXT] Modified text preview:", modifiedText.substring(0, 100) + "...");
    
    return {
      finalOutput: modifiedText.trim()
    };

  } catch (error) {
    console.error("[MODIFY_TEXT] Error during text modification:", error);
    
    // Graceful degradation - vrati korisnu poruku greške
    return {
      finalOutput: `Greška prilikom modificiranja teksta: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
    };
  }
}