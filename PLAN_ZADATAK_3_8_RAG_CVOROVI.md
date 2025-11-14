# Detaljan Tehnički Plan za Implementaciju RAG Čvorova (Nodes) u LangGraph

**Zadatak 3.8**: Implementacija RAG čvorova (Nodes) u LangGraph

**Datum kreiranja**: 14. studenog 2025  
**Status**: Spreman za implementaciju

---

## **Korak 1: Kreiranje datoteke `nodes.ts`**

### **1.1 Kreirati novu datoteku**
- **Lokacija**: `server/src/services/ai/graph/nodes.ts`
- **Svrha**: Centralizirano mjesto za sve čvorove (nodes) LangGraph grafa

### **1.2 Osnovne strukture i importi**
- Importirati `AgentState` i `AgentStateUpdate` tipove iz `./state.ts`
- Importirati `getRelevantContext` funkciju iz `../ai.retriever.ts`
- Importirati `createDefaultAIProvider` iz `../ai.service.ts`
- Dodati potrebne tipove za error handling

## **Korak 2: Implementacija `retrieveContextNode` čvora**

### **2.1 Definirati funkciju `retrieveContextNode`**
- **Signature**: `async function retrieveContextNode(state: AgentState): Promise<AgentStateUpdate>`
- **Input**: Prima `AgentState` objekt
- **Output**: Vraća patch objekt `{ ragContext: string }`

### **2.2 Logika funkcije**
- Dodati jasno logiranje na početak funkcije (`console.log`)
- Koristiti `state.transformedQuery` kao primarni upit (ako postoji)
- Fallback na `state.userInput` ako `transformedQuery` nije dostupan
- Pozvati `getRelevantContext(query, 5)` funkciju iz `ai.retriever.ts`
- Implementirati error handling s detaljnim logiranjem
- Vratiti objekt s `ragContext` poljem

## **Korak 3: Implementacija `transformQueryNode` čvora**

### **3.1 Definirati funkciju `transformQueryNode`**
- **Signature**: `async function transformQueryNode(state: AgentState): Promise<AgentStateUpdate>`
- **Input**: Prima `AgentState` objekt
- **Output**: Vraća patch objekt `{ transformedQuery: string }`

### **3.2 AI Provider konfiguracija**
- Koristiti `createDefaultAIProvider()` iz `ai.service.ts`
- Konfigurirati za **Anthropic Haiku** model (prema analizi dostupnosti)
- Postaviti odgovarajuće `AIGenerationOptions` (temperature, maxTokens)

### **3.3 Prompt engineering**
- Kreirati sistemski prompt za "Query Transformation" obrazac
- Prompt mora uključivati:
  - Ulogu AI Mentora kao RAG eksperta
  - Instrukcije za transformaciju korisničkog upita
  - Fokus na dohvaćanje profila likova, događaja, lokacija
  - Format izlaza (3-5 specifičnih upita)

### **3.4 Implementacija logike**
- Dodati jasno logiranje na početak funkcije
- Kombinirati `state.userInput` i `state.storyContext` u prompt
- Pozvati AI provider s konstruiranim promptom
- Implementirati error handling i fallback strategije
- Vratiti objekt s `transformedQuery` poljem

## **Korak 4: Ažuriranje `graph.ts` datoteke**

### **4.1 Dodati importove**
- Importirati `retrieveContextNode` i `transformQueryNode` iz `./nodes.ts`
- Ažurirati postojeće importove ako je potrebno

### **4.2 Registrirati čvorove u StateGraph**
- U funkciji `createStoryArchitectGraph()`:
  - Dodati `graph.addNode("retrieve_context", retrieveContextNode)`
  - Dodati `graph.addNode("transform_query", transformQueryNode)`

### **4.3 Ažurirati TODO komentare**
- Ukloniti TODO komentare za implementirane čvorove
- Ažurirati komentare za sljedeće faze implementacije

### **4.4 Ažurirati graf povezivanje**
- Dodati privremene edge-ove za testiranje:
  - `graph.addEdge(START, "transform_query")`
  - `graph.addEdge("transform_query", "retrieve_context")`
  - `graph.addEdge("retrieve_context", END)` (privremeno)

## **Korak 5: Error Handling i Logging**

### **5.1 Standardizirani error handling**
- Svaki čvor mora imati try-catch blok
- Logiranje grešaka s kontekstom (čvor, input, error details)
- Graceful degradation - vraćanje korisnih poruka greške u state

### **5.2 Logging strategija**
- Početak svakog čvora: `console.log("[NODE_NAME] Starting with input: ...")`
- Uspješan završetak: `console.log("[NODE_NAME] Completed successfully")`
- Greške: `console.error("[NODE_NAME] Error: ...", error)`

## **Korak 6: Tipizacija i TypeScript**

### **6.1 Striktna tipizacija**
- Svi parametri i povratne vrijednosti moraju biti tipizrani
- Koristiti postojeće `AgentState` i `AgentStateUpdate` tipove
- Dodati JSDoc komentare za sve javne funkcije

### **6.2 Export strategija**
- Eksportirati sve čvorove kao named exports
- Dodati type exports ako je potrebno
- Osigurati kompatibilnost s LangGraph API-jem

## **Korak 7: Testiranje i Validacija**

### **7.1 Osnovni smoke testovi**
- Testirati da se čvorovi mogu importirati bez grešaka
- Testirati da StateGraph prima čvorove bez TypeScript grešaka
- Testirati osnovni tijek: transform_query → retrieve_context

### **7.2 Integration test priprema**
- Pripremiti test podatke za `AgentState`
- Dokumentirati očekivane inpute i outpute za svaki čvor
- Osigurati da čvorovi rade s postojećim `ai.retriever.ts` i `ai.service.ts`

## **Korak 8: Dokumentacija**

### **8.1 Inline dokumentacija**
- JSDoc komentari za sve funkcije
- Objašnjenje svrhe svakog čvora
- Primjeri korištenja i očekivani format podataka

### **8.2 README ažuriranje**
- Ažurirati `server/src/services/ai/README.md` s novim čvorovima
- Dokumentirati tijek podataka kroz graf
- Dodati troubleshooting sekciju

## **Prioriteti i Redoslijed Implementacije**

1. **Visoki prioritet**: Kreiranje `nodes.ts` datoteke s osnovnom strukturom
2. **Visoki prioritet**: Implementacija `retrieveContextNode` (koristi postojeći RAG)
3. **Visoki prioritet**: Implementacija `transformQueryNode` (koristi AI service)
4. **Srednji prioritet**: Ažuriranje `graph.ts` s novim čvorovima
5. **Nizak prioritet**: Testiranje i dokumentacija

---

## **Tehnički Kontekst**

### **Postojeća Infrastruktura**
- ✅ `AgentState` interface definiran u `server/src/services/ai/graph/state.ts`
- ✅ `getRelevantContext` funkcija dostupna u `server/src/services/ai/ai.retriever.ts`
- ✅ `createDefaultAIProvider` dostupan u `server/src/services/ai/ai.service.ts`
- ✅ Anthropic Haiku model potvrđen kao dostupan
- ✅ LangGraph StateGraph struktura postavljena u `server/src/services/ai/graph/graph.ts`

### **Ciljevi Implementacije**
1. **Kreiranje `retrieveContextNode`**: Čvor koji poziva postojeću RAG funkcionalnost
2. **Kreiranje `transformQueryNode`**: Čvor koji koristi AI Mentor za optimizaciju upita
3. **Integracija u LangGraph**: Dodavanje čvorova u postojeći StateGraph
4. **Priprema za sljedeće faze**: Postavljanje temelja za routing i reflection čvorove

### **Očekivani Rezultati**
- Funkcionalni RAG pipeline kroz LangGraph čvorove
- Poboljšana kvaliteta konteksta kroz query transformation
- Modularna arhitektura spremna za proširenje
- Jasno logiranje i error handling za debugging

---

**Napomena**: Ovaj plan osigurava postupnu implementaciju koja poštuje postojeću arhitekturu i omogućuje inkrementalno testiranje svake komponente.
