Spremni Promptovi za Cursor
Ova datoteka sadrži standardizirane promptove koje koristimo u razvoju "Story Architect Lite" kako bismo osigurali konzistentnost i kvalitetu.

1. Planiranje Nove Značajke
Ovaj prompt koristimo kada započinjemo rad na novom zadatku iz PROJEKTNI_PLAN_v2.md

Kako koristiti: Kopirajte cijeli tekst ispod, zalijepite ga u novi chat, i zamijenite [Ovdje detaljno opišite značajku] s opisom zadatka.

@PROJEKTNI_PLAN_v2.md
@.cursor-rules
@server/src/schema/schema.ts
TEHNICKA_SPECIFIKACIJA_v2.md

Napravi detaljan, isključivo **tehnički plan** za implementaciju sljedeće značajke. Plan treba biti lista konkretnih koraka (koje datoteke kreirati, koje izmijeniti, koje funkcije dodati, koje API rute definirati), bez primjera koda.

**Značajka za planiranje:**
[Ovdje detaljno opišite značajku, npr. "Implementirati Zadatak 1.1 s backenda: Kreirati API rutu (GET /api/projects) koja dohvaća sve projekte za prijavljenog korisnika."]

2. Pregled Koda (Code Review)
Ovaj prompt koristimo NAKON što je implementacija značajke gotova, u potpuno novom chatu.

Kako koristiti: Kopirajte tekst ispod, zalijepite ga u novi chat i priložite datoteku s tehničkim planom koji je implementiran.

@.cursor-rules
@[datoteka-s-tehnickim-planom.md]

Obavi detaljan i nepristran pregled koda za nedavno implementiranu značajku, opisanu u priloženom planu.

Fokusiraj se na:
1.  **Usklađenost s planom:** Jesu li svi tehnički koraci iz plana implementirani?
2.  **Potencijalne greške (bugs):** Postoje li očite logičke greške?
3.  **Kvaliteta koda:** Pridržava li se kod smjernica iz `.cursor-rules` datoteke?
4.  **Sigurnost:** Postoje li očiti sigurnosni propusti?

Generiraj sažeti izvještaj o pregledu.

3. Planiranje AI Značajke
Ovaj prompt koristimo kada planiramo implementaciju AI funkcionalnosti.

Kako koristiti: Kopirajte tekst ispod, zalijepite ga u novi chat i opišite AI značajku koju želite implementirati.

@PROJEKTNI_PLAN_v2.md
@.cursorrules
@server/src/schema/schema.ts
@TEHNIČKA_SPECIFIKACIJA_v2.md

Razvijam novu AI značajku za Story Architect Lite. Molim te analiziraj:

**Značajka za implementaciju:**
[Ovdje detaljno opišite AI značajku, npr. "Implementirati AI generiranje sažetka scene na temelju konteksta cijele priče"]

**Analiza:**
1. **Backend:** Kako organizirati AI service sloj i API rute?
2. **Kontekst:** Koje podatke iz baze trebam prikupiti za kvalitetan AI odgovor?
3. **Prompt Engineering:** Kako strukturirati promptove za najbolje rezultate?
4. **Frontend:** Kako elegantno integrirati AI u postojeće forme?
5. **Error Handling:** Kako gracefully handlirati AI timeout/failure?
6. **Sigurnost:** Kako zaštititi API ključeve i ograničiti pristup?

Napravi detaljan tehnički plan s konkretnim koracima implementacije.