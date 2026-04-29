# Story Architect Lite

AI writing assistant za romane i kratke priče. Pomaže s planiranjem priče,
razvojem likova, pisanjem scena i brainstormingom — uz kontekst cijele knjige.

## Stack

| Sloj | Tehnologija |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind + Zustand |
| Backend | Hono (Node.js) + Drizzle ORM |
| Baza | Neon PostgreSQL + pgvector (RAG embeddings) |
| Auth | Firebase Auth (Google Sign-In) |
| AI orchestracija | LangGraph (Manager → Worker → Critique → Humanizer) |
| Deployment | Vercel (frontend + backend kao serverless funkcije) |

## AI arhitektura — hibridni setup

```
Request → LangGraph Graph
           ├── Manager   → qwen3:30b-a3b     (HPE #1, Ollama, lokalno via Tailscale)
           ├── Worker    → claude-sonnet-4-6  (Anthropic API, cloud)
           ├── Critique  → qwen3:30b-a3b     (HPE #1, Ollama)
           ├── Humanizer → qwen3:30b-a3b     (HPE #1, Ollama)
           └── Embeddings→ nomic-embed-text  (HPE #1, Ollama, 768 dim)
```

Manager preuzima rutiranje, analizu konteksta i prompt engineering besplatno
(lokalni Qwen). Sonnet piše prozu. Ovo smanjuje API troškove za ~60%.

## Pokretanje lokalno

```bash
pnpm install
pnpm dev
```

- Frontend: http://localhost:5501
- Backend: http://localhost:8787

Za AI funkcionalnost lokalno, HPE #1 mora biti dostupan via Tailscale
(`OLLAMA_BASE_URL=http://192.168.10.197:11434`). Bez HPE #1, Worker
(Anthropic) i dalje radi ako je `ANTHROPIC_API_KEY` postavljen.

## Env varijable

Kopiraj `server/.env.example` u `server/.env` i popuni:

```dotenv
DATABASE_URL=              # Neon PostgreSQL connection string
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

WORKER_PROVIDER=anthropic
WORKER_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=         # sk-ant-...

MANAGER_PROVIDER=ollama
MANAGER_MODEL=qwen3:30b-a3b
OLLAMA_BASE_URL=http://192.168.10.197:11434

EMBED_MODEL=nomic-embed-text
```

## DB migracije

```bash
cd server
pnpm db:generate   # generira SQL iz Drizzle sheme
pnpm db:migrate    # primjenjuje migracije
```

## Status refaktoriranja (MASTER_PLAN_REFAKTORIRANJA.md)

| Faza | Opis | Status |
|---|---|---|
| Faza 1 | Kritični bugovi (timeout, schema, RAG, testovi) | ✅ DONE |
| Faza 2 | AI Factory unifikacija | ✅ DONE (3be2b66) |
| Faza 3 | LLM migracija — hibridni env config | ✅ DONE (partial — testiranje čeka HPE #1) |
| Faza 4       | Čišćenje (dead code, README)                    | 🟡 U TIJEKU (većina završena) |
| Faza 5-A     | Humanization Layer temelj (state, DB, settings) | ✅ DONE                       |
| Faza 5-B     | humanizationNode + graph routing                | ✅ DONE                       |
| Faza 5 (7-8) | Style Profile API i UI                          | ❌ OSTALO                     |
