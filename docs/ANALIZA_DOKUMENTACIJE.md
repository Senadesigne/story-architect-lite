# Analiza Dokumentacije i Prijedlog Čišćenja

**Datum:** 18. studenog 2025  
**Cilj:** Verifikacija sljedećeg koraka i kategorizacija svih .md datoteka za čišćenje

---

## 1. VERIFIKACIJA SLJEDEĆEG KORAKA

### ✅ Potvrda: Zadatak 3.7 je sljedeći logičan korak

**Status:** **POTVRĐENO** ✅

**Dokaz:**
- U `PROJEKTNI_PLAN_v2.md` (linija 22): **Zadatak 3.7 (NOVI):** Korak 1 - Postavljanje LangGraph.js i definiranje AgentState-a
- Zadatak je prvi u Epic: AI Integracija - Faza B (Orkestrator) 🟢
- Prethodni zadaci (3.1-3.6) su označeni kao ✅ završeni

**Napomena:** AgentState je već djelomično implementiran u `server/src/services/ai/graph/state.ts`, ali zadatak možda nije potpuno završen/testiran. Preporučeno je provjeriti implementaciju prije nastavka.

---

## 2. KATEGORIZACIJA SVIH .MD DATOTEKA

### 📊 Tablica Kategorizacije

| Datoteka | Lokacija | Status | Razlog | Akcija |
|----------|----------|--------|--------|--------|
| **ACTIVE - Glavni Planovi** |
| `PROJEKTNI_PLAN_v2.md` | `docs/` | ✅ ACTIVE | Centralni plan za praćenje zadataka | **ZADRŽATI** |
| `TEHNIČKA_SPECIFIKACIJA_v2.md` | `docs/` | ✅ ACTIVE | Detaljne tehničke specifikacije | **ZADRŽATI** |
| `product-brief.md` | `docs/` | ✅ ACTIVE | Produktni brief i dugoročna vizija | **ZADRŽATI** |
| `COMMAND_PROMPTS.md` | `docs/` | ✅ ACTIVE | Promptovi za AI asistenta | **ZADRŽATI** |
| `README.md` | `root/` | ✅ ACTIVE | Glavni README projekta | **ZADRŽATI** |
| `server/README.md` | `server/` | ✅ ACTIVE | Backend dokumentacija | **ZADRŽATI** |
| `ui/README.md` | `ui/` | ✅ ACTIVE | Frontend dokumentacija | **ZADRŽATI** |
| `database-server/README.md` | `database-server/` | ✅ ACTIVE | Database dokumentacija | **ZADRŽATI** |
| `server/src/services/ai/README.md` | `server/src/services/ai/` | ✅ ACTIVE | AI servis dokumentacija | **ZADRŽATI** |
| **COMPLETED/MERGED - Implementirani Planovi** |
| `novi_plan_za_editor.md` | `docs/` | ✅ COMPLETED | Plan za Editor stabilizaciju (Auto-save, Context Menu) | **ARHIVIRATI** |
| `neki_plan.md` | `root/` | ✅ COMPLETED | Plan za upravljanje scenama (Zadatak 1.3) | **ARHIVIRATI** |
| `TEHNICKI_PLAN_AI_FAZA_A.md` | `root/` | ✅ COMPLETED | Plan za AI Fazu A (Zadatak 3.2) - implementirano | **ARHIVIRATI** |
| `TEHNICKI_PLAN_C1_CHAT_API.md` | `root/` | ✅ COMPLETED | Plan za Chat API (Zadatak C.1) - implementirano | **ARHIVIRATI** |
| `TEHNICKI_PLAN_C2_STUDIO_UI.md` | `root/` | ✅ COMPLETED | Plan za Studio UI (Zadatak C.2) - implementirano | **ARHIVIRATI** |
| `PLAN_ZA_FAZU_3.md` | `root/` | ✅ COMPLETED | Plan za Unit Testove (Zadatak 1.8) - implementirano | **ARHIVIRATI** |
| `PLAN_PROMPT_ENGINEERING.md` | `root/` | ✅ COMPLETED | Plan za poboljšanje promptova - implementirano | **ARHIVIRATI** |
| `PLAN_ZADATAK_3_8_RAG_CVOROVI.md` | `root/` | ✅ COMPLETED | Plan za RAG čvorove (Zadatak 3.8) - implementirano | **ARHIVIRATI** |
| `PLAN_ZADATAK_3_9_SMART_ROUTING.md` | `root/` | ✅ COMPLETED | Plan za Smart Routing (Zadatak 3.9) - implementirano | **ARHIVIRATI** |
| `PLAN_ZADATAK_3_10_REFLECTION_PETLJA.md` | `root/` | ✅ COMPLETED | Plan za Reflection petlju (Zadatak 3.10) - implementirano | **ARHIVIRATI** |
| `PLAN_TESTIRANJE_GRAFA.md` | `root/` | ✅ COMPLETED | Plan za testiranje grafa - implementirano | **ARHIVIRATI** |
| `docs/TEHNICKI_PLAN_AI_FAZA_B_v2.md` | `docs/` | ✅ COMPLETED | Arhitektura za LangGraph (Zadatak 3.6) - implementirano | **ARHIVIRATI** |
| `docs/TEHNICKI_PLAN_REFAKTORING_FAZA2.md` | `docs/` | ✅ COMPLETED | Plan za Refaktoring Fazu 2 - implementirano | **ARHIVIRATI** |
| `docs/FIXED_PORT_REFACTORING.md` | `docs/` | ✅ COMPLETED | Plan za port refaktoring - implementirano | **ARHIVIRATI** |
| `docs/PORT_HANDLING.md` | `docs/` | ✅ COMPLETED | Plan za port handling - implementirano | **ARHIVIRATI** |
| `docs/plan_oporavka_koda.md` | `docs/` | ✅ COMPLETED | Plan za oporavak koda - implementirano | **ARHIVIRATI** |
| `server/PLAN_ZA_ZLATNI_PUT.md` | `server/` | ✅ COMPLETED | Privremeni plan - implementirano | **ARHIVIRATI** |
| **OBSOLETE - Stare Verzije** |
| `docs/PROJEKTNI_PLAN.md` | `docs/` | ⚠️ OBSOLETE | Stara verzija - zamijenjeno s PROJEKTNI_PLAN_v2.md | **ARHIVIRATI** |

---

## 3. PRIJEDLOG NAREDBI ZA ARHIVIRANJE

### Korak 1: Kreiranje archive direktorija

```bash
mkdir -p docs/archive/completed
mkdir -p docs/archive/obsolete
```

### Korak 2: Premještanje COMPLETED datoteka

```bash
# Root level completed plans
mv neki_plan.md docs/archive/completed/
mv TEHNICKI_PLAN_AI_FAZA_A.md docs/archive/completed/
mv TEHNICKI_PLAN_C1_CHAT_API.md docs/archive/completed/
mv TEHNICKI_PLAN_C2_STUDIO_UI.md docs/archive/completed/
mv PLAN_ZA_FAZU_3.md docs/archive/completed/
mv PLAN_PROMPT_ENGINEERING.md docs/archive/completed/
mv PLAN_ZADATAK_3_8_RAG_CVOROVI.md docs/archive/completed/
mv PLAN_ZADATAK_3_9_SMART_ROUTING.md docs/archive/completed/
mv PLAN_ZADATAK_3_10_REFLECTION_PETLJA.md docs/archive/completed/
mv PLAN_TESTIRANJE_GRAFA.md docs/archive/completed/

# Docs folder completed plans
mv docs/novi_plan_za_editor.md docs/archive/completed/
mv docs/TEHNICKI_PLAN_AI_FAZA_B_v2.md docs/archive/completed/
mv docs/TEHNICKI_PLAN_REFAKTORING_FAZA2.md docs/archive/completed/
mv docs/FIXED_PORT_REFACTORING.md docs/archive/completed/
mv docs/PORT_HANDLING.md docs/archive/completed/
mv docs/plan_oporavka_koda.md docs/archive/completed/

# Server folder completed plans
mv server/PLAN_ZA_ZLATNI_PUT.md docs/archive/completed/
```

### Korak 3: Premještanje OBSOLETE datoteka

```bash
mv docs/PROJEKTNI_PLAN.md docs/archive/obsolete/
```

---

## 4. REZULTAT NAKON ČIŠĆENJA

### Struktura dokumentacije nakon čišćenja:

```
story-architect-lite/
├── README.md                                    ✅ ACTIVE
├── docs/
│   ├── PROJEKTNI_PLAN_v2.md                    ✅ ACTIVE
│   ├── TEHNIČKA_SPECIFIKACIJA_v2.md            ✅ ACTIVE
│   ├── product-brief.md                        ✅ ACTIVE
│   ├── COMMAND_PROMPTS.md                      ✅ ACTIVE
│   ├── ANALIZA_DOKUMENTACIJE.md                ✅ ACTIVE (novi)
│   └── archive/
│       ├── completed/                          (18 datoteka)
│       └── obsolete/                           (1 datoteka)
├── server/
│   ├── README.md                               ✅ ACTIVE
│   └── src/services/ai/README.md               ✅ ACTIVE
├── ui/
│   └── README.md                               ✅ ACTIVE
└── database-server/
    └── README.md                               ✅ ACTIVE
```

**Ukupno ACTIVE datoteka:** 9  
**Ukupno ARHIVIRANIH datoteka:** 19

---

## 5. PREPORUKE

1. **Zadržati samo aktive planove** u glavnom `docs/` folderu
2. **Arhivirati sve implementirane planove** u `docs/archive/completed/`
3. **Arhivirati stare verzije** u `docs/archive/obsolete/`
4. **Kreirati README.md u archive folderu** s objašnjenjem strukture

---

## 6. SLJEDEĆI KORACI

1. ✅ Verifikacija Zadatka 3.7 kao sljedećeg koraka
2. ⏭️ Izvršiti arhiviranje datoteka (naredbe iz sekcije 3)
3. ⏭️ Kreirati `docs/archive/README.md` s objašnjenjem strukture
4. ⏭️ Provjeriti implementaciju Zadatka 3.7 prije nastavka

---

**Napomena:** Ova analiza je kreirana automatski. Preporučeno je ručno pregledati arhivirane datoteke prije brisanja ako je potrebno.

