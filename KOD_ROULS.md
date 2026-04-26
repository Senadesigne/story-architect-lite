# KOD_ROULS

## Projekt (kratko)
- Production: Vercel deployment (UI + /api/* backend u istom projektu)
- Auth: Firebase (UI dobije ID token i šalje `Authorization: Bearer <token>`)
- Backend: Hono na Vercel Functions (bridge + rute)
- DB: Neon Postgres (projekti/tekst)

## Uloge
- **Senad (owner)**: git/terminal, Vercel postavke, odlučuje kad ide u production, radi merge.
- **ChatGPT**: vodi plan, daje kratke korake, piše promptove za Antigravity, provjerava rezultate testova.
- **Antigravity/Cursor**: radi izmjene koda ISKLJUČIVO po promptu i planu; bez samovolje; odgovara na hrvatskom.

## Pravila rada (OBAVEZNO)
1) **Bez “spaghetti” rješenja**
   - Nema dupliciranja configa “za svaki slučaj”.
   - Prvo analiza strukture + gdje je Vercel root + što je ispravno mjesto za promjenu.

2) **Antigravity radi u 2 faze**
   - FAZA A: Analiza + Plan + “što će točno promijeniti” + “kako testirati”.
   - Senad zalijepi plan ChatGPT-u → ChatGPT odobri/korigira.
   - FAZA B: Tek nakon odobrenja, Antigravity radi promjene.

3) **Production je stabilna verzija za Lusi**
   - Lusi koristi samo production URL (uvijek isti).
   - Ne radimo eksperimente direktno na productionu.

4) **Branching**
   - Sve promjene idu na `feature/*` (ili `dev`) granu.
   - Testira se na localhost + Vercel Preview.
   - Tek kad sve prođe → PR → merge u `main` → Vercel redeploy production.

5) **Sigurnost (DB)**
   - Prije većih promjena: backup / PITR / plan rollbacka.
   - Dok Lusi piše: samo “sigurne” promjene (dodavanje), izbjegavati rename/delete bez plana.

6) **Komunikacija**
   - Svi promptovi i odgovori: hrvatski.
   - Koraci kratki, jasni, bez nepotrebne teorije.
   - Ako postoji rizik: prvo upozorenje + plan minimizacije rizika.

## Standardni workflow (checklista)
- [ ] `git checkout main && git pull`
- [ ] `git checkout -b feature/<naziv> && git push -u origin feature/<naziv>`
- [ ] Antigravity: analiza + plan (bez izmjena)
- [ ] ChatGPT odobri plan
- [ ] Antigravity napravi izmjene
- [ ] Senad lokalni test (kratko)
- [ ] commit + push
- [ ] PR → Vercel Preview test
- [ ] merge u main
- [ ] Production test (brzi sanity check)

## Napomena
- Ako se pojave “čudne” razlike između local/preview/production:
  - prvo provjeriti da li je deploy stvarno na pravom commitu (Vercel deployment source/commit).
