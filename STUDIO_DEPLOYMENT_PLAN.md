# STUDIO DEPLOYMENT PLAN

**Status:** PENDING — čeka kraj refaktoriranja (Faza 5)
**Cilj:** Migracija Story Architect Lite iz lokalnog dev okruženja u Studio BB

## Trenutna topologija (development)

- Baza: Docker PostgreSQL na lokalnom PC-u (Senadov)
- Server: Node.js lokalno
- UI: Vite dev server lokalno
- Ollama: HPE #1 u Studio BB (192.168.10.197:11434) preko Tailscale-a
- Worker: Anthropic cloud (Claude Sonnet)

## Ciljna topologija (produkcija)

### INFRA_VLAN (10.0.20.0/24) — IBM M5 "Frontend"
- PostgreSQL 15 + pgvector (Docker) — port 5432 (interno)
- Hono API server (Node.js) — port 3000 (interno)
- Nginx reverse proxy — port 443 (javno, Let's Encrypt)

### SERVICE_VLAN (10.0.40.0/24) — HPE #1
- Ollama (postojeća) — qwen3:30b-a3b + nomic-embed-text

### CLOUD
- Anthropic API — Claude Sonnet 4.6 za Worker
- Vercel ili self-hosted — UI (Next.js ili Vite static)
- Firebase Auth — autentifikacija

## Migration checklist

1. [ ] Instalirati Docker + docker-compose na IBM M5
2. [ ] Postaviti PostgreSQL + pgvector kao Docker Compose stack
3. [ ] Backup lokalne baze + restore na Studio bazu
4. [ ] Deploy Hono server (PM2 ili Docker)
5. [ ] Nginx reverse proxy + Let's Encrypt za HTTPS
6. [ ] DNS: storyarchitect.aintelligence.design → javni IP
7. [ ] Firewall rule: HTTPS iz interneta → Nginx
8. [ ] Test end-to-end iz UK-a preko Tailscale-a
9. [ ] Produkcijski smoke test
10. [ ] Switch Vercel UI na produkcijski API endpoint

## Env varijable za produkciju

- DATABASE_URL → internal PostgreSQL u INFRA_VLAN
- OLLAMA_BASE_URL → http://192.168.10.197:11434 (ostaje isto)
- ANTHROPIC_API_KEY → produkcijski key
- FIREBASE_* → produkcijska Firebase konfiguracija

## Backup strategija

- PBS (IBM M4) kad bude aktivan — noćni backup cijelog VM-a
- PostgreSQL dump → BACKUP_VLAN dnevno
- Voice samples korisnika → odvojena enkriptirana pohrana

## Što NE mijenjamo

- Ollama na HPE #1 ostaje isti
- Claude Sonnet API ost
