# 📋 TEHNIČKI PLAN: Implementacija A.2 i A.3
## Robusno Rukovanje FIREBASE_PRIVATE_KEY

**Cilj:** Eliminirati kritičnu grešku `TypeError: Cannot read properties of undefined (reading 'length')` koja se javlja na Renderu.

---

## ZADATAK A.2: Fail Fast Provjera (Backend)

### Lokacija datoteke
- **Datoteka:** `server/src/lib/firebase-admin.ts`
- **Funkcija:** `initializeFirebaseAdmin()`

### Koraci implementacije

1. **Identificirati trenutnu provjeru ključa**
   - Locirati liniju gdje se dohvaća `rawPrivateKey` pomoću `getEnv('FIREBASE_PRIVATE_KEY')`
   - Locirati postojeću provjeru `if (!rawPrivateKey || rawPrivateKey.length < 100)`

2. **Zamijeniti postojeću provjeru fail-fast logikom**
   - Ukloniti postojeću provjeru koja samo logira grešku i vraća se (`console.error` + `return`)
   - Dodati novu provjeru koja baca grešku: `if (!rawPrivateKey)`
   - U provjeri koristiti `throw new Error(...)` s jasnom porukom koja ukazuje na nedostajući `FIREBASE_PRIVATE_KEY`
   - Poruka greške treba biti informativna i jasno ukazivati da je varijabla okruženja obavezna

3. **Osigurati da se greška propagira**
   - Provjeriti da funkcija `initializeFirebaseAdmin()` nema dodatnih try-catch blokova koji bi "progutali" grešku
   - Osigurati da se greška propagira do pozivatelja (`server.ts`)

4. **Ažurirati rukovanje greškom u server.ts**
   - Locirati `server/src/server.ts` i funkciju `startServer()`
   - Locirati try-catch blok oko poziva `initializeFirebaseAdmin()`
   - Promijeniti logiku tako da se greška **NE** hvata i ignorira
   - Ukloniti ili modificirati catch blok koji trenutno logira i nastavlja izvršavanje
   - Osigurati da se greška propagira i prekine pokretanje servera ako `FIREBASE_PRIVATE_KEY` nedostaje

5. **Dodatna provjera za FIREBASE_CLIENT_EMAIL**
   - Dodati sličnu fail-fast provjeru za `FIREBASE_CLIENT_EMAIL` ako već ne postoji
   - Ako `clientEmail` nedostaje, također baciti grešku s jasnom porukom

---

## ZADATAK A.3: Format Ključa (Višelinijski PEM)

### Lokacija datoteke
- **Datoteka:** `server/src/lib/firebase-admin.ts`
- **Funkcija:** `initializeFirebaseAdmin()`

### Koraci implementacije

1. **Verificirati postojeću implementaciju**
   - Locirati liniju gdje se već koristi `.replace(/\\n/g, '\n')` na `rawPrivateKey`
   - Provjeriti da li je transformacija na pravom mjestu (nakon provjere da ključ postoji, prije prosljeđivanja Firebase Admin SDK-u)

2. **Osigurati ispravan redoslijed operacija**
   - Provjeriti da se `.replace(/\\n/g, '\n')` izvršava **nakon** fail-fast provjere iz A.2
   - Provjeriti da se transformirani ključ (`correctedPrivateKey`) koristi u `admin.credential.cert()`

3. **Dodati komentare za dokumentaciju**
   - Dodati komentar koji objašnjava zašto se transformacija izvodi (Render čuva `\n` kao literal `\\n`)
   - Komentar treba biti jasan i informativan za buduće održavanje

4. **Provjeriti da transformacija pokriva sve slučajeve**
   - Osigurati da `.replace(/\\n/g, '\n')` koristi globalni regex flag (`g`)
   - Provjeriti da se transformacija izvodi na sirovom stringu prije bilo kakvog drugog procesiranja

---

## Dodatne Napomene

### Redoslijed izvršavanja
1. Prvo se izvršava A.2 (fail-fast provjera) - ako ključ nedostaje, aplikacija se prekida
2. Zatim se izvršava A.3 (format transformacija) - samo ako ključ postoji

### Ovisnosti
- Implementacija A.2 mora biti završena prije A.3 (logički redoslijed)
- Oba zadatka se implementiraju u istoj datoteci (`firebase-admin.ts`)

### Testiranje
- Nakon implementacije, provjeriti da aplikacija baca jasnu grešku ako `FIREBASE_PRIVATE_KEY` nedostaje
- Provjeriti da aplikacija uspješno inicijalizira Firebase Admin SDK kada je ključ ispravno postavljen
- Provjeriti da se višelinijski PEM ključ ispravno transformira (zamjena `\\n` sa `\n`)

### Git Operacije (A.4 - izvršava korisnik)
- Nakon implementacije A.2 i A.3, promjene se moraju spojiti u `develop` granu
- Promjene se moraju pushati na GitHub

