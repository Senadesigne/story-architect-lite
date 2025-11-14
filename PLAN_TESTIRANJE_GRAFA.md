# TEHNIČKI PLAN: Implementacija Graph Test Endpointa

## Pregled

Ovaj dokument sadrži detaljan tehnički plan za implementaciju novog "Graph Test" endpointa koji omogućuje testiranje cijelog AI toka kroz LangGraph arhitekturu (Zadaci 3.8 i 3.9).

**Cilj**: Kreirati novi endpoint `/api/ai/test-graph` koji poziva implementirani graf umjesto da ga zaobilazi kao što čini postojeći `/api/ai/test-rag` endpoint.

---

## 1. **Ažuriranje `server/src/api.ts`**

### 1.1 Dodavanje Importova
- **Lokacija**: Vrh datoteke `server/src/api.ts` (nakon postojećih importova)
- **Dodati importove**:
  ```typescript
  import { createStoryArchitectGraph, createInitialState } from './services/ai/graph/graph';
  import type { AgentState } from './services/ai/graph/state';
  ```

### 1.2 Kreiranje Novog Endpointa
- **Lokacija**: Nakon postojećeg `/api/ai/test-rag` endpointa (linija ~120)
- **Endpoint definicija**: `GET /api/ai/test-graph`
- **Parametri**: Query parametar `query` (opcionalan, default: "test query")
- **Autentifikacija**: Nema (samo za testiranje)

---

## 2. **Implementacija Logike Endpointa**

### 2.1 Handler Funkcija
- **Funkcionalnost**:
  1. Dohvaćanje `query` parametra iz URL-a
  2. Kreiranje testnog `storyContext` objekta
  3. Poziv `createInitialState()` funkcije
  4. Kompajliranje grafa pomoću `createStoryArchitectGraph()`
  5. Izvršavanje grafa s `graph.invoke(initialState)`
  6. Vraćanje cijelog `finalState` objekta kao JSON

### 2.2 Error Handling
- **Implementirati**: Try-catch blok za graceful error handling
- **Logging**: Detaljno logiranje za debugging
- **Error Response**: Strukturirani JSON odgovor s error detaljima

---

## 3. **Testni Podaci**

### 3.1 Testni Story Context
- **Kreirati**: Statički testni kontekst priče
- **Sadržaj**: Osnovne informacije o likovima, lokacijama i radnji
- **Format**: String koji simulira pravi kontekst iz baze podataka

### 3.2 Default Query
- **Default vrijednost**: "Napiši kratku scenu gdje se glavni lik suočava s dilemom"
- **Svrha**: Testiranje kreativnog generiranja kroz graf

---

## 4. **Struktura Odgovora**

### 4.1 Success Response
- **Format**: JSON objekt koji sadrži cijeli `finalState`
- **Dodatna polja**:
  - `status: 'success'`
  - `timestamp: new Date().toISOString()`
  - `executionTime`: Vrijeme izvršavanja

### 4.2 Error Response
- **Format**: JSON objekt s error detaljima
- **Polja**:
  - `status: 'error'`
  - `error: string` (glavna poruka greške)
  - `details: string` (detalji greške)
  - `timestamp: string`

---

## 5. **Pozicioniranje u Datoteci**

### 5.1 Lokacija Endpointa
- **Dodati nakon**: Postojećeg `/api/ai/test-rag` endpointa (linija ~120)
- **Prije**: Komentara `// ---------------------------------------------` (linija ~159)

### 5.2 Grupiranje s AI Testovima
- **Logička grupa**: Zajedno s drugim AI test endpointima
- **Komentar**: Dodati opisni komentar koji objašnjava svrhu endpointa

---

## 6. **Kompatibilnost s Postojećim Kodom**

### 6.1 Korištenje Postojećih Funkcija
- **Iskoristiti**: Postojeće `createStoryArchitectGraph()` i `createInitialState()` funkcije
- **Ne mijenjati**: Postojeću logiku grafa ili stanja

### 6.2 Održavanje Konzistentnosti
- **Stil koda**: Slijediti postojeći stil i konvencije
- **Error handling**: Koristiti isti pattern kao postojeći endpointovi
- **Logging**: Koristiti isti format logiranja

---

## 7. **Testiranje i Validacija**

### 7.1 Funkcionalni Test
- **URL**: `GET /api/ai/test-graph?query=test`
- **Očekivani rezultat**: Uspješan JSON odgovor s `finalState` objektom
- **Provjera**: Sva polja u `AgentState` interfejsu

### 7.2 Edge Cases
- **Bez query parametra**: Testirati default ponašanje
- **Prazan query**: Testirati s praznim stringom
- **Kompleksan query**: Testirati s dugim, složenim upitom

---

## 8. **Dokumentacija**

### 8.1 Inline Komentari
- **Dodati**: Opisne komentare za svaki korak u handleru
- **Objasniti**: Svrhu testnog endpointa i razliku od `/test-rag`

### 8.2 API Dokumentacija
- **Endpoint**: `GET /api/ai/test-graph`
- **Parametri**: `query` (string, opcionalan)
- **Response**: `AgentState` objekt + metadata
- **Svrha**: Testiranje cijelog AI grafa (Zadaci 3.8 i 3.9)

---

## Zaključak

Ovaj plan osigurava čistu, testabilnu implementaciju koja se savršeno uklapa u postojeću arhitekturu i omogućuje potpuno testiranje AI grafa bez zaobilaženja postojećih komponenti.

**Ključne prednosti**:
- Testiranje stvarnog AI grafa umjesto zaobilaženja
- Konzistentnost s postojećim API endpointima
- Detaljno error handling i logging
- Mogućnost testiranja različitih scenarija

**Sljedeći koraci**:
1. Implementacija endpointa prema ovom planu
2. Testiranje funkcionalnosti
3. Dokumentiranje rezultata testiranja
