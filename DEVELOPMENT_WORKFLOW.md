# 🚀 Vodič za Razvoj i Produkcijski Workflow

Ovaj dokument služi kao podsjetnik za proces nadogradnje aplikacije Story Architect Lite. Sustav je postavljen tako da odvaja tvoj lokalni rad od produkcije koju koriste vanjski korisnici (poput Lusi).

## 1. Lokalni Razvoj (Tvoj PC)
*   **Grane (Branches):** Nikada ne radi direktno na `main` grani. Uvijek otvori novu granu za promjene:
    ```bash
    git checkout -b feature-ime-promjene
    ```
*   **Baza podataka:** Tvoj kôd je povezan s Dockerom. Sve što radiš lokalno ostaje u Dockeru i ne utječe na vanjske korisnike.

## 2. Promjene u Bazi Podataka (Migracije)
Ako dodaš, obrišeš ili promijeniš bilo koje polje u `schema.ts`:
1.  U `server` mapi pokreni:
    ```bash
    npm run db:generate
    ```
2.  To će stvoriti novu `.sql` datoteku u folderu `server/drizzle/`.

**Važno:** Ta datoteka je "uputa" koju će robot kasnije poslati na produkciju.

## 3. Puštanje Promjena u Produkciju (Deployment)
Kada si zadovoljan kako sve radi na tvom PC-u, slijedi ovaj strogi redoslijed:

1.  **Spremi promjene na trenutnoj grani:**
    ```bash
    git add .
    git commit -m "opis promjene"
    ```
2.  **Prebaci se na main granu:**
    ```bash
    git checkout main
    ```
3.  **Povuci najnovije promjene s GitHub-a (za svaki slučaj):**
    ```bash
    git pull origin main
    ```
4.  **Spoji svoju granu u main:**
    ```bash
    git merge feature-ime-promjene
    ```
5.  **POBJEDNIČKI PUSH (Okidač za Robota):**
    ```bash
    git push origin main
    ```

## 4. Što se događa nakon Pusha? (Provjera)
Čim napraviš push, sustav automatski radi sljedeće:
*   **Vercel:** Preuzima novi kôd i ažurira izgled/logiku aplikacije.
*   **GitHub Actions (Robot):** Uzima nove `.sql` migracije i primjenjuje ih na Neon bazu u Frankfurtu.

**Provjera:** Uvijek baci oko na **Actions** tab na GitHubu. Zelena kvačica znači da korisnici (Lusi) vide promjene bez greške ✅.
