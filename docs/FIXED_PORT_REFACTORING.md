# Fixed Port Refactoring - PostgreSQL na portu 5432

## Pregled promjena

Refaktorirao sam sustav tako da PostgreSQL baza podataka uvijek koristi fiksni port **5432** umjesto dinamičkih portova. Ovo rješava probleme s nestabilnošću na Windows sustavu.

## Implementirane promjene

### 1. **scripts/port-manager.js**
- Funkcija `getAvailablePorts()` sada vraća fiksni port 5432 za PostgreSQL
- Uklonjena logika za dinamičko traženje slobodnih portova za bazu
- Ažurirana `getDatabaseUrl()` funkcija da uvijek koristi port 5432
- Ažurirana `updateServerEnvWithPorts()` funkcija da postavlja DATABASE_URL na port 5432

### 2. **scripts/run-dev.js**
- Database server se sada uvijek pokreće s `--port 5432`
- Ažurirani ispisi da pokazuju fiksni port 5432

### 3. **database-server/src/embedded-postgres.ts**
- Zadani port promijenjen s 5502 na 5432

### 4. **server/.env**
- Trebate ručno kreirati ovu datoteku s:
  ```env
  DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/postgres
  FIREBASE_PROJECT_ID=demo-project
  FIREBASE_AUTH_EMULATOR_HOST=localhost:5503
  ```

### 5. **scripts/setup-firewall-windows.ps1**
- Pojednostavljena firewall skripta
- Sada otvara samo port 5432 umjesto raspona 5432-5999

### 6. **server/drizzle.config.ts**
- Zadani connectionString sada koristi port 5432

## Prednosti ovog pristupa

1. **Stabilnost**: Nema više problema s "zombi" procesima i lock datotekama
2. **Jednostavnost**: Uvijek znate na kojem portu radi baza
3. **Kompatibilnost**: Port 5432 je standardni PostgreSQL port
4. **Brzina**: Nema više čekanja na traženje slobodnih portova

## Napomene za korištenje

- Osigurajte da nemate drugi PostgreSQL servis koji već koristi port 5432
- Ako trebate pokrenuti više instanci aplikacije, koristite različite direktorije projekta
- Windows korisnici trebaju jednom pokrenuti `scripts/setup-firewall-windows.ps1` kao Administrator

## Migracija s postojećeg sustava

1. Zaustavite sve pokrenute instance aplikacije
2. Ručno kreirajte `server/.env` datoteku s gore navedenim sadržajem
3. Pokrenite `pnpm run dev` - baza će se automatski pokrenuti na portu 5432
