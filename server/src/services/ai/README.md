# AI Service - LangGraph Implementation

## Arhitektura v2.0

Ova implementacija koristi LangGraph.js za orkestraciju AI agenata prema Arhitekturi v2.0 iz tehničke specifikacije.

### Komponente

1. **ai.state.ts** - Definicija `AgentState` interfejsa koji drži stanje grafa
2. **ai.nodes.ts** - Implementacija čvorova (node funkcija) grafa:
   - `transformQueryNode` - Transformira korisnički upit za RAG
   - `retrieveContextNode` - Dohvaća kontekst iz vektorske baze
   - `routeTaskNode` - Usmjerava zadatak (router)
   - `handleSimpleRetrievalNode` - Obrađuje jednostavne upite
3. **ai.graph.ts** - Definicija i kompajliranje LangGraph grafa
4. **ai.retriever.ts** - RAG implementacija s PGVector

### Tijek izvršavanja

```
Korisnik → transform_query → retrieve_context → route_task
                                                     ↓
                                         ┌───────────┴───────────┐
                                         ↓                       ↓
                              handle_simple_retrieval    creative_generation
                                         ↓                    (TODO)
                                        END                     ↓
                                                              END
```

### Routing logika

- **simple_retrieval**: Za jednostavne upite poput "Tko je...", "Što je...", "Gdje je..."
- **creative_generation**: Za kreativno pisanje poput "Napiši...", "Opiši..."
- **cannot_answer**: Kada RAG kontekst ne sadrži potrebne informacije

### Testiranje

```bash
# Mock test (bez vanjskih dependencija)
npx tsx src/services/ai/test-graph-mock.ts

# Puni test (zahtijeva .env)
npm run test:graph
```

### Napomene

- Koristi LangGraph.js verziju 0.2.74
- `StateGraphArgs<AgentState>` sintaksa za TypeScript tipove
- Conditional edges za routing logiku
- Podrška za buduće proširenje s Reflection petljom
