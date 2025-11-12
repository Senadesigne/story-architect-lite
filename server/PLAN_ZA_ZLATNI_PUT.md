# Plan za Zlatni Put - Rješavanje pgvector Migracije

## Dijagnoza problema

Na temelju analize Deep Search AI-ja i pregleda koda, problem je identificiran:

1. **Zastarjeli customType pristup**: Schema koristi `customType` za definiranje pgvector tipa (linija 126-141 u `schema.ts`)
2. **Sintaktički neispravan SQL**: Generirani SQL sadrži navodnike oko tipa: `"vector(1536)"` (linija 54 u `0000_fast_dust.sql`)
3. **Zastarjele verzije**: drizzle-orm 0.30.1 i drizzle-kit 0.20.14 (trebamo 0.31.0+ i 0.22.0+)

## Plan oporavka - korak po korak

### Korak 1: Čišćenje i resetiranje (5 minuta)

```bash
# Izbriši sve postojeće migracije i meta podatke
rm -rf server/drizzle/*
```

**Napomena**: Ovo će obrisati sve SQL migracije i Drizzle Kit snapshot. Potrebno je resetirati stanje.

### Korak 2: Ažuriranje ovisnosti (10 minuta)

```bash
cd server
pnpm update drizzle-orm drizzle-kit
```

**Očekivani rezultat**:
- drizzle-orm: 0.31.0 ili noviji
- drizzle-kit: 0.22.0 ili noviji

### Korak 3: Kreiranje bootstrap migracije za pgvector ekstenziju (5 minuta)

```bash
# Generiraj praznu prilagođenu migraciju
pnpm drizzle-kit generate --custom --name=enable_vector
```

**Zatim ručno uredi** novu datoteku `server/drizzle/0000_enable_vector.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Korak 4: Refaktoriranje Drizzle sheme (15 minuta)

Urediti `server/src/schema/schema.ts`:

**UKLONITI** (linije 126-141):
```typescript
// Custom type za pgvector - sigurna implementacija
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() { 
    return 'vector(1536)'; // OpenAI text-embedding-3-small koristi 1536 dimenzija
  },
  toDriver(value: number[]): string {
    // Pretvori array brojeva u PostgreSQL vector format
    // pgvector koristi format: [1,2,3,...]
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // Pretvori PostgreSQL vector string natrag u array
    // Format iz pgvector: [1,2,3,...] ili (1,2,3,...)
    const cleanValue = value.replace(/^\[|\]$/g, '').replace(/^\(|\)$/g, '');
    return cleanValue.split(',').map(v => parseFloat(v.trim()));
  },
});
```

**ZAMIJENITI** import (linija 1):
```typescript
import { pgTable, text, timestamp, uuid, varchar, integer, index, vector, jsonb } from 'drizzle-orm/pg-core';
```

**AŽURIRATI** definiciju tablice (linija 154):
```typescript
vector: vector('vector', { dimensions: 1536 }).notNull(),
```

**DODATI** HNSW indeks (nakon linije 161):
```typescript
// Vektorski indeks za brzu pretragu sličnosti
vectorIdx: index('idx_story_architect_embeddings_vector')
  .using('hnsw', table.vector.op('vector_cosine_ops')),
```

### Korak 5: Generiranje novih migracija (5 minuta)

```bash
pnpm db:generate
```

**Verifikacija**: Otvori novu SQL datoteku i provjeri:
- Tip vector NEMA navodnike: `"vector" vector(1536)` (ispravno)
- NE: `"vector" "vector(1536)"` (neispravno)

### Korak 6: Pokretanje migracija (5 minuta)

```bash
pnpm db:migrate:run
```

**Očekivani tok**:
1. Prvo se izvršava `0000_enable_vector.sql` - kreira pgvector ekstenziju
2. Zatim se izvršava nova migracija - kreira tablice s ispravnim vector tipom

### Korak 7: Verifikacija (5 minuta)

Provjeri da li je sve uspjelo:

```bash
# Testiraj konekciju i provjeri tablice
pnpm db:test

# Otvori Drizzle Studio za vizualnu provjeru
pnpm db:studio
```

## Dodatni koraci za robusnost

### A. Provjera search_path (ako migracija još uvijek ne radi)

Poveži se na bazu i provjeri gdje je pgvector instaliran:
```sql
\dx
```

Ako pgvector nije u public shemi, postavi search_path trajno:
```sql
ALTER ROLE <migration_user> SET search_path = "$user", public, extensions;
```

### B. Ažuriranje helper funkcija

Ako imaš helper funkcije za rad s vektorima, ažuriraj ih da koriste novu shemu:

```typescript
// Primjer helper funkcije
export function toVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export function fromVector(vectorString: string): number[] {
  const cleanValue = vectorString.replace(/^\[|\]$/g, '').replace(/^\(|\)$/g, '');
  return cleanValue.split(',').map(v => parseFloat(v.trim()));
}
```

## Procjena vremena

- Ukupno vrijeme: ~50 minuta
- Kritični koraci: 4 (refaktoriranje sheme) i 5 (verifikacija SQL-a)

## Napomene za buduće migracije

1. **Uvijek pregledaj generirani SQL** prije pokretanja migracija
2. **Održavaj ažurirane verzije** drizzle-orm i drizzle-kit paketa
3. **Ekstenzije uvijek u prvoj migraciji** (0000_*.sql)
4. **Koristi nativne tipove** kada su dostupni, izbjegavaj customType

## Kontingencijski plan

Ako migracija još uvijek ne radi nakon ovih koraka:

1. Provjeri PostgreSQL verziju (pgvector zahtijeva 11+)
2. Provjeri ima li korisnik baze CREATE EXTENSION privilegije
3. Ručno kreiraj ekstenziju izravno u bazi prije migracija
4. Kontaktiraj hosting providera (Supabase/Neon) za podršku s pgvector

## Status zadataka

- [ ] Korak 1: Obriši stare migracije
- [ ] Korak 2: Ažuriraj pakete
- [ ] Korak 3: Stvori bootstrap migraciju  
- [ ] Korak 4: Refaktoriraj shemu
- [ ] Korak 5: Generiraj nove migracije
- [ ] Korak 6: Pokreni migracije
- [ ] Korak 7: Verificiraj rezultat
