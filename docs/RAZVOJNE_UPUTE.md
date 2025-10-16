# Razvojne Upute i Procedure

Ovaj dokument sadrži ključne procedure i rješenja za uobičajene probleme tijekom razvoja.

## Rad s Bazom Podataka (Drizzle)

Naš projekt koristi Drizzle ORM za upravljanje bazom podataka. Postoje dva glavna načina za ažuriranje baze.

### 1. Standardni Tijek Rada (Preporučeno)

Ovo je ispravan način za uvođenje promjena u bazu (npr. dodavanje novog stupca).

1.  **Napravi izmjene u `server/src/schema/schema.ts`**.
2.  **Generiraj upute za promjenu (migraciju):**
    ```bash
    cd server
    pnpm run db:generate
    ```
3.  **Primijeni upute na bazu:**
    ```bash
    pnpm run db:migrate
    ```

### 2. "Nuklearna Opcija" (Reset Baze u Slučaju Velikih Problema)

Ako se baza podataka nađe u nepopravljivom ili nepoznatom stanju, ova procedura će je **potpuno obrisati i stvoriti novu, čistu verziju** prema zadnjoj shemi. **UPOZORENJE: Svi podaci u lokalnoj bazi bit će izgubljeni.**

1.  **Zaustavi server** (`Ctrl + C`).
2.  **Obriši folder baze:** U File Exploreru, obriši `data/postgres`.
3.  **Pokreni server ponovno (Terminal 1):**
    ```bash
    pnpm run dev
    ```
    (Ovo će stvoriti novu, praznu bazu).
4.  **Primijeni cijelu shemu (Terminal 2):**
    ```bash
    cd server
    pnpm run db:push
    ```