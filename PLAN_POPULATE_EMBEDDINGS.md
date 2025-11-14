# Detaljan Tehnički Plan za Implementaciju `populate-embeddings.ts` Skripte

## 1. **Instalacija Ovisnosti**

**Datoteka:** `server/package.json`
**Akcija:** Dodavanje dependency-ja
- Dodaj `langchain` u `dependencies` sekciju (već postoji - verzija `^0.3.36`)
- Provjeri da su svi potrebni paketi dostupni:
  - `@langchain/core` (već postoji)
  - `@langchain/community` (već postoji)
  - `@langchain/openai` (već postoji)

## 2. **Kreiranje Glavne Skripte**

**Datoteka:** `server/scripts/populate-embeddings.ts` (nova datoteka)
**Struktura:**

### 2.1 **Imports i ESM Polyfill**
- Dodaj ESM polyfill na vrh datoteke:
  ```typescript
  import { fileURLToPath } from 'url';
  import { dirname } from 'path';
  ```
- Definiraj `__filename` i `__dirname` varijable
- Importiraj potrebne module:
  - `dotenv/config`
  - `path`
  - `getDatabase` iz `../src/lib/db`
  - Sve Drizzle tablice iz `../src/schema/schema`
  - `addDocumentsToVectorStore`, `closeVectorStorePool` iz `../src/services/ai/ai.retriever`
  - `RecursiveCharacterTextSplitter` iz `langchain/text_splitter`
  - `Document` iz `@langchain/core/documents`

### 2.2 **Konfiguracija Environment Varijabli**
- Učitaj `.env` datoteku koristeći `dotenv.config()` s relativnim putom
- Dodaj error handling za nedostajuće environment varijable

### 2.3 **Formatiranje Funkcije**
Implementiraj sljedeće funkcije za formatiranje podataka:

**`formatProjectDoc(project: ProjectType): Document`**
- Spoji sva relevantna polja projekta u `pageContent`
- Uključi: `title`, `logline`, `premise`, `theme`, `genre`, `audience`, `brainstorming`, `research`, `rules_definition`, `culture_and_history`, `synopsis`, `outline_notes`, `point_of_view`
- Metadata: `{ docId: project.id, projectId: project.id, sourceType: 'project' }`

**`formatCharacterDoc(character: CharacterType): Document`**
- Spoji: `name`, `role`, `motivation`, `goal`, `fear`, `backstory`, `arcStart`, `arcEnd`
- Metadata: `{ docId: character.id, projectId: character.projectId, sourceType: 'character' }`

**`formatLocationDoc(location: LocationType): Document`**
- Spoji: `name`, `description`
- Metadata: `{ docId: location.id, projectId: location.projectId, sourceType: 'location' }`

**`formatSceneDoc(scene: SceneType): Document`**
- Spoji: `title`, `summary`
- Metadata: `{ docId: scene.id, projectId: scene.projectId, sourceType: 'scene', order: scene.order }`

### 2.4 **Glavna Logika - `main()` Funkcija**

**Korak 1: Dohvaćanje Podataka**
- Kreiraj database konekciju koristeći `getDatabase()`
- Dohvati sve podatke paralelno:
  - `db.select().from(projects)`
  - `db.select().from(characters)`
  - `db.select().from(locations)`
  - `db.select().from(scenes)`

**Korak 2: Formatiranje u Document Objekte**
- Pretvori svaki tip podataka u `Document` objekte koristeći formatiranje funkcije
- Spoji sve u `rawDocuments` array

**Korak 3: Text Splitting**
- Kreiraj `RecursiveCharacterTextSplitter` instancu:
  - `chunkSize: 1000`
  - `chunkOverlap: 200`
- Pozovi `textSplitter.splitDocuments(rawDocuments)`
- Dodaj `chunkIndex` u metadata za svaki chunk

**Korak 4: Dodavanje u Vector Store**
- Pozovi `addDocumentsToVectorStore(allChunks)`
- Dodaj error handling i logging

**Korak 5: Cleanup**
- Pozovi `closeVectorStorePool()` u `finally` bloku
- Dodaj graceful shutdown handling

### 2.5 **Error Handling i Logging**
- Implementiraj comprehensive error handling za svaki korak
- Dodaj progress logging (broj dokumenata, chunk-ova)
- Dodaj validation da podaci postoje prije procesiranja

### 2.6 **Idempotencija**
- Koristi `docId` u metadata za prepoznavanje postojećih dokumenata
- Implementiraj logiku za preskakanje već postojećih dokumenata (optional)

## 3. **Ažuriranje Package.json Scripts**

**Datoteka:** `server/package.json`
**Akcija:** Dodavanje nove skripte
- Dodaj u `scripts` sekciju: `"db:populate": "tsx scripts/populate-embeddings.ts"`

## 4. **Type Definitions**

**Potrebne Type Definicije:**
- Kreiraj type aliase za Drizzle table types:
  - `ProjectType = typeof projects.$inferSelect`
  - `CharacterType = typeof characters.$inferSelect`
  - `LocationType = typeof locations.$inferSelect`
  - `SceneType = typeof scenes.$inferSelect`

## 5. **Validacija i Testing**

**Pre-requisites Check:**
- Provjeri postojanje `story_architect_embeddings` tablice
- Provjeri konfiguraciju OpenAI API ključa
- Provjeri database konekciju

**Testing Strategy:**
- Dodaj dry-run opciju za testiranje bez pisanja u bazu
- Implementiraj count validation (broj input dokumenata vs output chunk-ova)

## 6. **Documentation**

**Inline Comments:**
- Dokumentiraj svaku glavnu funkciju
- Objasni text splitting strategiju
- Dokumentiraj metadata strukturu

## 7. **Performance Optimizacije**

**Batch Processing:**
- Implementiraj batch processing za velike količine podataka
- Dodaj progress reporting za dugotrajne operacije

**Memory Management:**
- Koristi streaming za velike datasets
- Implementiraj garbage collection hints

## 8. **CLI Interface (Optional Enhancement)**

**Command Line Arguments:**
- `--dry-run`: Testiraj bez pisanja u bazu
- `--project-id`: Populiraj samo specifični projekt
- `--clear`: Obriši postojeće embeddings prije dodavanja novih

---

Ovaj plan osigurava potpunu implementaciju skripte koja je skalabilna, sigurna i maintainable, slijedeći postojeće arhitekturne patterns u projektu.
