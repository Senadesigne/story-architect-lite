🛠️ Vercel Debugging - Master Plan
🚩 Trenutni Status
Problem: 504 Gateway Timeout na Vercelu (Node.js 22).

Zadnja greška: TypeError: this.raw.headers.get is not a function (uzrokovano Undici?)

Cilj: UKLONJEN UNDICI. Testiramo stabilnost bez njega. Vraćamo 'TEST_OK' na /api/projects.

📋 Aktivni Plan: Dijagnostički Mod (Checkpointing)
Implementirati console.log poruke sa vremenskom oznakom na sljedećim mjestima:

CP 1: Start servera (server.ts). ✅
CP 2: Provjera okolišnih varijabli (USE_NEON_HTTP). ✅
CP 3: Inicijalizacija Firebase Admina. ✅
CP 4: Firebase status (Success/Fail). ✅
CP 5: Početak baze podataka (db.ts). ✅
CP 6: Odabir drivera (Neon-HTTP vs Postgres). ✅

🤖 Upute za AI (Antigravity)
Pravilo 1: Prije svakog novog zadatka, pročitaj ovu datoteku.

Pravilo 2: Kada unesemo promjenu, ažuriraj sekciju 'Trenutni Status' u ovoj datoteci.

Pravilo 3: Ne briši Checkpointe dok ne potvrdimo da ruta radi.
