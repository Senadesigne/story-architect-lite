# Detaljan Tehnički Plan za Implementaciju Usmjeravanja (Smart Routing) - Zadatak 3.9

**Datum kreiranja**: 14. studenog 2025  
**Status**: Spreman za implementaciju  
**Preduvjeti**: Zadatak 3.8 (RAG čvorovi) uspješno implementiran

---

## **KORAK 1: Ažuriranje `nodes.ts` - Dodavanje `routeTaskNode` funkcije**

### **1.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/nodes.ts`
- **Pozicija**: Dodati na kraj datoteke, nakon postojećih funkcija

### **1.2 Implementacija `routeTaskNode` funkcije**
- **Signature**: `async function routeTaskNode(state: AgentState): Promise<AgentStateUpdate>`
- **Input**: Prima `AgentState` objekt s `userInput` i `ragContext` poljima
- **Output**: Vraća patch objekt `{ routingDecision: "simple_retrieval" | "creative_generation" | "cannot_answer" }`

### **1.3 AI Provider konfiguracija**
- Koristiti `createDefaultAIProvider()` iz `../../ai.service`
- Konfigurirati za **Anthropic Haiku** model (brži, jeftiniji za klasifikaciju)
- Postaviti `AIGenerationOptions`:
  - `temperature: 0.1` (vrlo niska za konzistentnu klasifikaciju)
  - `maxTokens: 50` (kratki odgovor - samo jedna riječ)
  - `timeout: 8000` (8 sekundi)

### **1.4 Sistemski prompt za klasifikaciju**
- Implementirati prompt iz Sekcije 5.3 plana
- Prompt mora uključivati:
  - Ulogu "AI Logističar" i usmjerivač zadataka
  - Tri jasne kategorije: `simple_retrieval`, `creative_generation`, `cannot_answer`
  - Instrukcije za analizu korisničkog upita i RAG konteksta
  - Zahtjev za vraćanje samo jedne riječi (naziv kategorije)

### **1.5 Error handling i logging**
- Dodati detaljno logiranje na početak: `[ROUTE_TASK] Starting with input`
- Implementirati try-catch blok s graceful degradation
- Fallback strategija: ako AI ne vrati valjanu kategoriju, defaultirati na `"cannot_answer"`
- Logirati AI odgovor i konačnu routing odluku

---

## **KORAK 2: Ažuriranje `nodes.ts` - Dodavanje `handleSimpleRetrievalNode` funkcije**

### **2.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/nodes.ts`
- **Pozicija**: Dodati nakon `routeTaskNode` funkcije

### **2.2 Implementacija `handleSimpleRetrievalNode` funkcije**
- **Signature**: `async function handleSimpleRetrievalNode(state: AgentState): Promise<AgentStateUpdate>`
- **Input**: Prima `AgentState` objekt s `userInput` i `ragContext` poljima
- **Output**: Vraća patch objekt `{ finalOutput: string }`

### **2.3 AI Provider konfiguracija**
- Koristiti `createDefaultAIProvider()` iz `../../ai.service`
- Konfigurirati za **Anthropic Haiku** model (lokalni LLM simulacija)
- Postaviti `AIGenerationOptions`:
  - `temperature: 0.4` (umjerena kreativnost za prirodan odgovor)
  - `maxTokens: 300` (dovoljno za detaljan odgovor)
  - `timeout: 15000` (15 sekundi)

### **2.4 Sistemski prompt za jednostavno dohvaćanje**
- Kreirati prompt koji instruira AI Mentora da:
  - Odgovori na korisnički upit koristeći isključivo informacije iz RAG konteksta
  - Ne izmišlja činjenice koje nisu eksplicitno navedene
  - Formatira odgovor prirodno i korisno
  - Jasno navede ako informacija nije dostupna u kontekstu

### **2.5 Error handling i logging**
- Dodati detaljno logiranje: `[HANDLE_SIMPLE_RETRIEVAL] Starting`
- Implementirati provjeru postojanja `ragContext` polja
- Graceful degradation ako nema konteksta ili AI ne odgovori
- Logirati duljinu generiranog odgovora

---

## **KORAK 3: Ažuriranje `graph.ts` - Importiranje novih čvorova**

### **3.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: Ažurirati postojeći import na vrhu datoteke

### **3.2 Ažuriranje import naredbe**
- Proširiti postojeći import iz `./nodes`:
  ```typescript
  import { retrieveContextNode, transformQueryNode, routeTaskNode, handleSimpleRetrievalNode } from "./nodes";
  ```

### **3.3 Provjera tipova**
- Osigurati da TypeScript nema grešaka s novim importovima
- Provjeriti da su svi čvorovi pravilno eksportirani iz `nodes.ts`

---

## **KORAK 4: Ažuriranje `graph.ts` - Dodavanje čvorova u graf**

### **4.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: U funkciji `createStoryArchitectGraph()`, nakon postojećih `addNode` poziva

### **4.2 Dodavanje novih čvorova**
- Dodati dva nova čvora u StateGraph:
  ```typescript
  graph.addNode("route_task", routeTaskNode);
  graph.addNode("handle_simple_retrieval", handleSimpleRetrievalNode);
  ```

### **4.3 Ažuriranje TODO komentara**
- Ukloniti TODO komentare za implementirane čvorove
- Ažurirati komentare za preostale čvorove (generate_draft, critique_draft, refine_draft)

---

## **KORAK 5: Ažuriranje `graph.ts` - Uklanjanje privremenog ruba**

### **5.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: U sekciji gdje se definiraju edge-ovi

### **5.2 Uklanjanje privremenog edge-a**
- Ukloniti liniju: `graph.addEdge("retrieve_context", END);`
- Dodati komentar koji objašnjava promjenu

### **5.3 Dodavanje novog linearnog edge-a**
- Dodati: `graph.addEdge("retrieve_context", "route_task");`
- Ovaj edge povezuje RAG fazu s usmjeravanjem

---

## **KORAK 6: Ažuriranje `graph.ts` - Implementacija uvjetnog usmjeravanja**

### **6.1 Lokacija izmjene**
- **Datoteka**: `server/src/services/ai/graph/graph.ts`
- **Pozicija**: Nakon svih `addNode` i osnovnih `addEdge` poziva

### **6.2 Implementacija `addConditionalEdges` metode**
- Dodati uvjetni rub nakon `route_task` čvora:
  ```typescript
  graph.addConditionalEdges(
    "route_task",
    routingCondition, // koristi postojeću funkciju
    {
      "handle_simple_retrieval": "handle_simple_retrieval",
      "generate_draft": END, // privremeno dok ne implementiramo Pisca
      [END]: END
    }
  );
  ```

### **6.3 Dodavanje edge-a za završetak simple retrieval**
- Dodati: `graph.addEdge("handle_simple_retrieval", END);`
- Ovaj edge završava tijek za jednostavne upite

### **6.4 Ažuriranje `routingCondition` funkcije**
- Provjeriti da postojeća `routingCondition` funkcija u `graph.ts` pravilno čita `state.routingDecision`
- Osigurati da vraća ispravne stringove koji se mapiraju na čvorove
- Dodati dodatno logiranje za debugging

---

## **KORAK 7: Testiranje i validacija**

### **7.1 Osnovni smoke testovi**
- Testirati da se novi čvorovi mogu importirati bez TypeScript grešaka
- Testirati da StateGraph prima nove čvorove bez grešaka
- Provjeriti da se graf može kreirati bez runtime grešaka

### **7.2 Funkcionalni testovi**
- Testirati routing logiku s različitim tipovima upita:
  - Simple retrieval: "Kako se zove Anin otac?"
  - Creative generation: "Napiši scenu gdje Ana osjeća grižnju savjesti"
  - Cannot answer: "Kakvo je vrijeme danas?"

### **7.3 Integration testovi**
- Testirati cijeli tijek: `transform_query` → `retrieve_context` → `route_task` → `handle_simple_retrieval`
- Provjeriti da se `finalOutput` pravilno postavlja za simple retrieval upite
- Testirati error handling scenarije

---

## **KORAK 8: Dokumentacija i čišćenje**

### **8.1 Ažuriranje komentara**
- Dodati JSDoc komentare za nove funkcije
- Ažurirati komentare u `graph.ts` koji opisuju tijek grafa
- Dokumentirati routing logiku i uvjetne rubove

### **8.2 Logging optimizacija**
- Osigurati konzistentno logiranje kroz sve čvorove
- Dodati debug informacije za praćenje routing odluka
- Implementirati strukturirano logiranje za lakše praćenje tijeka

---

## **Prioriteti i redoslijed implementacije**

1. **Visoki prioritet**: Korak 1 - Implementacija `routeTaskNode`
2. **Visoki prioritet**: Korak 2 - Implementacija `handleSimpleRetrievalNode`
3. **Visoki prioritet**: Korak 3-4 - Dodavanje čvorova u graf
4. **Kritični prioritet**: Korak 5-6 - Implementacija uvjetnog usmjeravanja
5. **Srednji prioritet**: Korak 7 - Testiranje
6. **Nizak prioritet**: Korak 8 - Dokumentacija

---

## **Očekivani rezultati nakon implementacije**

### **Funkcionalne mogućnosti**
- ✅ Inteligentno usmjeravanje upita na temelju AI klasifikacije
- ✅ Brzi odgovori za jednostavne upite bez pozivanja skupog Cloud LLM-a
- ✅ Priprema infrastrukture za kreativno generiranje (Faza 4)

### **Tehnički napredak**
- ✅ Potpuno funkcionalan uvjetni graf s grananjem
- ✅ Hibridna arhitektura koja optimizira troškove
- ✅ Modularna struktura spremna za dodavanje Pisca (generate_draft čvor)

### **Performanse**
- ⚡ Značajno brži odgovori za 60-70% upita (simple retrieval)
- 💰 Smanjeni troškovi API poziva za Cloud LLM
- 🔄 Priprema za iterativnu petlju poboljšanja (Reflection pattern)

---

**Napomena**: Ovaj plan osigurava postupnu implementaciju Smart Routing funkcionalnosti koja poštuje postojeću LangGraph arhitekturu i omogućuje prirodan prijelaz na sljedeći zadatak (3.10 - Reflection petlja).
