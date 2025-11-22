# Detaljan Tehnički Plan za Deployment Story Architect Lite (Beta Testing)

## Status Deploymenta

- [ ] **Faza 1: Priprema Koda i Git (Branching)**
- [ ] **Faza 2: Baza Podataka (Neon Setup & Migracija)**
- [ ] **Faza 3: Backend Deployment (Render)**
- [ ] **Faza 4: Frontend Deployment (Vercel)**
- [ ] **Faza 5: Finalno Povezivanje i Testiranje**

---

## 1. Pregled Trenutne Arhitekture

**Lokalna konfiguracija:**
- **Frontend**: React + Vite (port 5173)
- **Backend**: Node.js + Hono (port 8787)
- **Baza**: PostgreSQL u Docker kontejneru (port 5432)
- **Auth**: Firebase Auth Emulator (port 9099)
- **AI**: Anthropic API integrirani u backend

## 2. Preporučeni Servisi za Hosting

### **Frontend - Vercel**
- **Zašto**: Besplatan tier, automatski deployment iz GitHub-a, odlična podrška za React/Vite
- **Alternativa**: Netlify (također besplatan, slične mogućnosti)

### **Backend - Render.com**
- **Zašto**: Besplatan tier za Node.js, automatski deployment, podrška za environment varijable
- **Alternativa**: Railway.app (fleksibilniji ali s ograničenjem na $5 kredita mjesečno)

### **Baza podataka - Neon.tech**
- **Zašto**: Besplatan tier do 3GB, serverless Postgres, odlična integracija s Drizzle ORM
- **Alternativa**: Supabase (također besplatan Postgres, dodatne značajke)

### **Autentifikacija - Firebase (Production)**
- Koristi postojeći `story-architect-lite-dev` projekt ali ga pripremi za produkciju

## 3. Git Strategija

```
main (produkcija)
  ├── develop (aktivni razvoj)
  └── feature/* (nove značajke)
```

**Koraci:**
1. Kreiraj `develop` branch: `git checkout -b develop`
2. Postavi `main` branch samo za produkciju
3. Koristi Pull Request workflow za merge iz `develop` u `main`
4. Automatski deployment samo s `main` brancha

## 4. Migracija Baze Podataka

### **4.1 Kreiranje Neon Baze**
1. Registriraj se na neon.tech
2. Kreiraj novi projekt
3. Odaberi region (EU preporučeno)
4. Kopiraj connection string

### **4.2 Prebacivanje Sheme**
```bash
# 1. Eksportiraj lokalnu shemu
cd server
pnpm run db:generate

# 2. Ažuriraj .env s Neon URL-om
DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"

# 3. Pokreni migracije na Neon
pnpm run db:push

# 4. Validiraj shemu
pnpm run db:validate
```

### **4.3 Prebacivanje Podataka (ako potrebno)**
```bash
# Eksport iz lokalne baze
pg_dump -h localhost -p 5432 -U postgres story_architect_lite_db > backup.sql

# Import u Neon (koristi Neon SQL editor ili psql)
```

## 5. Firebase Autentifikacija - Produkcijska Konfiguracija

### **5.1 Firebase Konzola**
1. Idi na Firebase Console
2. Odaberi `story-architect-lite-dev` projekt
3. **Authentication → Settings → Authorized domains**:
   - Dodaj: `yourdomain.vercel.app`
   - Dodaj: `yourdomain.render.com`

### **5.2 Promjene u Kodu**

**ui/src/lib/firebase.ts** - Ukloni emulator logiku:
```typescript
// Promijeni liniju 41-42:
const useEmulator = false; // Forsiraj produkciju

// Ili bolje - koristi environment varijablu
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
```

## 6. Environment Varijable

### **6.1 Backend (Render.com)**
```env
# Baza podataka
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require

# Firebase Admin SDK
FIREBASE_PROJECT_ID=story-architect-lite-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@story-architect-lite-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# Server
NODE_ENV=production
PORT=8787
```

### **6.2 Frontend (Vercel)**
```env
# API
VITE_API_URL=https://your-backend.onrender.com

# Firebase
VITE_USE_FIREBASE_EMULATOR=false
```

## 7. Build Process

### **7.1 Backend Build Script**
Dodaj u `server/package.json`:
```json
{
  "scripts": {
    "build": "tsc --noEmit && echo 'Build completed'",
    "start": "tsx src/server.ts"
  }
}
```

### **7.2 Frontend Build**
Već postoji: `pnpm run build`

## 8. Koraci Deployment-a (Detaljan Vodič)

### **Faza 1: Priprema Koda**
1. **Commit sve lokalne promjene**
   ```bash
   git add .
   git commit -m "Priprema za produkciju"
   ```

2. **Kreiraj develop branch**
   ```bash
   git checkout -b develop
   git push origin develop
   ```

3. **Kreiraj .env.example datoteke**
   - `server/.env.example` (s praznim vrijednostima)
   - Dodaj u `.gitignore` ako već nije

### **Faza 2: Setup Baze Podataka**
1. **Registracija na Neon.tech**
2. **Kreiranje projekta i kopiranje connection stringa**
3. **Lokalno testiranje Neon konekcije**
   ```bash
   cd server
   # Privremeno postavi DATABASE_URL
   export DATABASE_URL="neon-url-here"
   pnpm run db:test
   ```

4. **Migracija sheme**
   ```bash
   pnpm run db:push
   ```

### **Faza 3: Firebase Produkcija**
1. **Firebase Console → Authentication → Settings**
2. **Dodaj domene za autorizaciju**
3. **Generiraj Service Account ključ**:
   - Project Settings → Service Accounts
   - Generate New Private Key
   - Spremi JSON datoteku (PAŽLJIVO - tajni podatak!)

### **Faza 4: Backend Deployment (Render)**
1. **Kreiraj Render račun**
2. **New → Web Service**
3. **Connect GitHub repo**
4. **Konfiguracija**:
   - Name: `story-architect-backend`
   - Environment: `Node`
   - Build Command: `cd server && pnpm install`
   - Start Command: `cd server && pnpm start`
   - Branch: `main`

5. **Environment Variables** (dodaj sve iz 6.1)

### **Faza 5: Frontend Deployment (Vercel)**
1. **Kreiraj Vercel račun**
2. **Import Git Repository**
3. **Konfiguracija**:
   - Framework Preset: `Vite`
   - Root Directory: `ui`
   - Build Command: `pnpm install && pnpm build`
   - Output Directory: `dist`

4. **Environment Variables** (dodaj sve iz 6.2)

### **Faza 6: Testiranje**
1. **Provjeri backend health**: `https://your-backend.onrender.com/health`
2. **Otvori frontend**: `https://your-app.vercel.app`
3. **Testiraj login/logout**
4. **Testiraj osnovnu funkcionalnost**

## 9. Održavanje Razvoja i Produkcije

### **Razvoj Workflow**
```bash
# Rad na novoj značajki
git checkout develop
git pull origin develop
git checkout -b feature/nova-znacajka

# Commit i push
git add .
git commit -m "feat: nova značajka"
git push origin feature/nova-znacajka

# Merge u develop (via GitHub PR)
```

### **Produkcijski Release**
```bash
# Kada je develop spreman
git checkout main
git merge develop
git push origin main
# Automatski deployment!
```

## 10. Sigurnosne Napomene

1. **Nikad ne commit-aj .env datoteke**
2. **Firebase service account ključ drži samo u Render env vars**
3. **Koristi CORS whitelist na backend-u za frontend domenu**
4. **Redovito backup-iraj Neon bazu**

## 11. Monitoring i Logovi

- **Frontend**: Vercel Dashboard → Functions → Logs
- **Backend**: Render Dashboard → Logs
- **Baza**: Neon Dashboard → Monitoring
- **Firebase**: Firebase Console → Analytics

## 12. Beta Tester Instrukcije

Pripremi dokument za beta testera:
- URL aplikacije
- Test kredencijali (ako potrebno)
- Poznati problemi/ograničenja
- Način prijavljivanja bugova

---

**Napomena**: Ovaj plan osigurava potpunu separaciju između produkcije i razvoja, omogućava kontinuirani razvoj bez ometanja korisnika, i koristi besplatne/jeftine servise pogodne za beta testiranje.

