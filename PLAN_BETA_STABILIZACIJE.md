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
| **B.1** | ❌ TO DO | **Promjena Grane** | U postavkama Render Web Servisa (Settings) **promijeniti povezanu granu iz `main` u `develop`**. | Korisnik |
| **B.2** | ❌ TO DO | **Ponovni Unos Ključa** | U Render Dashboardu, u 'Environment Variables', **izbrisati i ponovno unijeti** kompletan `FIREBASE_PRIVATE_KEY` i `FIREBASE_CLIENT_EMAIL`. | Korisnik |
| **B.3** | ❌ TO DO | **Pokretanje Deploya** | Ručno pokrenuti novi `Deploy` ili pričekati automatski deploy. | Korisnik |
| **B.4** | ❌ TO DO | **Provjera Logova** | Potvrditi da se **NE** pojavljuje `TypeError: Cannot read properties of undefined` i da je servis uspješno pokrenut. | Korisnik |

## Faza C: Konfiguracija Frontenda (Vercel)

| ID | Status | Zadatak | Cilj i Detalji | Izvršitelj |
| :--- | :--- | :--- | :--- | :--- |
| **C.1** | ❌ TO DO | **Re-kreacija Projekta** | Ponovo uvesti Git repozitorij (`story-architect-lite`) na Vercel. Postaviti **Root Directory na `ui`**. | Korisnik |
| **C.2** | ❌ TO DO | **Unos Env Varijabli** | Unijeti **svih 8 VITE varijabli** u Vercel. | Korisnik |
| **C.3** | ❌ TO DO | **Finalni Deploy** | Pokrenuti Vercel deploy. | Korisnik |

## Faza D: Testiranje i Predaja

| ID | Status | Zadatak | Cilj i Detalji | Izvršitelj |
| :--- | :--- | :--- | :--- | :--- |
| **D.1** | ❌ TO DO | **End-to-End Test** | Otvoriti Vercel URL, testirati **registraciju/logiranje** i **kreiranje novog projekta**. | Korisnik |
| **D.2** | ❌ TO DO | **Predaja** | Ako **D.1** prođe, Beta verzija je spremna za kolegicu. | Korisnik |

