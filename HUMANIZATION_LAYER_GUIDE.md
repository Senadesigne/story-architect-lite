HUMANIZATION_LAYER_GUIDE.md
Datum: 2026-04-21
Projekt: story-architect-lite
Namjena: Upute za ugradnju humanizacije AI teksta u naš pipeline

Problem koji rješavamo:
AI-generirani tekst ima prepoznatljive obrasce koje detektori (i čitatelji) 
lako uočavaju:
- Ponavljajuće fraze ("revolutionize", "harness the power of", em-dash)
- Jednolična duljina rečenica i identična struktura paragrafa
- Nedostatak osobnog glasa, tona i primjera iz stvarnog života

Pet koraka humanizacije:

Korak 1 — Custom Instructions (System Prompt)
Svaki poziv Qwenu koji radi humanizaciju mora sadržavati system prompt koji 
zabranjuje AI fraze i obrasce.

Korak 2 — Humanizer Agent s referentnim dokumentima
Humanization Agent treba referentni dokument koji opisuje znakove AI pisanja 
i kako ih izbjeći.

Korak 3 — Autorski glas (Voice Profile)
Korisnik uploada 2-3 uzorka svog pisanja pri onboardingu. Humanization Agent 
prima uzorke u kontekstu.

Korak 4 — Personalizacija: publika i primjeri iz života
A) Ciljana publika — Worker dobiva uputu za koga piše
B) Osobne priče — korisnik unosi bilješke u UI

Korak 5 — Varijacija duljine rečenica (finalna provjera)
Prepoznati sekvence rečenica slične duljine i razbiti ih. Kratke rečenice 
za udarce. Dulje za objašnjavanje.

Arhitektura u pipelinu:
Worker (Sonnet) → Critique Agent (Qwen) → Humanization Agent (Qwen) → Output

Mjere uspjeha:
- AI detector score < 10% na finalnom outputu
- Subjektivna provjera: čita li se prirodno naglas?

Napomene:
- Qwen serveri se pale po potrebi
- Ako Qwen nije dostupan, Humanization se preskače (ne blokira pipeline)
- Voice samples korisnika su lokalni, ne idu u cloud
