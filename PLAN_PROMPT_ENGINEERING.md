# TEHNIČKI PLAN: Poboljšanje Kvalitete AI Odgovora (Prompt Inženjering)

## KONTEKST PROBLEMA

Uspješno smo testirali GET /api/ai/test-graph endpoint, ali kvaliteta odgovora je bila neprihvatljiva zbog dva jasna problema:

**Problem A (Zagađenje Testa)**: Hardkodirani `testStoryContext` u `api.ts` zbunjuje AI  
**Problem B (Loši Promptovi)**: Promptovi u `nodes.ts` ne slušaju naredbe i ignoriraju RAG kontekst

## PLAN IMPLEMENTACIJE

### 1. PLAN ZA `server/src/api.ts`

**Datoteka za izmjenu**: `server/src/api.ts`  
**Lokacija problema**: Linije 134-151 (GET /api/ai/test-graph endpoint)

**Specifične izmjene**:

1. **Ukloniti hardkodirani `testStoryContext`**:
   - Obrisati varijablu `testStoryContext` (linije 134-151)
   - Ukloniti sav hardkodirani sadržaj o "Tajni Starog Dvorca"

2. **Postaviti prazan `storyContext` u `createInitialState`**:
   - Zamijeniti `createInitialState(query, testStoryContext)` s `createInitialState(query, "")`
   - Alternativno: `createInitialState(query, null)` ako funkcija podržava null

3. **Dodati komentar objašnjenja**:
   - Dodati komentar koji objašnjava da se AI mora oslanjati isključivo na RAG kontekst iz prave baze

**Cilj**: Prisiliti AI da se oslanja isključivo na `ragContext` koji dohvaćamo iz vektorske baze, a ne na lažni kontekst.

### 2. PLAN ZA `server/src/services/ai/graph/nodes.ts`

**Datoteka za izmjenu**: `server/src/services/ai/graph/nodes.ts`  
**Opseg problema**: Svi sistemski promptovi u svim čvorovima

**Specifične izmjene po čvorovima**:

#### 2.1 `routeTaskNode` (linije 156-250)

**Problem**: Pogrešno odabrao `creative_generation` za jednostavno pitanje "O čemu se radi..."

**Plan izmjene**:
- **Lokacija**: Sistemski prompt (linije 182-209)
- **Dodati stroži prompt**: Eksplicitno naglasiti da ako RAG kontekst sadrži odgovor na pitanje, mora odabrati `simple_retrieval`
- **Dodati primjere**: Konkretni primjeri kada odabrati `simple_retrieval` vs `creative_generation`
- **Dodati logiku provjere**: "Prvo provjeri sadrži li RAG kontekst odgovor na pitanje"

#### 2.2 `handleSimpleRetrievalNode` (linije 260-343)

**Problem**: Potrebno je pojačati zabranu izmišljanja

**Plan izmjene**:
- **Lokacija**: Sistemski prompt (linije 293-320)
- **Dodati stroži prompt**: "STROGO ZABRANJENO je izmišljanje bilo kakvih informacija"
- **Dodati provjeru**: "Ako informacija nije u kontekstu, eksplicitno reci da nije dostupna"
- **Dodati format**: Zahtijevati da AI navede iz kojeg dijela konteksta uzima informaciju

#### 2.3 `generateDraftNode` (linije 353-435)

**Problem**: Ignorirao RAG kontekst i izmislio "Asha" i "Pustinju Korthana"

**Plan izmjene**:
- **Lokacija**: Sistemski prompt (linije 386-412)
- **Dodati stroži prompt**: "Kreativnost mora biti 100% temeljena na RAG kontekstu"
- **Dodati zabranu**: "STROGO ZABRANJENO uvođenje novih likova, lokacija ili događaja koji nisu u kontekstu"
- **Dodati provjeru**: "Prije pisanja, identificiraj sve likove i lokacije iz RAG konteksta"
- **Dodati format**: Zahtijevati da AI koristi samo imena i lokacije iz konteksta

#### 2.4 `critiqueDraftNode` (linije 445-560)

**Problem**: Pohvalio izmišljenu priču (Score 95) umjesto da je kaznio

**Plan izmjene**:
- **Lokacija**: Sistemski prompt (linije 482-512)
- **Dodati najstroži prompt**: "#1 prioritet je provjera usklađenosti s RAG kontekstom"
- **Dodati strogu provjeru**: "Ako draft sadrži bilo što što nije u RAG kontekstu, score mora biti 0"
- **Dodati konkretne kriterije**: 
  - Provjera imena likova (score 0 ako su izmišljena)
  - Provjera lokacija (score 0 ako su izmišljene)
  - Provjera događaja (score 0 ako su izmišljeni)
- **Dodati format**: Zahtijevati detaljnu analizu svakog elementa u draftu

#### 2.5 `refineDraftNode` (linije 570-658)

**Plan izmjene**:
- **Lokacija**: Sistemski prompt (linije 604-633)
- **Dodati stroži prompt**: "Poboljšanje mora zadržati 100% usklađenost s RAG kontekstom"
- **Dodati provjeru**: "Ne smije dodavati nove elemente koji nisu u kontekstu"

### 3. REDOSLIJED IMPLEMENTACIJE

**Korak 1**: Izmjena `api.ts`
- Ukloniti hardkodirani kontekst
- Postaviti prazan `storyContext`
- Testirati da endpoint i dalje radi

**Korak 2**: Izmjena `routeTaskNode`
- Revizija sistemskog prompta
- Testiranje s jednostavnim pitanjima

**Korak 3**: Izmjena `handleSimpleRetrievalNode`
- Pojačavanje zabrane izmišljanja
- Testiranje s pitanjima koja imaju odgovor u RAG-u

**Korak 4**: Izmjena `generateDraftNode`
- Najstroži prompt protiv izmišljanja
- Testiranje s kreativnim zahtjevima

**Korak 5**: Izmjena `critiqueDraftNode`
- Najstroži prompt za provjeru usklađenosti
- Testiranje da li kaznava izmišljanja

**Korak 6**: Finalno testiranje
- Pokretanje GET /api/ai/test-graph s različitim upitima
- Provjera da li AI sada poštuje RAG kontekst

### 4. TESTNI SCENARIJI

**Test 1**: Jednostavno pitanje ("O čemu se radi u priči?")
- **Očekivano**: `routeTaskNode` odabire `simple_retrieval`
- **Očekivano**: Odgovor se temelji samo na RAG kontekstu

**Test 2**: Kreativni zahtjev ("Napiši scenu...")
- **Očekivano**: `routeTaskNode` odabire `creative_generation`
- **Očekivano**: `generateDraftNode` koristi samo elemente iz RAG konteksta
- **Očekivano**: `critiqueDraftNode` kaznava ako se dodaju novi elementi

**Test 3**: Prazan RAG kontekst
- **Očekivano**: AI jasno kaže da nema dovoljno informacija

## OČEKIVANI REZULTATI

Nakon implementacije ovog plana:
1. **Problem A riješen**: Nema više zagađenja lažnim kontekstom
2. **Problem B riješen**: AI strogo poštuje RAG kontekst i ne izmišlja
3. **Kvaliteta poboljšana**: Odgovori su točni i temeljeni na stvarnim podacima
4. **Pouzdanost povećana**: Sustav je predvidljiv i kontroliran
