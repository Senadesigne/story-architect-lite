Spremni Promptovi za Cursor
Ova datoteka sadrži standardizirane promptove koje koristimo u razvoju "Story Architect Lite" kako bismo osigurali konzistentnost i kvalitetu.

1. Planiranje Nove Značajke
Ovaj prompt koristimo kada započinjemo rad na novom zadatku iz PROJEKTNI_PLAN.md.

Kako koristiti: Kopirajte cijeli tekst ispod, zalijepite ga u novi chat, i zamijenite [Ovdje detaljno opišite značajku] s opisom zadatka.

@PROJEKTNI_PLAN.md
@.cursor-rules
@server/src/schema/schema.ts

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