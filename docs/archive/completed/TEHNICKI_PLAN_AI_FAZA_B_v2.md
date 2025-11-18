TEHNIČKI PLAN: AI FAZA B (ORKESTRATOR) v2.0
I. UVOD: Evolucija Arhitekture 4.0 u Stateful Multi-Agentni Sustav
1.1 Sažetak Originalne Arhitekture (v4.0)
Inicijalna arhitektonska vizija (Arhitektura 4.0) definirana je kao strogo sekvencijalni agentni lanac. Ovaj je lanac dizajniran za izvršavanje zadataka kreativnog pisanja kroz tri fiksne uloge:   

"Logističar" (TypeScript Kod): Prima korisnički upit, izvodi Retrieval-Augmented Generation (RAG) pretraživanje vektorske baze i sastavlja JSON s kontekstom.

"AI Mentor" (Lokalni LLM): Prima JSON i pretvara ga u "savršeni prompt" za pisanje.

"Pisac" (Cloud LLM): Prima "savršeni prompt" i generira konačni kreativni tekst.

Glavni cilj ovog dizajna bio je eksplicitna prioritetizacija kvalitete konačnog izlaza, prihvaćajući potencijalno veću latenciju kao kompromis za postizanje vrhunskih rezultata. Međutim, detaljna analiza identificira fundamentalno ograničenje: 100% sekvencijalni i linearni dizajn je krut. Ova krutost onemogućuje implementaciju naprednijih, dinamičkih agentnih obrazaca—kao što su iterativne petlje poboljšanja, uvjetno usmjeravanje zadataka i suradnička dinamika—koji su se pokazali ključnima za postizanje najviše razine kvalitete u složenim zadacima.   

1.2 Predstavljanje Arhitekture v2.0: Prelazak na Agentni Graf
Kao odgovor na ograničenja v4.0, predlaže se Arhitektura v2.0. Ovaj novi dizajn predstavlja migraciju s linearnog lanca na ciklički, stateful graf. Ovaj pristup omogućuje modeliranje AI orkestracije kao stroja stanja (state machine), što je robustniji temelj za složene operacije.   

Ključni koncept u v2.0 je AgentState objekt. Umjesto jednostavnog prosljeđivanja podataka (npr. JSON→string→string), cijeli sustav sada čita i modificira centralizirani, a po potrebi i perzistentni, objekt stanja. Ovaj objekt služi kao temelj za agentno pamćenje, implementaciju petlji (loops) i donošenje složenih logičkih odluka.   

Za implementaciju ove arhitekture u TypeScript ekosustavu, preporučuje se korištenje LangGraph.js. LangGraph.js je specifično dizajniran za orkestraciju stateful agenata, pružajući eksplicitnu podršku za definiranje grafova, upravljanje stanjem i uvjetno grananje (conditional branching).   

1.3 Promjena Paradigme sa "Lanca" na "Sustav"
Inicijalna pretpostavka da je "sekvencijalno = kvalitetno" pokazala se pogrešnom u kontekstu modernih agentnih sustava. Istraživanja i najbolje prakse (npr. Anthropic, LangChain) pokazuju da se stvarna kvaliteta ne postiže jednim, statičkim "savršenim promptom", već kroz iterativno poboljšanje i refleksiju. Sekvencijalni lanac, po svojoj prirodi, ne može podržati takav iterativni proces.   

Prelazak na LangGraph  stoga nije samo tehnička nadogradnja; to je fundamentalna promjena paradigme. Uloga Logističara (sada OrchestratorService) mijenja se iz "aktivnog upravitelja" koji imperativno poziva funkcije u "kontejner grafa" (graph container). Stvarna logika orkestracije (npr. "kada pozvati Pisca?", "treba li kritizirati nacrt?") više nije zakopana u if/else naredbama unutar TypeScript servisa, već je eksplicitno definirana u strukturi grafa—njegovim rubovima (edges) i čvorovima (nodes). Ovaj "graph-based" način razmišljanja čini sustav transparentnijim, modularnijim i lakšim za održavanje.   

II. Analiza Lanca i Redizajn Orkestracije: Implementacija pomoću LangGraph.js
2.1 Zašto LangGraph.js, a ne LCEL?
Dok je LangChain Expression Language (LCEL) izuzetno učinkovit za komponiranje linearnih sekvenci (chains), on postaje nepregledan i težak za održavanje kada se pokušava implementirati složena, nelinearna logika. Naš ključni novi zahtjev—"Mentor-kao-Kritičar"—zahtijeva cikluse (loops), gdje se izlaz vraća na prethodni korak radi poboljšanja.   

LangGraph je dizajniran upravo za ovaj scenarij. To je biblioteka za izgradnju stateful aplikacija koje zahtijevaju petlje, grananje i suradnju više agenata. Omogućuje eksplicitnu i strogu kontrolu nad AgentState objektom u svakom koraku. Podrška za TypeScript (LangGraph.js) je zrela i omogućuje definiranje strogo tipiziranog stanja, što je ključno za robusnost sustava.   

2.2 Definicija Stanja Grafa (The AgentState)
Središnji dio nove arhitekture je AgentState. Ovo je TypeScript sučelje (interface) koje definira "memoriju" sustava. Svaki čvor (agent) u grafu prima cjelokupno stanje i vraća ažuriranje (patch) tog stanja.   

Predložena AgentState shema (TypeScript):

TypeScript
import { BaseMessage } from "@langchain/core/messages";
// MessagesAnnotation osigurava da se poruke dodaju na listu,
// a ne da se prepisuju (state 'reducer')
import { MessagesAnnotation } from "@langchain/langgraph";

interface AgentState {
  // Ulaz i globalni kontekst
  userInput: string;          // Originalni upit korisnika
  storyContext: string;       // Statički sažetak cijele priče (iz schema.ts)
  
  // Faza RAG-a i Usmjeravanja
  transformedQuery?: string;  // Upit rafiniran od strane Mentora (za RAG)
  ragContext?: string;      // Dohvaćeni relevantni dijelovi (chunks)
  routingDecision?: "simple_retrieval" | "creative_generation" | "cannot_answer";

  // Faza Refleksije (Reflection) - Iterativna petlja
  draftCount: number;         // Brojač iteracija petlje (za prekid)
  draft?: string;             // Trenutni nacrt od 'Pisca' (Anthropic)
  critique?: string;          // Posljednja kritika od 'Mentora' (Ollama)

  // Izlaz
  finalOutput?: string;       // Konačni odgovor za korisnika

  // Memorija razgovora (za stateful interakcije)
  messages: Annotated<BaseMessage, MessagesAnnotation>;
}
Ovaj model stanja  omogućuje sustavu da u svakom trenutku prati gdje se nalazi u procesu, koji su podaci dohvaćeni i, što je najvažnije, koliko je puta pokušao poboljšati nacrt, što je temelj za "Reflection" petlju.   

2.3 Arhitektura Grafa: Čvorovi i Uvjetni Rubovi
Originalne "Uloge" iz Arhitekture 4.0 sada postaju "Čvorovi" (Nodes) u grafu, a logika odlučivanja postaje "Rubovi" (Edges).   

Čvorovi (Nodes) - Naši Agenti i Alati:

transform_query: Poziva AI Mentora (Lokalni LLM) da transformira korisnički upit za RAG.

retrieve_context: Poziva Logističara (TypeScript RAG alat) da dohvati kontekst.

route_task: Poziva AI Mentora (Lokalni LLM) da klasificira zadatak.

handle_simple_retrieval: Poziva AI Mentora (Lokalni LLM) da generira jednostavan odgovor.

generate_draft: Poziva Pisca (Cloud LLM) da napiše prvi nacrt.

critique_draft: Poziva AI Mentora (Lokalni LLM) da kritizira nacrt.

refine_draft: Poziva Pisca (Cloud LLM) da poboljša nacrt na temelju kritike.

Uvjetni Rubovi (Conditional Edges) - Logika Orkestracije:

Graf će imati dva ključna logička grananja, implementirana pomoću add_conditional_edges u LangGraph.js :   

Nakon route_task čvora:

Ako je routingDecision == "simple_retrieval", graf prelazi na handle_simple_retrieval.

Ako je routingDecision == "creative_generation", graf prelazi na generate_draft.

Inače, graf prelazi na END (završava rad).

Nakon critique_draft čvora:

Provjerava draftCount u AgentState.

Ako je draftCount < MAX_ITERATIONS (npr. 3), graf prelazi na refine_draft (nastavlja petlju).

Ako je draftCount >= MAX_ITERATIONS, graf prekida petlju i prelazi na END (koristeći zadnji draft kao finalOutput).

Ovaj dizajn  je superioran jer razdvaja logiku (rubovi) od izvršenja (čvorovi). Razvojni tim sada može neovisno testirati i poboljšati, na primjer, prompt za critique_draft čvor bez utjecaja na route_task čvor, što je bilo gotovo nemoguće u starom, monolitnom OrchestratorService. Ovaj dizajn također inherentno podržava "Human-in-the-Loop" (HITL) , gdje se graf može pauzirati kako bi stvarni korisnik (pisac) pregledao i odobrio critique prije nastavka petlje.   

III. Poboljšanje RAG-a: Obrazac "Transformacije Upita" (Query Transformation)
3.1 Problem: "Naivni RAG" i Narativna Nerelevantnost
Trenutni plan (Logističar radi jednostavno vektorsko pretraživanje) koristi pristup poznat kao "Naivni RAG". Problem s ovim pristupom je što upiti korisnika za kreativno pisanje (npr. "Napiši scenu gdje Ana osjeća grižnju savjesti") često semantički nisu bliski kontekstu koji je stvarno potreban za pisanje te scene (npr. dokumenti koji opisuju "Anin profil lika", "događaj X koji je izazvao grižnju savjesti", "Anin odnos s Markom"). Ovo "semantičko nepodudaranje" dovodi do dohvaćanja nerelevantnog RAG konteksta i posljedično slabijeg generiranog teksta.   

3.2 Rješenje: "Mentor-prije-RAG-a" (Obrazac Transformacije Upita)
Implementirat će se obrazac Query Transformation (Transformacija Upita)  koristeći AI Mentora (Lokalni LLM).   

Tijek implementacije (Čvor transform_query):

Korisnik unosi: "Napiši scenu gdje se Ana i Marko svađaju oko nasljedstva."

Ovaj upit ne ide odmah u RAG pretraživanje. Prvo se šalje AI Mentoru (Lokalni LLM).

AI Mentor dobiva sistemsku uputu (system prompt): "Ti si ekspert za RAG. Korisnikov upit je zahtjev za kreativno pisanje. Pretvori ovaj upit u 3-5 specifičnih, hipotetskih upita optimiziranih za pretraživanje vektorske baze kako bi se prikupio sav potreban kontekst za pisanje scene. Fokusiraj se na dohvaćanje profila likova, relevantnih prošlih događaja, lokacija i ključnih objekata." (Ovaj pristup je sličan HyDE (Hypothetical Document Embeddings) obrascu ).   

AI Mentor vraća niz stringova, npr.: ``.

Logističar (sada čvor retrieve_context) izvršava 5 odvojenih vektorskih pretraživanja i spaja (fusion) sve jedinstvene rezultate.   

Prednost ovog pristupa je dobivanje znatno bogatijeg i relevantnijeg konteksta  prije nego što Pisac (Cloud LLM) uopće započne s generiranjem.   

3.3 Napredna Preporuka: "Stateful" RAG za Dugotrajne Narative
Obični RAG je "stateless"—tretira svaki upit kao izolirani događaj. Međutim, priče su inherentno "stateful"—događaji u Sceni 1 moraju utjecati na kontekst u Sceni 50 da bi se održala koherentnost.   

Istraživački rad na ComoRAG (Cognitive-inspired Memory-Organized RAG)  nudi rješenje: "dinamički memorijski radni prostor" (dynamic memory workspace). U praksi, to znači da RAG sustav mora istovremeno baratati s dva tipa konteksta:   

Specifični Kontekst: Relevantni dijelovi (chunks) za trenutni upit (dohvaćeni pomoću Transformacije Upita, kako je opisano u 3.2).

Globalni Kontekst: Sažetak ključnih točaka radnje ("Story So Far") koji se dinamički ažurira i održava (vjerojatno unutar samog AgentState ili u zasebnoj sažetoj bazi).

Modificirani čvor retrieve_context stoga mora spojiti (fusion) ova dva skupa podataka. Ovo osigurava da Pisac uvijek ima pristup i mikro kontekstu (npr. "opis sobe") i makro kontekstu priče (npr. "činjenica da je Marko upravo izgubio posao, što utječe na njegov ton u svađi"). Ovo je ključno za održavanje dugoročne koherentnosti likova i radnje.   

IV. Proširenje Uloge "Mentora": Implementacija "Reflection" Petlje
4.1 Problem: Neiskorišten Potencijal Hibridne Arhitekture
Originalna ideja da AI Mentor (Lokalni LLM) samo piše prompt za Pisca (Cloud LLM) predstavlja neadekvatno i neučinkovito korištenje resursa. Ako je lokalni model dovoljno sofisticiran da napiše "savršen" prompt, vjerojatno je dovoljno sofisticiran i da obavlja znatno korisnije analitičke zadatke.   

Istraživanja i praktična iskustva s hibridnim sustavima pokazuju da lokalni modeli, iako možda manje "kreativni" od masivnih cloud modela, često briljiraju u strukturiranim, analitičkim zadacima koji zahtijevaju dosljednost i praćenje pravila. Kritiziranje teksta prema zadanim smjernicama je upravo takav zadatak.   

4.2 Rješenje: Obrazac "Reflection" (Generiraj-Kritiziraj-Poboljšaj)
Umjesto da se oslanjamo na jedan "savršen udarac" (jedan prompt, jedan izlaz), nova arhitektura usvaja obrazac iterativnog poboljšanja. Ovaj je obrazac formaliziran u industriji kao Agentni Obrazac Refleksije (Reflection Pattern)  ili Self-Refine / CRITIC petlja.   

Ovaj obrazac je u srcu Anthropic-ove vlastite "Constitutional AI", gdje se AI modeli treniraju i usmjeravaju kroz proces samokritike. Arhitektura v2.0 primjenjuje isti princip u stvarnom vremenu (at inference time), koristeći hibridni sustav (Lokalni LLM kritizira Cloud LLM).   

4.3 Implementacija "Mentor-Kritičar" Petlje
Ova petlja se implementira kroz tri čvora u LangGraphu: generate_draft, critique_draft i refine_draft.

Korak 1: Generiranje Nacrta (Čvor generate_draft)

Pisac (Anthropic, npr. Claude 3.5 Sonnet ) prima RAG kontekst (specifični + globalni) i korisnički upit.   

Generira prvi nacrt (draft). Ovaj nacrt se ne šalje korisniku. Sprema se u AgentState.

Korak 2: Kritika Nacrta (Čvor critique_draft)

Nacrt se šalje natrag AI Mentoru (Ollama, Lokalni LLM).

AI Mentor sada dobiva potpuno drugačiju personu (sistemsku uputu):

Code snippet
"Ti si 'AI Mentor', strogi, ali pošteni urednik kreativnog pisanja.[50, 51] Tvoj zadatak je pregledati sljedeći NACRT i osigurati da je 100% usklađen s pruženim KONTEKSTOM (RAG smjernicama). Budi precizan i nepopustljiv u vezi dosljednosti.

KONTEKST (Smjernice koje se moraju poštovati):
{ragContext}

NACRT (Tekst koji se pregledava):
{draft}

Tvoj zadatak [52, 53]:
1.  **Provjera Koherentnosti:** Pronađi BILO KAKVE činjenične kontradikcije između NACRTA i KONTEKSTA. Jesu li imena likova, lokacije i prošli događaji točno preneseni?
2.  **Provjera Dosljednosti Lika:** Odstupa li ponašanje lika u NACRTU od njegovog profila u KONTEKSTU?
3.  **Provjera Potpunosti:** Je li NACRT ispunio SVE zahtjeve iz originalnog korisničkog upita?

Vrati samo JSON objekt sa svojim povratnim informacijama [47]:
{
  "issues": ["Popis pronađenih problema..."],
  "plan":,
  "score": <ocjena od 0-100 o usklađenosti s kontekstom>,
  "stop": <true ako je nacrt savršen, false ako treba poboljšanje>
}
Korak 3: Poboljšanje Nacrta (Čvor refine_draft)

Pisac (Anthropic) poziva se ponovno.

Ovaj put prima: {originalni upit} + {RAG kontekst} + {svoj prvi nacrt} + {JSON kritiku od Mentora}.

Uputa: "Poboljšaj svoj originalni nacrt. Strogo slijedi upute za ispravak iz JSON kritike kako bi riješio navedene probleme."

Korak 4: Petlja

LangGraph uvjetni rub  provjerava draftCount i stop zastavicu iz kritike te ili vraća na Korak 2 (ako treba još poboljšanja) ili završava petlju.   

4.4 Stvaranje Suradničke Debate (Multi-Agent Collaboration)
Ovim dizajnom stvorena je "soba za pisce" (writer's room) , a ne samo proizvodna traka. Sustav implementira suradničku debatu između dva specijalizirana agenta :   

Pisac (Anthropic): Iznimno kreativan, elokventan, ali sklon "haluciniranju" ili kreativnom skretanju s teme.   

Mentor (Ollama): Analitičan, metodičan, fokusiran na pravila i dosljednost s kontekstom.   

Ova namjerno stvorena "tenzija" između dva različita modela (Cloud vs. Local) proizvodi bolji i pouzdaniji rezultat nego da isti model pokušava i pisati i kritizirati sam sebe. Lokalni model efektivno djeluje kao "čuvar" (guardrail)  za skuplji cloud model, osiguravajući da njegove skupe pogreške ili odstupanja od zadanog narativa budu uhvaćene i ispravljene prije nego što dođu do korisnika. Ovo je robustan, multi-agentni obrazac suradnje.   

V. Hibridna Strategija Odlučivanja: Inteligentno Usmjeravanje (Smart Routing)
5.1 Problem: Trošak i Latencija "Uvijek-Cloud" Pristupa
Originalna Arhitektura 4.0 ima fundamentalni nedostatak u pogledu učinkovitosti: ona uvijek poziva sva tri AI modela (RAG pretraga, Lokalni LLM za prompt, Cloud LLM za pisanje) za svaki pojedini upit.

Ovo je nepotrebno, sporo i skupo. Mnogi korisnički upiti neće zahtijevati kreativno generiranje. Na primjer, upit poput: "Kako se zove Anin otac?" ili "Podsjeti me što se dogodilo u Sceni 3" zahtijeva samo dohvaćanje činjenica (retrieval), a ne skupo kreativno pisanje od strane Anthropic-a.   

5.2 Rješenje: "Mentor-kao-Usmjerivač" (LLM-as-Router)
Iskoristit će se AI Mentor (Lokalni LLM) kao lagani klasifikator namjere (intent classifier) ili usmjerivač (router). Ovaj se čvor izvršava nakon RAG-a, ali prije pozivanja skupog Pisca.   

Ovo je dobro dokumentiran arhitektonski obrazac za optimizaciju hibridnih sustava, gdje se lagani, lokalni model koristi za trijažu zadataka, čime se drastično smanjuju troškovi i latencija slanjem samo najsloženijih upita skupljim modelima.   

5.3 Implementacija (Čvor route_task)
Nakon što su čvorovi transform_query i retrieve_context (RAG) završeni, sustav posjeduje sav potreban kontekst za donošenje odluke.

Poziva se AI Mentor (Lokalni LLM) s posebnim promptom za usmjeravanje :   

Code snippet
Ti si 'AI Logističar' i usmjerivač zadataka. Tvoj zadatak je klasificirati korisnički upit u JEDNU od tri kategorije, na temelju upita i dohvaćenog RAG konteksta.

KATEGORIJE:
1.  **simple_retrieval**: Upit traži jednostavnu činjenicu, sažetak ili informaciju koja je EKSPLICITNO prisutna u RAG kontekstu. (Npr. "Tko je...", "Što je...", "Podsjeti me...", "Gdje je...").
2.  **creative_generation**: Upit zahtijeva novo, kreativno pisanje (npr. pisanje nove scene, dijaloga, opisa, brainstorminga) koje se oslanja na RAG kontekst, ali NIJE direktno u njemu. (Npr. "Napiši...", "Opiši...", "Generiraj...", "Zammisli...").
3.  **cannot_answer**: Upit traži nešto što nije povezano s pričom ili RAG kontekst ne sadrži relevantne informacije za odgovor.

KORISNIČKI UPIT:
{userInput}

DOHVAĆENI RAG KONTEKST:
{ragContext}

Vrati samo JEDNU riječ - naziv kategorije (npr. "simple_retrieval").
Logika grafa (definirana u add_conditional_edges ) zatim usmjerava proces na temelju ovog stringa:   

Za "simple_retrieval", poziva se čvor handle_simple_retrieval, gdje AI Mentor (Lokalni LLM) sam generira odgovor na temelju konteksta. Ovo je brzo, jeftino i privatno.

Za "creative_generation", pokreće se skupi (Anthropic) Pisac i ulazi se u "Reflection" petlju.

5.4 Stvaranje Troškovno Učinkovitog Hibridnog Sustava
Spajanjem obrasca "Reflection" i "Routing", AI Mentor (Ollama/Llama) postaje srce i "mozak" cijelog sustava. Pisac (Anthropic/Claude) degradiran je iz glavnog izvršitelja u moćan, ali specijalizirani "alat"  kojeg AI Mentor poziva samo po potrebi.   

Ova arhitektura  inteligentno balansira resurse. Koristi lokalni LLM za većinu "razmišljanja" (transformacija upita, klasifikacija namjere, kritika nacrta, jednostavni odgovori), a skupi cloud LLM koristi isključivo za zadatak u kojem je nezamjenjiv—generiranje vrhunskog, elokventnog kreativnog teksta. Ovo predstavlja najrobusniji i troškovno najučinkovitiji hibridni obrazac dostupan danas.   

VI. Sažetak Preporučene Arhitekture (v2.0) i Tablice
6.1 Novi Arhitektonski Obrazac
Obrazac: Stateful Multi-Agent Sustav  temeljen na LangGraph.js.   

Agenti (Čvorovi):

AI Mentor (Lokalni LLM - Ollama): Djeluje kao Transformer Upita, Usmjerivač (Router) i Kritičar (Critic).

Pisac (Cloud LLM - Anthropic): Djeluje kao specijalizirani alat za kreativno generiranje i poboljšanje.

Ključni Obrasci (Patterns) Korišteni:

Query Transformation  za napredni RAG.   

Stateful RAG  za narativnu koherentnost.   

LLM-as-Router  za hibridno usmjeravanje i uštedu troškova.   

Reflection Pattern (Critique-Refine Loop)  za iterativno poboljšanje kvalitete.   

6.2 Predloženi Tijek (Flow v2.0)
Korisnik -> Čvor transform_query (Mentor) -> **

-> Čvor retrieve_context (Logističar RAG) -> **

-> Čvor route_task (Mentor) -> **

-> Uvjetni Rub (Routing):

PUT A (Simple): -> handle_simple_retrieval (Mentor) -> END

PUT B (Creative): -> generate_draft (Pisac) -> **

-> Čvor critique_draft (Mentor) -> **

-> Uvjetni Rub (Reflection Petlja):

Ako draftCount < 3 I critique.stop == false: -> refine_draft (Pisac) -> ** -> Vrati se na Korak 5.

Inače: -> END (Konačni draft postaje finalOutput).

6.3 Ključne Definicijske Tablice
Sljedeće tablice pružaju jasan tehnički pregled za implementacijski tim.

Tablica 1: Definicija Središnjeg Stanja (AgentState) Svrha: Ovo sučelje je temelj LangGraph arhitekture i služi kao strogo tipizirani ugovor o podacima koji se prenosi između svih čvorova.   

Ključ (Property)	Tip (TypeScript)	Opis Uloge	Čvor Koji Piše	Čvorovi Koji Čitaju
userInput	string	Originalni upit korisnika.	START	transform_query, route_task
storyContext	string	Statički globalni kontekst priče.	START	transform_query
transformedQuery	string | null	Upit optimiziran za RAG.	transform_query	retrieve_context
ragContext	string | null	Dohvaćeni relevantni dijelovi (chunks).	retrieve_context	route_task, handle_simple_retrieval, generate_draft, critique_draft
routingDecision	string | null	Odluka o vrsti zadatka.	route_task	Samo uvjetni rub
draftCount	number	Brojač iteracija petlje.	START (na 0), critique_draft (++)	Samo uvjetni rub
draft	string | null	Trenutna verzija kreativnog teksta.	generate_draft, refine_draft	critique_draft, END
critique	string | null	JSON kritika od strane Mentora.	critique_draft	refine_draft, Uvjetni rub
finalOutput	string | null	Konačni odgovor za slanje korisniku.	handle_simple_retrieval, END	-
messages	Annotated<BaseMessage>	Povijest razgovora za pamćenje.	START, END	Svi čvorovi (po potrebi)
Tablica 2: Usporedba Arhitekture v4.0 (Lanac) i v2.0 (Graf) Svrha: Ovaj sažetak vizualno prikazuje nadogradnje i opravdava migraciju s jednostavnog lanca na robustan, stateful graf.   

Kriterij	Arhitektura 4.0 (Sekvencijalni Lanac)	Arhitektura v2.0 (Stateful Graf)
Okvir (Framework)	
Jednostavni TypeScript / LCEL 

LangGraph.js 

Tijek (Flow)	
Striktno linearan (RAG -> Mentor -> Pisac) 

Ciklički, uvjetovan, stateful 

Upravljanje Stanja	Implicitno (prosljeđivanje parametara)	
Eksplicitno (centralni AgentState objekt) 

Uloga Mentora	Samo Pisanje Prompta	
Višestruka: Transformator Upita, Usmjerivač, Kritičar 

RAG Metodologija	
Naivni RAG (jedan upit) 

Napredni RAG (Query Transformation + Stateful Context) 

Iteracija Kvalitete	Nema (jedan prolaz, "single-shot")	
Ugrađena "Reflection" petlja (Generiraj-Kritiziraj-Poboljšaj) 

Upravljanje Troškovima	Nema (uvijek poziva Cloud LLM)	
Hibridno Usmjeravanje (Cloud LLM samo za kompleksne zadatke) 

  
VII. ZAKLJUČAK: Implementacijski Putokaz i Sljedeći Koraci
7.1 Sažetak Preporuka
Arhitektura v2.0, temeljena na LangGraph.js, rješava temeljna ograničenja originalnog dizajna. Ona transformira sustav iz krutog lanca u fleksibilan, inteligentan i samoispravljajući organizam. Ključne preporuke su:

Usvojiti LangGraph.js kao temelj orkestracije za upravljanje stateful, cikličkim tijekovima.

Definirati strogo tipizirani AgentState kao centralni ugovor o podacima.

Implementirati AI Mentora (Ollama) kao višenamjenskog agenta koji obavlja zadatke Query Transformation, Routing i Critique.

Implementirati Pisca (Anthropic) kao specijalizirani "alat" kojeg Mentor poziva isključivo za zadatke generiranja visoke kreativnosti.

7.2 Sljedeći Koraci za Implementaciju
Preporučuje se fazni pristup implementaciji grafa:

Korak 1 (Postavljanje): Inicijalizirati LangGraph.js projekt. Definirati i instancirati AgentState sučelje i StateGraph.   

Korak 2 (Implementacija RAG-a): Implementirati čvorove transform_query i retrieve_context. Testirati i validirati kvalitetu dohvaćenog konteksta korištenjem obrasca Transformacije Upita.

Korak 3 (Implementacija Usmjeravanja): Implementirati route_task čvor i handle_simple_retrieval čvor. Dodati prve add_conditional_edges. Testirati usmjeravanje (jednostavno vs. kreativno).   

Korak 4.a (Implementacija "Reflection" Čvorova): 
   - Dodati tri ključna čvora u `ai.nodes.ts`:
     - **generateDraftNode**: Koristi Cloud LLM (Anthropic Claude 3.5 Sonnet) za generiranje početne verzije priče. Prima RAG kontekst i korisničke zahtjeve, generira prvi nacrt koji se sprema u `state.storyDraft`.
     - **critiqueDraftNode**: Koristi Lokalni LLM (Ollama) za analizu trenutne verzije. Vraća strukturiranu kritiku u JSON formatu s ocjenama po kriterijima (1-10), konkretnim prijedlozima i `stop: true/false` zastavicom. Također povećava `draftCount`.
     - **refineDraftNode**: Koristi Cloud LLM (Anthropic Claude 3.5 Haiku za brže iteracije) za poboljšanje nacrta na temelju kritike. Prima originalni nacrt + JSON kritiku i generira poboljšanu verziju.
   - Svi čvorovi moraju imati robusno error handling i detaljno logiranje za praćenje iteracija.

Korak 4.b (Ažuriranje Grafa - Povezivanje Petlje):
   - U `ai.graph.ts`:
     - Ukloniti postojeći `generate_draft_placeholder` čvor
     - Dodati nove čvorove iz koraka 4.a u graf koristeći `.addNode()` metodu
     - Implementirati uvjetni rub nakon `critiqueDraftNode` pomoću `addConditionalEdges`:
       - Provjeriti `stop: true` iz kritike → prekid petlje, prelazak na finalizaciju
       - Provjeriti `draftCount >= 3` → prekid petlje nakon maksimalno 3 iteracije
       - Inače → nastavak na `refineDraftNode` koji vraća tok na `generateDraftNode`
     - Osigurati ispravno povezivanje s ostatkom grafa (ulaz iz route_story, izlaz prema END)
   - Testirati cjelokupnu petlju s različitim scenarijima (brzi prekid, maksimalne iteracije)   

Korak 5 (Evaluacija): Provesti kvantitativnu evaluaciju (Evals)  kako bi se izmjerilo poboljšanje kvalitete izlaza i smanjenje troškova (broj poziva Cloud LLM-a) u usporedbi s originalnom Arhitekturom 4.0.   

VIII. PLAN POPRAVKA: POSTAVLJANJE VEKTORSKE BAZE

8.1 Dijagnoza Problema
Tijekom prvog testa AI agentnog sustava na ruti `/api/ai/test-agent`, identificiran je kritični problem s RAG (Retrieval-Augmented Generation) komponentom. Greška "Greška prilikom dohvaćanja konteksta iz vektorske baze" u `ragContext` polju ukazuje na sljedeće nedostatke:

1. **Nedostaje pgvector ekstenzija** - PostgreSQL baza podataka nema instaliranu pgvector ekstenziju koja je preduvjet za rad s vektorskim tipovima podataka
2. **Ne postoji tablica `story_architect_embeddings`** - PGVectorStore pokušava pristupiti tablici koja nije kreirana u bazi podataka
3. **Nema definicije u Drizzle shemi** - Tablica za vektorske embeddings nije definirana u `schema.ts` datoteci

Ovi nedostaci onemogućavaju funkcioniranje RAG sustava koji je ključan za dohvaćanje relevantnog konteksta iz priče.

8.2 Arhitektura Rješenja
Rješenje slijedi "Drizzle-ispravan" pristup koji održava integritet postojećeg razvojnog workflow-a projekta. Umjesto kreiranja ručnih SQL migracija, koristit će se kombinacija:
- Drizzle schema definicija za tablicu
- Jednokratna skripta za omogućavanje pgvector ekstenzije
- Postojeći `pnpm db:push` mehanizam za sinkronizaciju sheme

8.3 Detaljan Plan Implementacije

### Korak 1: Kreiranje Skripte za Ekstenziju

**Cilj**: Kreirati jednokratnu skriptu koja će omogućiti pgvector ekstenziju u PostgreSQL bazi.

**Lokacija**: `server/scripts/setup-pgvector.ts`

**Implementacija**:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Učitaj environment varijable
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function setupPgVector() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    process.exit(1);
  }

  console.log('🔧 Connecting to database...');
  
  const sql = postgres(connectionString);
  const db = drizzle(sql);

  try {
    // Provjeri postoji li već ekstenzija
    const result = await sql`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `;
    
    if (result.length > 0) {
      console.log('✅ pgvector extension is already installed');
    } else {
      console.log('📦 Installing pgvector extension...');
      await sql`CREATE EXTENSION IF NOT EXISTS vector`;
      console.log('✅ pgvector extension installed successfully');
    }
    
    // Provjeri verziju
    const version = await sql`
      SELECT extversion FROM pg_extension WHERE extname = 'vector'
    `;
    
    if (version.length > 0) {
      console.log(`📌 pgvector version: ${version[0].extversion}`);
    }
    
  } catch (error) {
    console.error('❌ Error setting up pgvector:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('🔒 Database connection closed');
  }
}

// Pokreni setup
setupPgVector().then(() => {
  console.log('✨ pgvector setup completed!');
  console.log('📝 Next step: Run "pnpm db:push" to create the embeddings table');
}).catch((error) => {
  console.error('Failed to setup pgvector:', error);
  process.exit(1);
});
```

### Korak 2: Ažuriranje schema.ts

**Cilj**: Dodati definiciju tablice `storyArchitectEmbeddings` u Drizzle shemu.

**Lokacija**: `server/src/schema/schema.ts`

**Implementacija** (dodati na kraj datoteke):
```typescript
// Custom type za pgvector - sigurna implementacija
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() { 
    return 'vector(1536)'; // OpenAI text-embedding-3-small koristi 1536 dimenzija
  },
  toDriver(value: number[]): string {
    // Pretvori array brojeva u PostgreSQL vector format
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    // Pretvori PostgreSQL vector string natrag u array
    return JSON.parse(value);
  },
});

// Tablica za AI vektorske embeddings
export const storyArchitectEmbeddings = pgTable('story_architect_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}).$type<{
    docId?: string;
    projectId?: string;
    chunkIndex?: number;
    sourceType?: 'character' | 'scene' | 'location' | 'project';
    [key: string]: any;
  }>(),
  vector: vector('vector').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  // Indeks za brže vektorsko pretraživanje koristeći cosine distance
  vectorIdx: index('idx_story_architect_embeddings_vector')
    .using('ivfflat', table.vector.op('vector_cosine_ops'))
    .with({ lists: 100 }),
  // Dodatni indeksi za filtriranje
  metadataProjectIdIdx: index('idx_embeddings_metadata_project_id')
    .on(sql`(metadata->>'projectId')`),
  createdAtIdx: index('idx_embeddings_created_at').on(table.createdAt),
}));

// Relacije za embeddings tablicu
export const storyArchitectEmbeddingsRelations = relations(storyArchitectEmbeddings, ({ }) => ({
  // Embeddings tablica nema direktne FK veze, koristi metadata za reference
}));
```

### Korak 3: Ažuriranje ai.retriever.ts

**Cilj**: Dodati provjeru postojanja tablice i poboljšati error handling.

**Lokacija**: `server/src/services/ai/ai.retriever.ts`

**Implementacija** (dodati prije `getRelevantContext` funkcije):
```typescript
/**
 * Provjerava postoji li tablica u bazi podataka
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      )
    `);
    return result.rows[0]?.exists || false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}
```

**Ažuriranje `getRelevantContext` funkcije**:
```typescript
export async function getRelevantContext(query: string, k: number = 5): Promise<string> {
  try {
    // Provjeri postoji li tablica prije pokušaja dohvaćanja
    const tableExists = await checkTableExists('story_architect_embeddings');
    if (!tableExists) {
      console.warn('Vector table not found. Please run setup-pgvector.ts and db:push');
      return "Vektorska baza još nije konfigurirana. Molimo pokrenite postavljanje vektorske baze.";
    }

    // Postojeći kod za dohvaćanje...
    const store = await getVectorStore();
    const results = await store.similaritySearch(query, k);

    if (results.length === 0) {
      return "Nema pronađenog relevantnog konteksta.";
    }

    return results
      .map((doc) => doc.pageContent)
      .join("\n\n---\n\n");

  } catch (error) {
    console.error("Error during RAG retrieval:", error);
    // Detaljnija poruka greške za lakše debugiranje
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    return "Greška prilikom dohvaćanja konteksta iz vektorske baze.";
  }
}
```

### Korak 4: Ažuriranje package.json

**Cilj**: Dodati automatiziranu skriptu za postavljanje AI infrastrukture.

**Lokacija**: `server/package.json`

**Implementacija** (dodati u `scripts` sekciju):
```json
{
  "scripts": {
    // ... postojeće skripte ...
    "setup:ai": "tsx scripts/setup-pgvector.ts && pnpm db:push",
    "setup:ai:check": "tsx scripts/setup-pgvector.ts"
  }
}
```

### Korak 5: Upute za Izvršenje

**Redoslijed pokretanja naredbi**:

1. **Inicijalno postavljanje** (izvršava se jednom):
   ```bash
   cd server
   pnpm setup:ai
   ```
   
   Ova naredba će:
   - Pokrenuti `setup-pgvector.ts` skriptu koja instalira pgvector ekstenziju
   - Automatski pokrenuti `db:push` koji će kreirati `story_architect_embeddings` tablicu

2. **Provjera statusa** (opcionalno):
   ```bash
   pnpm setup:ai:check
   ```
   
   Ova naredba samo provjerava je li pgvector ekstenzija instalirana.

3. **Testiranje**:
   ```bash
   pnpm dev
   # U drugom terminalu:
   # Testirati /api/ai/test-agent endpoint ponovno
   ```

**Napomene za proizvodnju**:
- Za cloud PostgreSQL providere (Supabase, Neon, Railway), pgvector je obično već dostupan
- Za self-hosted PostgreSQL, potrebno je instalirati pgvector paket na server nivou
- Preporučuje se dokumentirati verziju pgvector ekstenzije u README.md

8.4 Dodatne Preporuke za Budućnost

1. **Skripta za popunjavanje početnih embeddings**:
   - Kreirati `scripts/populate-embeddings.ts` koja će generirati embeddings za postojeće podatke

2. **Monitoring i maintenance**:
   - Dodati endpoint za provjeru zdravlja vektorske baze
   - Implementirati periodičko reindeksiranje za optimalne performanse

3. **Testovi**:
   - Dodati unit testove za vector customType
   - Dodati integraciju testove za RAG pipeline

Ovaj plan osigurava robusnu implementaciju vektorske baze koja se savršeno uklapa u postojeću Drizzle/TypeScript arhitekturu projekta.

