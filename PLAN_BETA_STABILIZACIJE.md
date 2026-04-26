> ⚠️ DJELOMIČNO ZASTARJELO (2026-04-26): Backend je prebačen s Rendera na Vercel.
> Faze A i B (Render) su zamijenjene Vercel deploymentom. Faze C i D su završene.

# 🛠️ PLAN BETA STABILIZACIJE: RENDER/VERCEL DEPLOYMENT

Cilj: Postići stabilan online pristup Beta verziji projekta (`develop` grana) na Renderu i Vercelu.

## Faza A: Atomizirani Popravak Koda (Prioritet: Kritično 🔴)

Ova faza rješava kritični TypeError uzrokovan neispravnom varijablom okruženja na Renderu.

| ID | Status | Zadatak | Cilj i Detalji | Izvršitelj |
| :--- | :--- | :--- | :--- | :--- |
| **A.1** | ✅ DONE | **Cursor Prompt** (Generiranje Plana) | Kreirati prompt za Cursor za plan implementacije A.2/A.3. | Gemini (Vi) |
| **A.2** | ❌ TO DO | **Korekcija Koda: Fail Fast (Backend)** | Implementirati robustnu provjeru (`if (!process.env.KEY)`) u `firebase-admin.ts`. Aplikacija mora **izbaciti grešku i prekinuti izvršavanje** ako ključ nedostaje. | Cursor |
| **A.3** | ❌ TO DO | **Korekcija Koda: Format Ključa** | Implementirati `.replace(/\\n/g, '\n')` za rješavanje problema višelinijskog kodiranja ključa (PEM format). | Cursor |
| **A.4** | ❌ TO DO | **Git Operacija** | Spojiti promjene iz A.2 i A.3 u `develop` granu i **pushati na GitHub**. | Korisnik |

## Faza B: Stabilizacija Backenda (Render Konfiguracija)

Ova faza zahtijeva ručnu intervenciju na Renderu. Pokreće se **nakon** što je kod ispravljen (Faza A).

| ID | Status | Zadatak | Cilj i Detalji | Izvršitelj |
| :--- | :--- | :--- | :--- | :--- |
| **B.1** | ~~❌ TO DO~~ | ~~Promjena Grane~~ | ZASTARJELO — Render zamijenjen Vercelom. | — |
| **B.2** | ~~❌ TO DO~~ | ~~Ponovni Unos Ključa~~ | ZASTARJELO | — |
| **B.3** | ~~❌ TO DO~~ | ~~Pokretanje Deploya~~ | ZASTARJELO | — |
| **B.4** | ~~❌ TO DO~~ | ~~Provjera Logova~~ | ZASTARJELO | — |

## Faza C: Konfiguracija Frontenda (Vercel)

| ID | Status | Zadatak | Cilj i Detalji | Izvršitelj |
| :--- | :--- | :--- | :--- | :--- |
| **C.1** | ✅ DONE | **Re-kreacija Projekta** | Ponovo uvesti Git repozitorij (`story-architect-lite`) na Vercel. Postaviti **Root Directory na `ui`**. | Korisnik |
| **C.2** | ✅ DONE | **Unos Env Varijabli** | Unijeti **svih 8 VITE varijabli** u Vercel. | Korisnik |
| **C.3** | ✅ DONE | **Finalni Deploy** | Pokrenuti Vercel deploy. | Korisnik |

## Faza D: Testiranje i Predaja

| ID | Status | Zadatak | Cilj i Detalji | Izvršitelj |
| :--- | :--- | :--- | :--- | :--- |
| **D.1** | ✅ DONE | **End-to-End Test** | Otvoriti Vercel URL, testirati **registraciju/logiranje** i **kreiranje novog projekta**. | Korisnik |
| **D.2** | ✅ DONE | **Predaja** | Ako **D.1** prođe, Beta verzija je spremna za kolegicu. | Korisnik |

