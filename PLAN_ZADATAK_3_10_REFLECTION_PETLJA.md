# Tehnički Plan: Implementacija "Reflection" Petlje (Zadatak 3.10)

## **KORAK 1: Ažuriranje `nodes.ts` - Dodavanje novih čvorova**

### **1.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/nodes.ts`
- **Pozicija**: Dodati na kraj datoteke, nakon postojećih funkcija

### **1.2 Implementacija `generateDraftNode` funkcije**
- **Signature**: `async function generateDraftNode(state: AgentState): Promise<AgentStateUpdate>`
- **Input**: Prima `AgentState` objekt s `userInput`, `ragContext` poljima
- **Output**: Vraća patch objekt `{ draft: string }`
- **AI Provider**: Koristiti `createDefaultAIProvider()` (Anthropic Haiku)
- **Konfiguracija**: 
  - `temperature: 0.7` (visoka kreativnost za pisanje)
  - `maxTokens: 1000` (dovoljno za detaljnu scenu)
  - `timeout: 30000` (30 sekundi za kompleksno generiranje)
- **Sistemski prompt**: "Ti si AI Pisac, ekspert za kreativno pisanje priča..."
- **Error handling**: Graceful degradation s fallback porukom

### **1.3 Implementacija `critiqueDraftNode` funkcije**
- **Signature**: `async function critiqueDraftNode(state: AgentState): Promise<AgentStateUpdate>`
- **Input**: Prima `AgentState` objekt s `draft`, `ragContext`, `userInput` poljima
- **Output**: Vraća patch objekt `{ critique: string, draftCount: number }`
- **AI Provider**: Koristiti `createDefaultAIProvider()` (Anthropic Haiku)
- **Konfiguracija**:
  - `temperature: 0.2` (niska temperatura za konzistentnu kritiku)
  - `maxTokens: 500` (strukturirana JSON kritika)
  - `timeout: 20000` (20 sekundi)
- **Sistemski prompt**: "Ti si AI Mentor, strogi urednik kreativnog pisanja..."
- **JSON format**: `{ "issues": [], "plan": "", "score": 0-100, "stop": boolean }`
- **Logika**: Povećati `state.draftCount + 1`

### **1.4 Implementacija `refineDraftNode` funkcije**
- **Signature**: `async function refineDraftNode(state: AgentState): Promise<AgentStateUpdate>`
- **Input**: Prima `AgentState` objekt s `draft`, `critique`, `ragContext` poljima
- **Output**: Vraća patch objekt `{ draft: string }`
- **AI Provider**: Koristiti `createDefaultAIProvider()` (Anthropic Haiku)
- **Konfiguracija**:
  - `temperature: 0.6` (umjerena kreativnost za poboljšanje)
  - `maxTokens: 1000` (poboljšana verzija)
  - `timeout: 30000` (30 sekundi)
- **Sistemski prompt**: "Ti si AI Pisac. Poboljšaj svoj originalni nacrt..."
- **Input kombinacija**: originalni draft + JSON kritika + RAG kontekst

## **KORAK 2: Ažuriranje `graph.ts` - Importiranje novih čvorova**

### **2.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: Linija 5, ažurirati postojeći import

### **2.2 Ažuriranje import naredbe**
- Proširiti postojeći import iz `./nodes`:
  ```typescript
  import { 
    retrieveContextNode, 
    transformQueryNode, 
    routeTaskNode, 
    handleSimpleRetrievalNode,
    generateDraftNode,
    critiqueDraftNode,
    refineDraftNode
  } from "./nodes";
  ```

## **KORAK 3: Ažuriranje `graph.ts` - Dodavanje čvorova u graf**

### **3.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: Linija 72-77, nakon postojećih `addNode` poziva

### **3.2 Dodavanje novih čvorova**
- Dodati tri nova čvora u StateGraph:
  ```typescript
  graph.addNode("generate_draft", generateDraftNode);
  graph.addNode("critique_draft", critiqueDraftNode);
  graph.addNode("refine_draft", refineDraftNode);
  ```

### **3.3 Uklanjanje TODO komentara**
- Ukloniti TODO komentare na linijama 73-77
- Ažurirati komentare za implementirane čvorove

## **KORAK 4: Ažuriranje `graph.ts` - Promjena routing logike**

### **4.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: Linija 94-102, `.addConditionalEdges` blok

### **4.2 Ažuriranje uvjetnog grananja**
- Pronaći postojeći `.addConditionalEdges` za `route_task`
- Promijeniti liniju 99:
  ```typescript
  // PRIJE:
  "generate_draft": END,
  
  // NAKON:
  "generate_draft": "generate_draft",
  ```

## **KORAK 5: Ažuriranje `graph.ts` - Dodavanje linearnih rubova**

### **5.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: Linija 90, nakon postojećih `addEdge` poziva

### **5.2 Dodavanje novih linearnih rubova**
- Dodati dva nova ruba:
  ```typescript
  graph.addEdge("generate_draft", "critique_draft");
  graph.addEdge("refine_draft", "critique_draft"); // Stvara petlju
  ```

## **KORAK 6: Ažuriranje `graph.ts` - Implementacija reflection uvjetnog grananja**

### **6.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: Linija 103, nakon postojećeg `.addConditionalEdges` bloka

### **6.2 Dodavanje novog uvjetnog grananja**
- Dodati novo `.addConditionalEdges` za reflection petlju:
  ```typescript
  // Uvjetno grananje za reflection petlju
  graph.addConditionalEdges(
    "critique_draft",
    reflectionCondition, // koristi postojeću funkciju na liniji 189
    {
      "refine_draft": "refine_draft", // nastavi petlju
      [END]: END // završi petlju
    }
  );
  ```

### **6.3 Provjera postojeće `reflectionCondition` funkcije**
- Funkcija već postoji na liniji 189-212
- Provjeriti logiku:
  - Ako `draftCount >= MAX_DRAFT_ITERATIONS` → END
  - Ako `critique.stop === true` → END  
  - Inače → "refine_draft"
- Dodati dodatno logiranje za debugging

## **KORAK 7: Ažuriranje konstanti i importa**

### **7.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: Linija 3, provjera postojanja importa

### **7.2 Provjera importa**
- Osigurati da je `MAX_DRAFT_ITERATIONS` importiran iz `./state`
- Konstanta već postoji u `state.ts` na liniji 111: `export const MAX_DRAFT_ITERATIONS = 3;`

## **KORAK 8: Testiranje i validacija**

### **8.1 Osnovni smoke testovi**
- Testirati da se novi čvorovi mogu importirati bez TypeScript grešaka
- Testirati da StateGraph prima nove čvorove bez grešaka
- Provjeriti da se graf može kreirati bez runtime grešaka

### **8.2 Funkcionalni testovi**
- Testirati reflection petlju s različitim scenarijima:
  - Brzi prekid (`critique.stop = true` u prvoj iteraciji)
  - Maksimalne iteracije (3 iteracije do prekida)
  - Srednji scenarij (2 iteracije pa prekid)
- Testirati routing: `creative_generation` → `generate_draft` → petlja

### **8.3 Integration testovi**
- Testirati cijeli tijek: `route_task` → `generate_draft` → `critique_draft` → `refine_draft` → petlja
- Provjeriti da se `finalOutput` pravilno postavlja na kraju
- Testirati error handling scenarije

## **KORAK 9: Dokumentacija i čišćenje**

### **9.1 Ažuriranje komentara**
- Dodati JSDoc komentare za nove funkcije u `nodes.ts`
- Ažurirati komentare u `graph.ts` koji opisuju reflection petlju
- Dokumentirati uvjetne rubove i logiku grananja

### **9.2 Logging optimizacija**
- Osigurati konzistentno logiranje kroz sve nove čvorove
- Dodati debug informacije za praćenje iteracija petlje
- Implementirati strukturirano logiranje za lakše praćenje tijeka

## **Prioriteti i redoslijed implementacije**

1. **Kritični prioritet**: Korak 1 - Implementacija tri nova čvora
2. **Kritični prioritet**: Korak 2-3 - Dodavanje čvorova u graf
3. **Kritični prioritet**: Korak 4-6 - Implementacija petlje i uvjetnog grananja
4. **Visoki prioritet**: Korak 8 - Testiranje funkcionalnosti
5. **Srednji prioritet**: Korak 9 - Dokumentacija i optimizacija

## **Očekivani rezultati nakon implementacije**

### **Funkcionalne mogućnosti**
- ✅ Potpuno funkcionalna "Reflection" petlja (Pisac → Kritičar → Refiner)
- ✅ Iterativno poboljšanje kvalitete generiranog sadržaja
- ✅ Automatski prekid petlje nakon maksimalno 3 iteracije ili kada je sadržaj zadovoljavajući

### **Tehnički napredak**
- ✅ Kompletan LangGraph s cikličkim tijekovima
- ✅ Hibridna arhitektura koja optimizira kvalitetu i troškove
- ✅ Modularna struktura spremna za buduće proširenje

### **Performanse**
- ⚡ Inteligentno korištenje AI resursa (lokalni LLM za kritiku, cloud LLM za pisanje)
- 💰 Kontrolirani troškovi kroz ograničen broj iteracija
- 🔄 Samoispravljajući sustav koji poboljšava kvalitetu kroz iteracije

**Napomena**: Ovaj plan omogućuje prirodan prijelaz s postojeće Smart Routing implementacije (Zadatak 3.9) na naprednu Reflection petlju, održavajući kompatibilnost s postojećom LangGraph arhitekturom.
